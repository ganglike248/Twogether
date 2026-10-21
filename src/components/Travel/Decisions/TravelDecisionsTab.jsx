// src/components/Travel/Decisions/TravelDecisionsTab.jsx
// 선택 사항 탭 — [비교 주제 N · ＋카테고리 추가] / [카테고리 · 즐겨찾기만 · 정렬] / 주제별 세로 섹션.
// 후보 상세 시트(?modal=option&d=&o=)와 보기 설정 시트(?modal=decision-view)는 URL로 열고 닫음
// (앱 모달 아키텍처: 열림 상태를 URL에서 파생, 닫기는 navigate(-1) 또는 첫 진입이면 replace).
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MdAdd, MdCheckCircle, MdGpsFixed, MdKeyboardArrowDown, MdStar, MdSwapVert } from 'react-icons/md';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTravelDecisions } from '../../../hooks/useTravelDecisions';
import DecisionSection from './DecisionSection';
import OptionDetailSheet from './OptionDetailSheet';
import DecisionViewSheet from './DecisionViewSheet';
import useDecisionActions from './useDecisionActions';
import { getMembers } from './optionScoreUtils';
import {
  DEFAULT_VIEW,
  OPTION_SORTS,
  buildVisibleTopics,
  getRankMap,
  getUnscoredCount,
} from './decisionViewUtils';
import './TravelDecisionsTab.css';

const viewStorageKey = (tripId) => `twogether_decision_view_${tripId}`;
const openStorageKey = (tripId) => `twogether_decision_open_${tripId}`;

// 주제별 접힘 상태 { [decisionId]: true|false } — 사용자가 직접 접거나 편 주제만 기록(세션 동안 유지)
const loadOpenMap = (tripId) => {
  try {
    return JSON.parse(sessionStorage.getItem(openStorageKey(tripId)) || '{}');
  } catch {
    return {};
  }
};

// 탭을 오가도 보기 설정이 유지되도록 세션 동안만 저장(기기 간 공유할 값이 아니라 sessionStorage)
const loadView = (tripId) => {
  try {
    const raw = sessionStorage.getItem(viewStorageKey(tripId));
    if (!raw) return DEFAULT_VIEW;
    // 예전 버전의 상태 필터(status: 'decided' 등)는 없어진 값이라 버림 — 남아 있으면 화면이 비어 보일 수 있음
    const { status: _legacyStatus, ...saved } = JSON.parse(raw);
    return { ...DEFAULT_VIEW, ...saved };
  } catch {
    return DEFAULT_VIEW;
  }
};

