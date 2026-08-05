// src/components/Travel/ScheduleItem.js
import React from 'react';
import { Capacitor } from '@capacitor/core';
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
        // 안드로이드 네이티브 앱(Capacitor WebView)은 intent:// 문법(브라우저 전용 Intent-URI 파싱)을
        // 이해하지 못함 — Capacitor의 Bridge.launchIntent()가 이걸 통째로 리터럴 URI로 취급해
        // startActivity에 넘기고, scheme "intent"를 처리하는 앱이 없어 ActivityNotFoundException이
        // 조용히 무시됨(폴백조차 안 일어남). 반면 커스텀 스킴(nmap://) 직접 호출은 Capacitor가 표준
        // 암시적 인텐트로 정상 처리하므로, iOS와 동일하게 커스텀 스킴 + visibilitychange 폴백 방식을 씀.
        const isNativeAndroid = isAndroid && Capacitor.isNativePlatform();

        if (isIOS || isNativeAndroid) {
            // nmap:// 딥링크 시도 → visibilitychange로 앱 열림 감지 → 미열림 시 웹 폴백
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
        } else if (isAndroid) {
            // 안드로이드 브라우저(PWA): Chrome이 intent:// 문법을 파싱해 앱 실행 + 폴백을 처리해줌.
            // scheme은 네이버 공식 문서 기준 반드시 "nmap"이어야 앱 인텐트 필터와 매칭됨
            // (예전 "naver"는 오타 — 매칭 안 돼 매번 fallbackUrl로만 열렸을 가능성 있음)
            const fallbackUrl = encodeURIComponent(mobileWebUrl);
            window.location.href =
                `intent://search?query=${encodedQuery}#Intent;scheme=nmap;package=com.nhn.android.nmap;S.browser_fallback_url=${fallbackUrl};end`;
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
