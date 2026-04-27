// src/components/Travel/TripModal.js
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import './TripModal.css';
import { addCommas, formatInputNumber, removeCommas } from '../../utils/numberFormat';

const TripModal = ({ isOpen, onClose, trip, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        description: '',
        status: 'planning'
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (trip) {
            const formatDateForInput = (date) => {
                if (!date) return '';
                try {
                    if (date.toDate) {
                        return format(date.toDate(), 'yyyy-MM-dd');
                    }
                    return format(new Date(date), 'yyyy-MM-dd');
                } catch (error) {
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
                status: trip.status || 'planning'
            });
        } else {
            setFormData({
                title: '',
                destination: '',
                startDate: '',
                endDate: '',
                budget: '',
                description: '',
                status: 'planning'
            });
        }
        setErrors({});
    }, [trip]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = '여행 제목을 입력해주세요';
        }
        if (!formData.destination.trim()) {
            newErrors.destination = '여행지를 입력해주세요';
        }
        if (!formData.startDate) {
            newErrors.startDate = '시작일을 선택해주세요';
        }
        if (!formData.endDate) {
            newErrors.endDate = '종료일을 선택해주세요';
        }
        if (formData.startDate && formData.endDate &&
            new Date(formData.startDate) > new Date(formData.endDate)) {
            newErrors.endDate = '종료일은 시작일보다 늦어야 합니다';
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

        setLoading(true);
        try {
            const tripData = {
                ...formData,
                budget: formData.budget ? parseInt(removeCommas(formData.budget)) : 0,
                startDate: formData.startDate,
                endDate: formData.endDate
            };

            if (trip?.id) {
                tripData.id = trip.id;
            }

            await onSave(tripData);
        } catch (error) {
            console.error('Error saving trip:', error);
            toast.error(`여행 저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
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
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="trip-modal-overlay">
            <div className="trip-modal-container">
                <div className="trip-modal-header">
                    <h2 className="trip-modal-title">
                        {trip ? '여행 계획 수정' : '새 여행 계획'}
                    </h2>
                    <button className="trip-modal-close" onClick={onClose}>&times;</button>
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
                                여행지 <span className="trip-modal-required">*</span>
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
                                value={formData.budget}
                                onChange={(e) => handleChange('budget', e.target.value)}
                                placeholder="0"
                                min="0"
                                className={errors.budget ? 'trip-modal-error' : ''}
                            />
                            {errors.budget && <span className="trip-modal-error-text">{errors.budget}</span>}
                        </div>

                        <div className="trip-modal-form-group">
                            <label className="trip-modal-form-label" htmlFor="trip-status">
                                여행 상태
                            </label>
                            <select
                                id="trip-status"
                                value={formData.status || 'planning'}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="trip-modal-form-select"
                            >
                                <option value="planning">계획중</option>
                                <option value="confirmed">확정됨</option>
                                <option value="ongoing">진행중</option>
                                <option value="completed">완료</option>
                            </select>
                        </div>

                        <div className="trip-modal-form-group">
                            <label className="trip-modal-form-label" htmlFor="trip-description">
                                설명
                            </label>
                            <textarea
                                id="trip-description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="여행에 대한 간단한 설명을 입력하세요"
                                rows="4"
                            />
                        </div>
                    </div>

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
                </form>
            </div>
        </div>
    );
};

export default TripModal;
