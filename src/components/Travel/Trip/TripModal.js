// src/components/Travel/TripModal.js
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import './TripModal.css';
import { addCommas, formatInputNumber, removeCommas } from '../../../utils/numberFormat';
import { convertToDate } from '../../../utils/dataUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorMessages';
import AutoGrowTextarea from '../../common/AutoGrowTextarea';
import RegionPicker from './RegionPicker';
import { matchRegions, suggestRegionsFromSchedules } from '../../../services/regions/regionMatch';
import { useTripSchedules } from '../../../hooks/useTrip';
import { describeRegions } from '../../../services/regions/regionData';
import { useDialog } from '../../../hooks/useDialog';
import { getTripDayCount, getOverflowSchedules } from '../../../services/tripPhase';

const TripModal = ({ isOpen, onClose, trip, onSave }) => {
  const dialogRef = useDialog(isOpen, onClose);
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    // 우리 지도에 칠해질 지역 — 여행지 글자로 자동 추천, 사용자가 칩을 한 번이라도 만지면 더는 자동으로 안 바꿈
    const [regions, setRegions] = useState([]);
    const [regionsTouched, setRegionsTouched] = useState(false);
    const [regionHint, setRegionHint] = useState('');
    const [errors, setErrors] = useState({});
    // 기간을 줄여 잘리는 일정이 있으면 저장 전에 물어봄 — { days: [..], count, newDays }
    const [overflowAsk, setOverflowAsk] = useState(null);
    // 기존 여행이면 일정 장소에서 찾은 지역을 추천 칩으로(새 여행은 일정이 없어 tripId 없음)
    const { schedules: tripScheduleDocs } = useTripSchedules(isOpen ? trip?.id : null);

    useEffect(() => {
        if (trip) {
            const formatDateForInput = (dateField) => {
                if (!dateField) return '';
                try {
                    const date = convertToDate(dateField);
                    return date ? format(date, 'yyyy-MM-dd') : '';
                } catch {
                    return '';
                }
            };

            setFormData({
                title: trip.title || '',
                destination: trip.destination || '',
                startDate: formatDateForInput(trip.startDate),
                endDate: formatDateForInput(trip.endDate),
                budget: trip.budget ? addCommas(trip.budget) : '',
                description: trip.description || '',
            });
        } else {
            setFormData({
                title: '',
                destination: '',
                startDate: '',
                endDate: '',
                budget: '',
                description: '',
            });
        }
        // 기존 여행은 저장된 지역 그대로(없으면 여행지로 한 번 추천), 지도에서 넘어온 새 여행은 미리 채운 지역
        const initial = trip?.regions || [];
        const suggested = !initial.length && trip?.destination ? matchRegions(trip.destination) : [];
        setRegions(initial.length ? initial : suggested);
        setRegionsTouched(initial.length > 0);
        setRegionHint(suggested.length ? `여행지에서 ${describeRegions(suggested)}을 찾았어요. 맞나요?` : '');
        setErrors({});
    }, [trip]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = '여행 제목을 입력해주세요';
        }
        // 여행지 글자와 지역 중 하나는 꼭 — 지역만 고르면 여행지 이름은 지역으로 대신 보여줌(tripPlaceName)
        if (!formData.destination.trim() && regions.length === 0) {
            newErrors.destination = '여행지를 쓰거나 아래에서 지역을 골라 주세요';
        }
        if (!formData.startDate) {
            newErrors.startDate = '시작일을 선택해주세요';
        }
        if (!formData.endDate) {
            newErrors.endDate = '종료일을 선택해주세요';
        }
        if (formData.startDate && formData.endDate &&
            new Date(formData.startDate) > new Date(formData.endDate)) {
            newErrors.endDate = '종료일은 시작일보다 늦어야 해요';
        }
        if (formData.budget && (isNaN(removeCommas(formData.budget)) || removeCommas(formData.budget) < 0)) {
            newErrors.budget = '올바른 예산을 입력해주세요';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        // 기존 여행의 기간을 줄였는데 잘리는 Day에 일정이 있으면 먼저 물어봄(옮기기/지우기/취소)
        if (trip?.id) {
            const newDays = getTripDayCount(formData.startDate, formData.endDate);
            const overflow = getOverflowSchedules(tripScheduleDocs, newDays);
            if (overflow.count > 0) { setOverflowAsk({ ...overflow, newDays }); return; }
        }
        await save();
    };

    const save = async (overflowMode) => {
        setOverflowAsk(null);
        setLoading(true);
        try {
            const tripData = {
                ...formData,
                budget: formData.budget ? parseInt(removeCommas(formData.budget)) : 0,
                startDate: formData.startDate,
                endDate: formData.endDate,
                regions,
            };

            if (trip?.id) {
                tripData.id = trip.id;
            }

            await onSave(tripData, overflowMode ? { overflowMode } : undefined);
        } catch (error) {
            console.error('Error saving trip:', error);
            toast.error(`여행 저장 중 오류가 발생했어요.\n${getFriendlyErrorMessage(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        let processedValue = value;

        if (field === 'budget') {
            processedValue = formatInputNumber(value);
        }

        setFormData(prev => ({ ...prev, [field]: processedValue }));
        if (field === 'startDate' || field === 'endDate') setOverflowAsk(null);
        if (field === 'destination' && !regionsTouched) {
            const found = matchRegions(processedValue);
            setRegions(found);
            setRegionHint(found.length ? `여행지에서 ${describeRegions(found)}을 찾았어요. 맞나요?` : '');
        }
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (!isOpen) return null;

    return (
        // 바깥을 눌러도 닫지 않음 — 입력하던 내용이 실수로 사라지지 않게(일정 모달과 같게). 닫기는 ×·취소·Esc·뒤로가기
        <div className="trip-modal-overlay">
            <div className="trip-modal-container" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true">
                <div className="trip-modal-header">
                    <h2 className="trip-modal-title">
                        {trip?.id ? '여행 계획 수정' : '새 여행 계획'}
                    </h2>
                    <button type="button" className="trip-modal-close" onClick={onClose} aria-label="닫기">&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="trip-modal-body">
                        <div className="trip-modal-form-group">
                            <label className="trip-modal-form-label" htmlFor="trip-title">
                                여행 제목 <span className="trip-modal-required">*</span>
                            </label>
                            <input
                                id="trip-title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="예: 제주도 힐링 여행"
                                className={errors.title ? 'trip-modal-error' : ''}
                            />
                            {errors.title && <span className="trip-modal-error-text">{errors.title}</span>}
                        </div>

                        <div className="trip-modal-form-group">
                            <label className="trip-modal-form-label" htmlFor="trip-destination">
                                여행지 <span className="trip-modal-optional">지역을 고르면 비워도 돼요</span>
                            </label>
                            <input
                                id="trip-destination"
                                type="text"
                                value={formData.destination}
                                onChange={(e) => handleChange('destination', e.target.value)}
                                placeholder="예: 제주도"
                                className={errors.destination ? 'trip-modal-error' : ''}
                            />
                            {errors.destination && <span className="trip-modal-error-text">{errors.destination}</span>}
                        </div>

                        <div className="trip-modal-form-group">
                            <span className="trip-modal-form-label">
                                지역 <span className="trip-modal-optional">우리 지도에 칠해져요</span>
                            </span>
                            <RegionPicker
                                value={regions}
                                hint={regionHint}
                                suggestions={suggestRegionsFromSchedules(tripScheduleDocs, regions)}
                                onChange={(next) => {
                                    setRegions(next); setRegionsTouched(true); setRegionHint('');
                                    if (next.length && errors.destination) setErrors(prev => ({ ...prev, destination: '' }));
                                }}
                            />
                        </div>

                        <div className="trip-modal-form-row">
                            <div className="trip-modal-form-group">
                                <label className="trip-modal-form-label" htmlFor="trip-start-date">
                                    시작일 <span className="trip-modal-required">*</span>
                                </label>
                                <input
                                    id="trip-start-date"
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => handleChange('startDate', e.target.value)}
                                    className={errors.startDate ? 'trip-modal-error' : ''}
                                />
                                {errors.startDate && <span className="trip-modal-error-text">{errors.startDate}</span>}
                            </div>

                            <div className="trip-modal-form-group">
                                <label className="trip-modal-form-label" htmlFor="trip-end-date">
                                    종료일 <span className="trip-modal-required">*</span>
                                </label>
                                <input
                                    id="trip-end-date"
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => handleChange('endDate', e.target.value)}
                                    min={formData.startDate}
                                    className={errors.endDate ? 'trip-modal-error' : ''}
                                />
                                {errors.endDate && <span className="trip-modal-error-text">{errors.endDate}</span>}
                            </div>
                        </div>

                        <div className="trip-modal-form-group">
                            <label className="trip-modal-form-label" htmlFor="trip-budget">
                                예산 (원)
                            </label>
                            <input
                                id="trip-budget"
                                type="text"
                                inputMode="numeric"
                                value={formData.budget}
                                onChange={(e) => handleChange('budget', e.target.value)}
                                placeholder="0"
                                className={errors.budget ? 'trip-modal-error' : ''}
                            />
                            {errors.budget && <span className="trip-modal-error-text">{errors.budget}</span>}
                        </div>

                        <div className="trip-modal-form-group">
                            <label className="trip-modal-form-label" htmlFor="trip-description">
                                설명
                            </label>
                            <AutoGrowTextarea
                                id="trip-description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="어떤 여행인지 간단히 적어요"
                                rows="4"
                            />
                        </div>
                    </div>

                    {overflowAsk ? (
                        <div className="trip-modal-overflow" role="alertdialog" aria-label="잘리는 일정">
                            <p className="trip-modal-overflow-text">
                                기간을 줄이면 <b>Day {overflowAsk.days.join('·')}</b>의 일정 <b>{overflowAsk.count}개</b>가 기간 밖으로 나가요. 어떻게 할까요?
                            </p>
                            <div className="trip-modal-overflow-btns">
                                <button type="button" className="trip-modal-btn trip-modal-btn-secondary" onClick={() => setOverflowAsk(null)}>취소</button>
                                <button type="button" className="trip-modal-btn trip-modal-btn-danger" onClick={() => save('delete')}>지우기</button>
                                <button type="button" className="trip-modal-btn trip-modal-btn-primary" onClick={() => save('move')}>Day {overflowAsk.newDays}로 옮기기</button>
                            </div>
                        </div>
                    ) : (
                    <div className="trip-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="trip-modal-btn trip-modal-btn-secondary"
                            disabled={loading}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="trip-modal-btn trip-modal-btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="trip-modal-loading-indicator"></span>
                                    저장 중...
                                </>
                            ) : '저장'}
                        </button>
                    </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default TripModal;
