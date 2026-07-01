// src/components/Travel/ScheduleItem.js
import React from 'react';
import { MdCheck, MdLocationOn, MdAttachMoney } from 'react-icons/md';
import { HiChevronRight } from 'react-icons/hi2';
import './ScheduleItem.css';

const ScheduleItem = ({ schedule, onEdit, onToggleComplete }) => {
    const formatTime = (time) => {
        if (!time) return '';
        try {
            const [hours, minutes] = time.split(':');
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        } catch { return time; }
    };

    const handleLocationClick = (e) => {
        e.stopPropagation();
        const query = schedule.location;
        const encodedQuery = encodeURIComponent(query);
        const ua = navigator.userAgent;
        const isAndroid = /android/i.test(ua);
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        const mobileWebUrl = `https://m.map.naver.com/search.naver?query=${encodedQuery}`;

        if (isAndroid) {
            // Android Intent URL: 앱 있으면 앱, 없으면 fallbackUrl로 자동 이동 (setTimeout 불필요)
            const fallbackUrl = encodeURIComponent(mobileWebUrl);
            window.location.href =
                `intent://search?query=${encodedQuery}#Intent;scheme=naver;package=com.nhn.android.nmap;S.browser_fallback_url=${fallbackUrl};end`;
        } else if (isIOS) {
            // iOS: nmap:// 딥링크 시도 → visibilitychange로 앱 열림 감지 → 미열림 시 웹 폴백
            const appUrl = `nmap://search?query=${encodedQuery}&appname=twogether-206fb.web.app`;
            let appOpened = false;
            const onVisibilityChange = () => {
                if (document.hidden) appOpened = true;
                document.removeEventListener('visibilitychange', onVisibilityChange);
            };
            document.addEventListener('visibilitychange', onVisibilityChange);
            window.location.href = appUrl;
            setTimeout(() => {
                document.removeEventListener('visibilitychange', onVisibilityChange);
                if (!appOpened) window.open(mobileWebUrl, '_blank');
            }, 1500);
        } else {
            // PC: 네이버 지도 웹 검색
            window.open(`https://map.naver.com/?query=${encodedQuery}`, '_blank');
        }
    };

    return (
        <div
            className={`schedule-item ${schedule.completed ? 'schedule-item-completed' : ''}`}
            onClick={() => onEdit(schedule)}
        >
            <button
                className={`schedule-item-checkbox ${schedule.completed ? 'checked' : ''}`}
                onClick={(e) => { e.stopPropagation(); onToggleComplete(schedule.id); }}
                aria-label={schedule.completed ? '완료 취소' : '완료'}
            >
                {schedule.completed && <MdCheck size={16} />}
            </button>

            <div className="schedule-item-body">
                {schedule.time && (
                    <div className="schedule-item-time">
                        {formatTime(schedule.time)}
                        {schedule.endTime && ` - ${formatTime(schedule.endTime)}`}
                    </div>
                )}
                <h3 className={`schedule-item-title ${schedule.completed ? 'schedule-item-strikethrough' : ''}`}>
                    {schedule.title}
                </h3>
                {(schedule.description || '').trim() && (
                    <p className="schedule-item-description">{schedule.description}</p>
                )}
                {(schedule.location || '').trim() && (
                    <button
                        className="schedule-item-location"
                        onClick={handleLocationClick}
                        title="네이버 지도에서 보기"
                    >
                        <MdLocationOn className="schedule-item-meta-icon" />
                        <span className="schedule-item-location-text">{schedule.location}</span>
                    </button>
                )}
                {schedule.cost > 0 && (
                    <p className="schedule-item-cost">
                        <MdAttachMoney className="schedule-item-meta-icon" />
                        {schedule.cost.toLocaleString()}원
                    </p>
                )}
            </div>

            <HiChevronRight className="schedule-item-chevron" />
        </div>
    );
};

export default ScheduleItem;
