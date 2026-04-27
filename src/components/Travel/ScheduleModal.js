// src/components/Travel/ScheduleModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './ScheduleModal.css';
import { addCommas, formatInputNumber, removeCommas } from '../../utils/numberFormat';

const ScheduleModal = ({ isOpen, onClose, schedule, onSave }) => {
    const [formData, setFormData] = useState({
        time: '',
        endTime: '',
        title: '',
        description: '',
        location: '',
        cost: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (schedule) {
            setFormData({
                time: schedule.time || '',
                endTime: schedule.endTime || '',
                title: schedule.title || '',
                description: schedule.description || '',
                location: schedule.location || '',
                cost: schedule.cost ? addCommas(schedule.cost) : '',
            });
        } else {
            setFormData({
                time: '',
                endTime: '',
                title: '',
                description: '',
                location: '',
                cost: '',
            });
        }
        setErrors({});
    }, [schedule]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = '일정 제목을 입력해주세요';
        }

        if (formData.time && formData.endTime && formData.time >= formData.endTime) {
            newErrors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다';
        }

        if (formData.cost && (isNaN(removeCommas(formData.cost)) || removeCommas(formData.cost) < 0)) {
            newErrors.cost = '올바른 비용을 입력해주세요';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        try {
            const scheduleData = {
                ...formData,
                cost: formData.cost ? parseInt(removeCommas(formData.cost)) : 0,
                completed: schedule?.completed || false
            };

            if (schedule?.id) {
                scheduleData.id = schedule.id;
            }

            await onSave(scheduleData);
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('일정 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        let processedValue = value;

        // 비용 필드의 경우 콤마 처리
        if (field === 'cost') {
            processedValue = formatInputNumber(value);
        }

        setFormData(prev => ({ ...prev, [field]: processedValue }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="schedule-modal-overlay">
            <div className="schedule-modal-container">
                <div className="schedule-modal-header">
                    <h2 className="schedule-modal-title">
                        {schedule ? '일정 수정' : '새 일정 추가'}
                    </h2>
                    <button className="schedule-modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="schedule-modal-body">
                        <div className="schedule-modal-form-row">
                            <div className="schedule-modal-form-group">
                                <label className="schedule-modal-form-label" htmlFor="schedule-time">
                                    시작 시간
                                </label>
                                <input
                                    id="schedule-time"
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => handleChange('time', e.target.value)}
                                />
                            </div>

                            <div className="schedule-modal-form-group">
                                <label className="schedule-modal-form-label" htmlFor="schedule-end-time">
                                    종료 시간
                                </label>
                                <input
                                    id="schedule-end-time"
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => handleChange('endTime', e.target.value)}
                                    className={errors.endTime ? 'schedule-modal-error' : ''}
                                />
                                {errors.endTime && <span className="schedule-modal-error-text">{errors.endTime}</span>}
                            </div>
                        </div>

                        <div className="schedule-modal-form-group">
                            <label className="schedule-modal-form-label" htmlFor="schedule-title">
                                일정 제목 <span className="schedule-modal-required">*</span>
                            </label>
                            <input
                                id="schedule-title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="예: 성산일출봉 관람"
                                className={errors.title ? 'schedule-modal-error' : ''}
                            />
                            {errors.title && <span className="schedule-modal-error-text">{errors.title}</span>}
                        </div>

                        <div className="schedule-modal-form-group">
                            <label className="schedule-modal-form-label" htmlFor="schedule-description">
                                설명
                            </label>
                            <textarea
                                id="schedule-description"
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="일정에 대한 상세 설명을 입력하세요"
                                rows="3"
                            />
                        </div>

                        <div className="schedule-modal-form-group">
                            <label className="schedule-modal-form-label" htmlFor="schedule-location">
                                위치
                            </label>
                            <input
                                id="schedule-location"
                                type="text"
                                value={formData.location}
                                onChange={(e) => handleChange('location', e.target.value)}
                                placeholder="예: 서귀포시 성산읍"
                            />
                        </div>

                        <div className="schedule-modal-form-row">
                            <div className="schedule-modal-form-group">
                                <label className="schedule-modal-form-label" htmlFor="schedule-cost">
                                    비용 (원)
                                </label>
                                <input
                                    id="schedule-cost"
                                    type="text"
                                    value={formData.cost}
                                    onChange={(e) => handleChange('cost', e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    className={errors.cost ? 'schedule-modal-error' : ''}
                                />
                                {errors.cost && <span className="schedule-modal-error-text">{errors.cost}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="schedule-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="schedule-modal-btn schedule-modal-btn-secondary"
                            disabled={loading}
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="schedule-modal-btn schedule-modal-btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="schedule-modal-loading-indicator"></span>
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

export default ScheduleModal;
