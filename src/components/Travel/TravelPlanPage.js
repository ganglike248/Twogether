// src/components/Travel/TravelPlanPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTrips } from '../../hooks/useTrip';
import { createTrip, updateTrip, deleteTrip } from '../../services/tripService';
import { useAuthContext } from '../../contexts/AuthContext';
import TripModal from './TripModal';
import TripCard from './TripCard';
import TripDetail from './TripDetail';
import './TravelPlanPage.css';

const TravelPlanPage = () => {
    const [filteredTrips, setFilteredTrips] = useState([]);
    const [showTripModal, setShowTripModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [editingTrip, setEditingTrip] = useState(null); // 모달에 전달할 편집 대상
    const [filter, setFilter] = useState('all'); // 'all', 'planning', 'completed'
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [tripToDelete, setTripToDelete] = useState(null);

    const navigate = useNavigate();
    const { tripId } = useParams();
    const { user, coupleId } = useAuthContext();
    const { trips, loading } = useTrips(coupleId);

    // 특정 여행 상세 보기
    useEffect(() => {
        if (tripId && trips.length > 0) {
            const trip = trips.find(t => t.id === tripId);
            if (trip) {
                setSelectedTrip(trip);
            }
        } else {
            setSelectedTrip(null);
        }
    }, [tripId, trips]);

    // 필터링 및 검색
    useEffect(() => {
        let filtered = trips;

        // 상태별 필터링
        if (filter !== 'all') {
            filtered = filtered.filter(trip => {
                if (filter === 'planning') {
                    return trip.status === 'planning' || trip.status === 'confirmed';
                }
                if (filter === 'completed') {
                    return trip.status === 'completed';
                }
                return true;
            });
        }

        // 검색어 필터링
        if (searchQuery.trim()) {
            filtered = filtered.filter(trip =>
                trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredTrips(filtered);
    }, [trips, filter, searchQuery]);

    // 여행 저장
    const handleSaveTrip = async (tripData) => {
        try {
            if (tripData.id) {
                await updateTrip(tripData.id, tripData, user?.uid, coupleId);
            } else {
                await createTrip(tripData, user?.uid, coupleId);
            }
            setShowTripModal(false);
        } catch (error) {
            console.error('Error saving trip:', error);
            toast.error(`여행 저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
        }
    };

    // 여행 삭제 요청
    const handleDeleteTrip = async (tripId) => {
        setTripToDelete(tripId);
        setShowDeleteModal(true);
    };

    // 여행 삭제 확인
    const confirmDeleteTrip = async () => {
        if (!tripToDelete) return;
        try {
            await deleteTrip(tripToDelete, user?.uid, coupleId);
            if (selectedTrip?.id === tripToDelete) {
                navigate('/travel');
            }
            setShowDeleteModal(false);
            setTripToDelete(null);
        } catch (error) {
            console.error('Error deleting trip:', error);
            toast.error(`여행 삭제 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
        }
    };

    // 여행 상세 보기
    const handleViewTrip = (trip) => {
        navigate(`/travel/${trip.id}`);
    };

    // 여행 편집
    const handleEditTrip = (trip) => {
        setEditingTrip(trip); // selectedTrip과 분리하여 useEffect 덮어쓰기 방지
        setShowTripModal(true);
        if (tripId) {
            navigate('/travel');
        }
    };

    if (selectedTrip && tripId) {
        return (
            <TripDetail
                trip={selectedTrip}
                onBack={() => navigate('/travel')}
                onEdit={() => handleEditTrip(selectedTrip)}
                onDelete={() => handleDeleteTrip(selectedTrip.id)}
            />
        );
    }

    return (
        <div className="travel-plan-container">
            <div className="travel-plan-header">
                <h1 className="travel-plan-title">여행</h1>
                <p className="travel-plan-subtitle">함께 만들어가는 여행 추억</p>
            </div>

            <div className="travel-plan-toolbar">
                <div className="travel-plan-filter-search-section">
                    <div className="travel-plan-filter-container">
                        <button
                            onClick={() => setFilter('all')}
                            className={`travel-plan-filter-button ${filter === 'all' ? 'travel-plan-active' : ''}`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('planning')}
                            className={`travel-plan-filter-button ${filter === 'planning' ? 'travel-plan-active' : ''}`}
                        >
                            계획중
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`travel-plan-filter-button ${filter === 'completed' ? 'travel-plan-active' : ''}`}
                        >
                            완료
                        </button>
                    </div>

                    <div className="travel-plan-search-container">
                        <input
                            type="text"
                            placeholder="여행지나 제목을 검색하세요"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="travel-plan-search-input"
                        />
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingTrip(null);
                        setShowTripModal(true);
                    }}
                    className="travel-plan-add-trip-btn"
                >
                    <span className="travel-plan-add-icon">+</span>
                    새 여행 추가
                </button>
            </div>

            {loading ? (
                <div className="travel-plan-loading-container">
                    <div className="travel-plan-loading-spinner"></div>
                    <p className="travel-plan-loading-text">여행 계획을 불러오는 중...</p>
                </div>
            ) : filteredTrips.length === 0 ? (
                <div className="travel-plan-empty-state">
                    <div className="travel-plan-empty-icon">✈️</div>
                    <h2 className="travel-plan-empty-title">
                        {searchQuery || filter !== 'all'
                            ? '검색 결과가 없습니다'
                            : '아직 여행 계획이 없습니다'}
                    </h2>
                    <p className="travel-plan-empty-text">
                        {searchQuery || filter !== 'all'
                            ? '다른 검색어나 필터를 시도해보세요'
                            : '새로운 여행을 계획해보세요!'}
                    </p>
                    {!searchQuery && filter === 'all' && (
                        <button
                            onClick={() => { setEditingTrip(null); setShowTripModal(true); }}
                            className="travel-plan-empty-button"
                        >
                            첫 여행 계획 만들기
                        </button>
                    )}
                </div>
            ) : (
                <div className="travel-plan-trips-grid">
                    {filteredTrips.map(trip => (
                        <TripCard
                            key={trip.id}
                            trip={trip}
                            onView={handleViewTrip}
                            onEdit={handleEditTrip}
                            onDelete={handleDeleteTrip}
                        />
                    ))}
                </div>
            )}

            {showTripModal && (
                <TripModal
                    isOpen={showTripModal}
                    onClose={() => {
                        setShowTripModal(false);
                        setEditingTrip(null);
                    }}
                    trip={editingTrip}
                    onSave={handleSaveTrip}
                />
            )}

            {/* 여행 삭제 확인 모달 */}
            {showDeleteModal && (
                <div className="travel-plan-modal-overlay">
                    <div className="travel-plan-modal-box">
                        <p className="travel-plan-modal-title">여행 삭제</p>
                        <p className="travel-plan-modal-msg">이 여행 계획을 삭제하시겠습니까?</p>
                        <div className="travel-plan-modal-actions">
                            <button
                                className="travel-plan-modal-btn"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                취소
                            </button>
                            <button
                                className="travel-plan-modal-btn delete"
                                onClick={confirmDeleteTrip}
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TravelPlanPage;
