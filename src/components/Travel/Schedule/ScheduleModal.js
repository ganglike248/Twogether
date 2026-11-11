// src/components/Travel/ScheduleModal.js
import React, { useState, useEffect } from 'react';
import { SCHEDULE_CATEGORIES } from './scheduleCategories';
import { toast } from 'react-toastify';
import './ScheduleModal.css';
import { addCommas, formatInputNumber, removeCommas } from '../../../utils/numberFormat';
import AutoGrowTextarea from '../../common/AutoGrowTextarea';
import LinkFillCard from '../Decisions/LinkFillCard';
import useLinkFillCollapsed from '../../../hooks/useLinkFillCollapsed';
import useLinkFill from '../../../hooks/useLinkFill';
import { parseSharedText } from '../../../utils/sharedTextParser';
// LinkFillCard의 스타일(.lfc*, .ofs-field/.ofs-input/.ofs-divider)은 선택 사항 시트 CSS에 있음
import '../Decisions/OptionFormSheet.css';

// 비어 있는 칸만 채움 — 선택 사항 후보 추가와 같은 규칙(이미 적은 내용은 덮어쓰지 않음, 사용자 결정)
const fillEmpty = (prev, values) => {
    const next = { ...prev };
    Object.entries(values).forEach(([field, value]) => {
        if (value && !String(prev[field] || '').trim()) next[field] = value;
    });
    return next;
};
// day: 지금 보고 있는 Day(새 일정의 기본값이자 수정 중인 일정이 원래 있던 날), dayOptions: [{ day, label }] —
// 날짜를 바꿔 저장하면 onSave(data, 바꾼 day)로 넘겨서 TripDetail이 다른 날로 옮김(v1.0.24~)
const ScheduleModal = ({ isOpen, onClose, schedule, onSave, onDelete, day, dayOptions = [] }) => {
    const [formData, setFormData] = useState({
        time: '',
        endTime: '',
        title: '',
        description: '',
        location: '',
        cost: '',
        category: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [targetDay, setTargetDay] = useState(day);
    // 새 일정(schedule === null)에만 "링크로 자동 채우기"(v1.0.24~) — 후보에서 옮겨 온 일정은 이미 채워져 있어 안 띄움
    const isNew = !schedule;
    const linkFill = useLinkFill();
    const [linkCollapsed, toggleLinkCollapsed] = useLinkFillCollapsed();

    useEffect(() => {
        setShowDeleteConfirm(false);
        if (schedule) {
            setFormData({
                time: schedule.time || '',
                endTime: schedule.endTime || '',
                title: schedule.title || '',
                description: schedule.description || '',
                location: schedule.location || '',
                cost: schedule.cost ? addCommas(schedule.cost) : '',
                category: schedule.category || '',
            });
        } else {
            setFormData({
                time: '',
                endTime: '',
                title: '',
                description: '',
                location: '',
                cost: '',
                category: '',
            });
        }
        setErrors({});
        linkFill.reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- 모달 대상이 바뀔 때만 링크 카드 초기화
    }, [schedule]);

    // 링크 정보 → 제목·위치·설명의 빈 칸만 채움(일정엔 사진 칸이 없어 대표 사진은 안 씀)
    const applyPreview = (preview) => {
        const values = { title: preview.title, location: preview.address, description: preview.description };
        const next = fillEmpty(formData, values);
        setFormData(prev => fillEmpty(prev, values));
        return Object.keys(values).some(f => next[f] !== formData[f]);
    };

    // 네이버지도 등 공유 문구를 붙여넣으면 링크/제목/위치로 나눠 넣음
    const handleLinkPaste = (e) => {
        const parsed = parseSharedText(e.clipboardData?.getData('text'));
        if (!parsed) return;
        e.preventDefault();
        linkFill.setUrl(parsed.url || '');
        setFormData(prev => fillEmpty(prev, { title: parsed.title, location: parsed.address }));
    };

    // 모달을 열 때마다 날짜는 지금 보고 있는 Day로 초기화
    useEffect(() => {
        if (isOpen) setTargetDay(day);
    }, [isOpen, day, schedule]);

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
            // 일정엔 링크 칸이 없어서, 후보→일정 옮기기와 같은 방식으로 링크를 설명 끝에 남김(이미 들어 있으면 그대로)
            const description = isNew && linkFill.link && !formData.description.includes(linkFill.link)
                ? [formData.description.trim(), linkFill.link].filter(Boolean).join('\n')
                : formData.description;
            const scheduleData = {
                ...formData,
                description,
                cost: formData.cost ? parseInt(removeCommas(formData.cost)) : 0,
                completed: schedule?.completed || false
            };
            if (schedule?.id) scheduleData.id = schedule.id;
            await onSave(scheduleData, targetDay);
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('일정 저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        onDelete(schedule.id);
        onClose();
    };

    const handleChange = (field, value) => {
        let processedValue = value;
        if (field === 'cost') processedValue = formatInputNumber(value);
        setFormData(prev => ({ ...prev, [field]: processedValue }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
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
                        {isNew && (
                            <>
                                <LinkFillCard
                                    url={linkFill.url}
                                    status={linkFill.status}
                                    changed={linkFill.changed}
                                    fetching={linkFill.fetching}
                                    canFetch={linkFill.canFetch}
                                    onChangeUrl={linkFill.changeUrl}
                                    onPasteUrl={handleLinkPaste}
                                    onFetch={() => linkFill.fetchInto(applyPreview)}
                                    onEdit={linkFill.edit}
                                    description="네이버지도 등 공유 링크로 제목·위치·설명을 채워요"
                                    collapsed={linkCollapsed}
                                    onToggleCollapse={toggleLinkCollapsed}
                                    elapsed={linkFill.elapsed}
                                    onCancel={linkFill.cancel}
                                />
                                {linkFill.status !== 'filled' && !linkCollapsed && (
                                    <div className="ofs-divider">
                                        <span />{linkFill.status === 'failed' ? '직접 입력' : '또는 직접 입력'}<span />
                                    </div>
                                )}
                            </>
                        )}
                        {dayOptions.length > 1 && (
                            <div className="schedule-modal-form-group">
                                <label className="schedule-modal-form-label" htmlFor="schedule-day">
                                    날짜
                                </label>
                                <select
                                    id="schedule-day"
                                    className="schedule-modal-select"
                                    value={targetDay}
                                    onChange={(e) => setTargetDay(Number(e.target.value))}
                                >
                                    {dayOptions.map((o) => (
                                        <option key={o.day} value={o.day}>{o.label}</option>
                                    ))}
                                </select>
                                {schedule?.id && targetDay !== day && (
                                    <span className="schedule-modal-hint">
                                        저장하면 Day {day}에서 Day {targetDay}로 옮겨져요
                                    </span>
                                )}
                            </div>
                        )}
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

                        {/* 일정 종류 — 선택 사항, 다시 누르면 해제 */}
                        <div className="schedule-modal-form-group">
                            <span className="schedule-modal-form-label" id="schedule-category-label">종류</span>
                            <div className="schedule-category-chips" role="group" aria-labelledby="schedule-category-label">
                                {SCHEDULE_CATEGORIES.map(({ key, label, color, bg, Icon: icon }) => {
                                    const on = formData.category === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            className={`schedule-category-chip${on ? ' on' : ''}`}
                                            style={on ? { color, background: bg, borderColor: color } : undefined}
                                            aria-pressed={on}
                                            onClick={() => handleChange('category', on ? '' : key)}
                                        >
                                            {React.createElement(icon, { 'aria-hidden': true })}
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="schedule-modal-form-group">
                            <label className="schedule-modal-form-label" htmlFor="schedule-description">
                                설명
                            </label>
                            <AutoGrowTextarea
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
                                className={errors.cost ? 'schedule-modal-error' : ''}
                            />
                            {errors.cost && <span className="schedule-modal-error-text">{errors.cost}</span>}
                        </div>
                    </div>

                    {showDeleteConfirm ? (
                        <div className="schedule-modal-delete-confirm">
                            <span className="schedule-modal-delete-confirm-text">정말 삭제하시겠습니까?</span>
                            <div className="schedule-modal-delete-confirm-btns">
                                <button
                                    type="button"
                                    className="schedule-modal-btn schedule-modal-btn-secondary"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    취소
                                </button>
                                <button
                                    type="button"
                                    className="schedule-modal-btn schedule-modal-btn-danger"
                                    onClick={handleDelete}
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="schedule-modal-footer">
                            {schedule?.id && onDelete && (
                                <button
                                    type="button"
                                    className="schedule-modal-btn-delete-text"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={loading}
                                >
                                    삭제
                                </button>
                            )}
                            <div className="schedule-modal-footer-actions">
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
                                            <span className="schedule-modal-loading-indicator" />
                                            저장 중...
                                        </>
                                    ) : '저장'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ScheduleModal;