const TravelDecisionsTab = forwardRef(({ trip, onAddToSchedule, scheduledDaysByOption }, ref) => {
  const { user, coupleDoc, getMemberName } = useAuthContext();
  const { decisions, loading } = useTravelDecisions(trip.id);
  const [view, setView] = useState(() => loadView(trip.id));
  const [openMap, setOpenMap] = useState(() => loadOpenMap(trip.id));

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const modal = searchParams.get('modal');

  // iOS에서 모달 여닫기 내비게이션이 겹치면 히스토리가 꼬이므로 전환 하나가 끝날 때까지 다음 요청 무시
  const navLockRef = useRef(false);
  useEffect(() => { navLockRef.current = false; }, [location.key]);
  const guardedNavigate = (fn) => {
    if (navLockRef.current) return;
    navLockRef.current = true;
    setTimeout(() => { navLockRef.current = false; }, 700);
    fn();
  };

  const closeModal = () => guardedNavigate(() => {
    if (location.key === 'default') navigate(location.pathname, { replace: true });
    else navigate(-1);
  });

  const openOptionSheet = (decision, option, opts = {}) => guardedNavigate(() => {
    const params = new URLSearchParams({ modal: 'option', d: decision.id, o: option.id });
    if (opts.score) params.set('score', '1');
    navigate(`${location.pathname}?${params.toString()}`, { state: { modal: true } });
  });

  const openViewSheet = () => guardedNavigate(() => {
    navigate(`${location.pathname}?modal=decision-view`, { state: { modal: true } });
  });

  const sheetDecision = modal === 'option' ? decisions.find(d => d.id === searchParams.get('d')) : null;
  const sheetOption = sheetDecision ? (sheetDecision.options || []).find(o => o.id === searchParams.get('o')) : null;

  const { actions, modals } = useDecisionActions({
    trip,
    userId: user?.uid,
    onOptionDeleted: (optionId) => { if (sheetOption?.id === optionId) closeModal(); },
    scheduledDaysByOption,
    onAddToSchedule,
  });

  useImperativeHandle(ref, () => ({
    showDecisionMenu: () => actions.createTopic(),
  }));

  const applyView = (next) => {
    setView(next);
    try { sessionStorage.setItem(viewStorageKey(trip.id), JSON.stringify(next)); } catch { /* 저장 실패해도 화면엔 반영 */ }
  };

  // 직접 접거나 편 적 없는 주제의 기본값: 맨 위 주제·내가 평가할 후보가 있는 주제·후보가 없는 주제(바로 추가하도록)는
  // 펼침, 나머지는 접음.
  // 즐겨찾기만/확정만 보기 중엔 걸러진 후보가 바로 보이도록 전부 펼침
  const narrowing = view.favoritesOnly || view.decidedOnly;
  const isTopicOpen = (decision, index) => {
    if (narrowing) return true;
    if (openMap[decision.id] !== undefined) return openMap[decision.id];
    return index === 0 || getUnscoredCount(decision, user?.uid) > 0 || (decision.options || []).length === 0;
  };

  const toggleTopic = (decision, index) => {
    if (narrowing) return;
    const next = { ...openMap, [decision.id]: !isTopicOpen(decision, index) };
    setOpenMap(next);
    try { sessionStorage.setItem(openStorageKey(trip.id), JSON.stringify(next)); } catch { /* 저장 실패해도 화면엔 반영 */ }
  };

  const members = getMembers(coupleDoc, getMemberName);
  const topics = useMemo(() => buildVisibleTopics(decisions, view, user?.uid), [decisions, view, user?.uid]);
  const sortLabel = OPTION_SORTS.find(s => s.key === view.optionSort)?.label || '점수순';
  const categoryLabel = view.topicIds
    ? `카테고리 ${view.topicIds.filter(id => decisions.some(d => d.id === id)).length}/${decisions.length}`
    : '카테고리 전체';

  if (loading) {
    return (
      <div className="tdt-loading">
        <div className="tdt-spinner" />
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="tdt">
      <div className="tdt-top">
        <span className="tdt-count">비교 주제 <span className="tdt-count-num">{decisions.length}</span></span>
        <button className="tdt-add-topic" onClick={actions.createTopic}>
          <MdAdd />카테고리 추가
        </button>
      </div>

      {decisions.length > 0 && (
        <div className="tdt-filters">
          <button className="tdt-filter on" onClick={openViewSheet}>
            {categoryLabel}<MdKeyboardArrowDown />
          </button>
          <button
            className={`tdt-filter ${view.favoritesOnly ? 'on' : ''}`}
            onClick={() => applyView({ ...view, favoritesOnly: !view.favoritesOnly })}
            aria-pressed={view.favoritesOnly}
          >
            <MdStar className="tdt-filter-star" /> 즐겨찾기만
          </button>
          <button
            className={`tdt-filter ${view.decidedOnly ? 'on' : ''}`}
            onClick={() => applyView({ ...view, decidedOnly: !view.decidedOnly })}
            aria-pressed={view.decidedOnly}
          >
            <MdCheckCircle className="tdt-filter-decided" /> 확정만
          </button>
          <span className="tdt-filter-spacer" />
          <button className="tdt-sort" onClick={openViewSheet}>
            <MdSwapVert />{sortLabel}
          </button>
        </div>
      )}

      {decisions.length === 0 ? (
        <div className="tdt-empty">
          <div className="tdt-empty-icon"><MdGpsFixed size={48} /></div>
          <p className="tdt-empty-title">아직 선택지가 없습니다</p>
          <p className="tdt-empty-text">숙소, 식당, 액티비티 등을 비교해보세요!</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="tdt-empty">
          <p className="tdt-empty-title">조건에 맞는 후보가 없어요</p>
          <button className="tdt-empty-reset" onClick={() => applyView(DEFAULT_VIEW)}>보기 설정 초기화</button>
        </div>
      ) : (
        <div className="tdt-sections">
          {topics.map(({ decision, options }, index) => (
            <DecisionSection
              key={decision.id}
              open={isTopicOpen(decision, index)}
              onToggle={() => toggleTopic(decision, index)}
              decision={decision}
              options={options}
              rankMap={getRankMap(decision.options)}
              unscoredCount={getUnscoredCount(decision, user?.uid)}
              members={members}
              currentUserId={user?.uid}
              actions={actions}
              onOpenSheet={openOptionSheet}
              onAddToSchedule={onAddToSchedule}
              scheduledDaysByOption={scheduledDaysByOption}
            />
          ))}
        </div>
      )}

      {/* 시트 → 확인/편집 모달 순서로 렌더 — 같은 z-index면 나중 것이 위에 와서 시트 위에 모달이 뜸 */}
      {sheetDecision && sheetOption && (
        <OptionDetailSheet
          key={sheetOption.id}
          decision={sheetDecision}
          option={sheetOption}
          rank={getRankMap(sheetDecision.options)[sheetOption.id]}
          members={members}
          currentUserId={user?.uid}
          actions={actions}
          startScoring={searchParams.get('score') === '1'}
          onAddToSchedule={onAddToSchedule}
          scheduledDays={scheduledDaysByOption?.[sheetOption.id]}
          onClose={closeModal}
        />
      )}
      {modal === 'decision-view' && (
        <DecisionViewSheet
          decisions={decisions}
          userId={user?.uid}
          view={view}
          onApply={(next) => { applyView(next); closeModal(); }}
          onClose={closeModal}
        />
      )}
      {modals}
    </div>
  );
});

TravelDecisionsTab.displayName = 'TravelDecisionsTab';

export default TravelDecisionsTab;
