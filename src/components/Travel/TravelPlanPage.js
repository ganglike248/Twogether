// src/components/Travel/TravelPlanPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryModal } from '../../hooks/useQueryModal';
import { toast } from 'react-toastify';
import { useTrips } from '../../hooks/useTrip';
import { createTrip, updateTrip, deleteTrip, trimTripSchedules } from '../../services/tripService';
import { getTripDayCount } from '../../services/tripPhase';
import { useAuthContext } from '../../contexts/AuthContext';
import TripModal from './Trip/TripModal';
import TripList from './Trip/TripList';
import TripDetail from './Trip/TripDetail';
import EmptyState from '../common/EmptyState';
import ConfirmModal from '../common/ConfirmModal';
import MapEntryCard from '../Map/MapEntryCard';
import { getPendingReviewTrips } from '../../services/tripReviewService';
import { tripPlaceName } from '../../services/regions/regionData';
import { TravelPlanSkeleton } from './Trip/TravelCardSkeleton';
import { MdFlightTakeoff } from 'react-icons/md';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './TravelPlanPage.css';

const TravelPlanPage = () => {
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [editingTrip, setEditingTrip] = useState(null); // 모달에 전달할 편집 대상
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tripToDelete, setTripToDelete] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { tripId } = useParams();
    const { user, coupleId } = useAuthContext();
    const { trips, loading } = useTrips(coupleId);

    // 모달 열림은 주소(?modal=)에서 파생 — 여닫기는 useQueryModal(여행 상세의 탭 위치 ?tab= 유지, 첫 진입이면 replace)
    const { modal: modalType, open: openModal, close: closeModal } = useQueryModal();
    const showTripModal = modalType === 'trip';
    const showDeleteModal = modalType === 'deleteTrip';

    // 특정 여행 상세 보기
    useEffect(() => {
        if (!tripId) {
            setSelectedTrip(null);
            return;
        }
        const trip = trips.find(t => t.id === tripId);
        if (trip) { setSelectedTrip(trip); return; }
        if (!loading) navigate('/travel', { replace: true }); // 로드 후에도 없으면 목록으로
    }, [tripId, trips, loading, navigate]);

    // 검색(제목·여행지) — 구역(여행 중/다가오는/다녀옴)은 TripList가 날짜로 나눔
    useEffect(() => {
        const q = searchQuery.trim().toLowerCase();
        setFilteredTrips(!q ? trips : trips.filter(trip =>
            trip.title?.toLowerCase().includes(q) || tripPlaceName(trip).toLowerCase().includes(q)));
    }, [trips, searchQuery]);

    // 여행 저장
    // overflowMode: 기간을 줄여 잘리는 Day의 일정을 'move'(마지막 날로) | 'delete' — 모달이 물어본 답(안 물었으면 안전하게 옮김)
    const handleSaveTrip = useCallback(async (tripData, { overflowMode = 'move' } = {}) => {
        try {
            if (tripData.id) {
                // 잘리는 일정 정리를 먼저(실패하면 기간도 안 바뀌어 일정이 숨지 않음)
                await trimTripSchedules(tripData.id, getTripDayCount(tripData.startDate, tripData.endDate), overflowMode);
                await updateTrip(tripData.id, tripData, user?.uid, coupleId);
            } else {
                await createTrip(tripData, user?.uid, coupleId);
            }
            closeModal();
            toast.success(tripData.id ? '여행이 수정됐어요.' : '여행이 추가됐어요.');
        } catch (error) {
            console.error('Error saving trip:', error);
            toast.error(`여행 저장 중 오류가 발생했어요.\n${getFriendlyErrorMessage(error)}`);
        }
    }, [user?.uid, coupleId, closeModal]);

    // 여행 삭제 요청
    const handleDeleteTrip = useCallback(async (tripId) => {
        setTripToDelete(tripId);
        openModal('deleteTrip');
    }, [openModal]);

    // 여행 삭제 확인 — 삭제 성공 후엔 항상 목록(/travel)으로 보냄. 보고 있던 여행을 지운
    // 경우든 목록에서 지운 경우든 결과는 같음(모달 닫힘 + 목록 화면) — closeModal()의
    // navigate(-1) 대신 이렇게 단일 navigate로 통일한 이유: 방금 본 여행을 지운 경우
    // navigate('/travel')와 closeModal()을 연달아 부르면(navigate(-1)의 비동기 처리와
    // 겹쳐) 캘린더 모달에서 겪었던 것과 같은 히스토리 레이스가 날 수 있음.
    const confirmDeleteTrip = useCallback(async () => {
        // 새로고침으로 ?modal=deleteTrip에 바로 들어오면 tripToDelete가 비어 있음 → 상세 화면이면 보고 있는 여행
        const targetId = tripToDelete || tripId;
        if (!targetId || deleting) return;
        setDeleting(true);
        try {
            await deleteTrip(targetId, user?.uid, coupleId);
            navigate('/travel', { replace: true });
            setTripToDelete(null);
            toast.success('여행을 삭제했어요.');
        } catch (error) {
            console.error('Error deleting trip:', error);
            toast.error(`여행 삭제 중 오류가 발생했어요.\n${getFriendlyErrorMessage(error)}`);
        } finally {
            setDeleting(false);
        }
    }, [tripToDelete, tripId, deleting, user?.uid, coupleId, navigate]);

    // 여행 상세 보기
    const handleViewTrip = useCallback((trip) => {
        navigate(`/travel/${trip.id}`);
    }, [navigate]);

    // 여행 편집
    const handleEditTrip = useCallback((trip) => {
        setEditingTrip(trip); // selectedTrip과 분리하여 useEffect 덮어쓰기 방지
        openModal('trip');
    }, [openModal]);

    // 우리 지도에서 넘어온 경우 — [여기로 여행 계획하기](지역 미리 채운 새 여행) / 지난 여행 지역 고르기(수정 모달 바로 열기)
    const prefillRegions = location.state?.prefillRegions;
    useEffect(() => {
        if (showTripModal && prefillRegions && !editingTrip) setEditingTrip({ regions: prefillRegions });
    }, [showTripModal, prefillRegions, editingTrip]);
    const editFromMap = location.state?.editTrip;
    useEffect(() => {
        if (editFromMap && selectedTrip && !showTripModal) {
            navigate(location.pathname, { replace: true, state: {} });
            handleEditTrip(selectedTrip);
        }
    }, [editFromMap, selectedTrip, showTripModal, navigate, location.pathname, handleEditTrip]);

    const pendingReviews = getPendingReviewTrips(trips, user?.uid);

    if (tripId) {
        if (!selectedTrip) return null; // 여행 데이터 로딩 중 — 목록 플래시 방지
        return (
            <>
                <TripDetail
                    key={selectedTrip.id}
                    trip={selectedTrip}
                    onBack={() => navigate('/travel', { replace: true })}
                    onEdit={() => handleEditTrip(selectedTrip)}
                    onDelete={() => handleDeleteTrip(selectedTrip.id)}
                />
                {showTripModal && (
                    <TripModal
                        isOpen={showTripModal}
                        onClose={() => {
                            closeModal();
                            setEditingTrip(null);
                        }}
                        trip={editingTrip}
                        onSave={handleSaveTrip}
                    />
                )}
                <ConfirmModal
                  isOpen={showDeleteModal}
                  title="여행 삭제"
                  message="이 여행 계획을 삭제할까요? 일정표·후보·체크리스트도 함께 삭제돼요."
                  confirmText={deleting ? '삭제 중…' : '삭제'}
                  confirmDisabled={deleting}
                  onConfirm={confirmDeleteTrip}
                  onCancel={closeModal}
                />
            </>
        );
    }

    return (
        <div className="travel-plan-container">
            <div className="travel-plan-head-row">
                <div className="travel-plan-header">
                    <h1 className="travel-plan-title">여행</h1>
                    <p className="travel-plan-subtitle">함께 만들어가는 여행 추억</p>
                </div>
                <button type="button" className="travel-plan-new-btn" onClick={() => { setEditingTrip(null); openModal('trip'); }}>
                    + 새 여행
                </button>
            </div>

            {/* 기록을 기다리는 여행 개수 — 누르면 가장 최근 것부터 기록 */}
            {pendingReviews.length > 0 && (
                <button
                    type="button"
                    className="travel-plan-review-banner"
                    onClick={() => navigate(`/travel/${pendingReviews[0].id}/review`)}
                >
                    <span className="travel-plan-review-count">{pendingReviews.length}</span>
                    <span className="travel-plan-review-text">
                        <b>기록을 기다리는 여행이 {pendingReviews.length}개 있어요</b>
                        <span>{pendingReviews[0].title}부터 기록하기</span>
                    </span>
                    <span className="travel-plan-review-arrow" aria-hidden="true">›</span>
                </button>
            )}

            {trips.length > 0 && <MapEntryCard trips={trips} className="travel-plan-map-card" showMap />}

            {trips.length > 0 && (
                <div className="travel-plan-search">
                    <input
                        type="search"
                        placeholder="여행지나 제목으로 찾기"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="travel-plan-search-input"
                        aria-label="여행 검색"
                    />
                </div>
            )}

            {loading ? (
                <TravelPlanSkeleton />
            ) : filteredTrips.length === 0 ? (
                <EmptyState
                    icon={<MdFlightTakeoff size={56} />}
                    title={searchQuery ? '검색 결과가 없어요' : '아직 여행 계획이 없어요'}
                    text={searchQuery ? '다른 검색어로 찾아 보세요' : '새로운 여행을 계획해보세요!'}
                    button={!searchQuery ? {
                        text: '첫 여행 계획 만들기',
                        onClick: () => { setEditingTrip(null); openModal('trip'); }
                    } : undefined}
                />
            ) : (
                <TripList trips={filteredTrips} onOpen={handleViewTrip} />
            )}

            {showTripModal && (
                <TripModal
                    isOpen={showTripModal}
                    onClose={() => {
                        closeModal();
                        setEditingTrip(null);
                    }}
                    trip={editingTrip}
                    onSave={handleSaveTrip}
                />
            )}

            {/* 여행 삭제 확인 모달 */}
            <ConfirmModal
              isOpen={showDeleteModal}
              title="여행 삭제"
              message="이 여행 계획을 삭제할까요? 일정표·후보·체크리스트도 함께 삭제돼요."
              confirmText={deleting ? '삭제 중…' : '삭제'}
              confirmDisabled={deleting}
              onConfirm={confirmDeleteTrip}
              onCancel={closeModal}
            />
        </div>
    );
};

export default TravelPlanPage;
