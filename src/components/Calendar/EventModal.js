import React, { useState, useEffect, useMemo } from 'react';
import { addDays, subDays } from 'date-fns';
import { toast } from 'react-toastify';
import './EventModal.css';
import { useAuthContext } from '../../contexts/AuthContext';
import useDoubleClickPrevention from '../../hooks/useDoubleClickPrevention';
import useAnalytics from '../../hooks/useAnalytics';
import RecurrenceFields from './RecurrenceFields';
import RecurrenceScopeModal from './RecurrenceScopeModal';
import { generateOccurrenceDates, RecurrenceLimitError } from '../../utils/recurrenceRules';

const DEFAULT_RECURRENCE = {
  enabled: false,
  freq: 'weekly',
  interval: 1,
  byWeekday: [],
  endType: 'date',
  until: '',
  count: 1,
};

// RecurrenceFields/서비스 양쪽이 기대하는 형태로 정리 (freq==='weekly'가 아니면 byWeekday는 항상 null)
const toRuleObject = (r) => ({
  freq: r.freq,
  interval: r.interval,
  byWeekday: r.freq === 'weekly' ? (r.byWeekday || []) : null,
  endType: r.endType,
  until: r.endType === 'date' ? r.until : null,
  count: r.endType === 'count' ? r.count : null,
});

const EventModal = ({ isOpen, onClose, event, onSave, onDelete }) => {
  const { getMemberName, myRole } = useAuthContext();
  const { logEvent } = useAnalytics();
  const canClick = useDoubleClickPrevention(500);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('couple');
  const [isPersonal, setIsPersonal] = useState(false);
  const [isDday, setIsDday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recurrence, setRecurrence] = useState(DEFAULT_RECURRENCE);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeMode, setScopeMode] = useState('save'); // 'save' | 'delete'
  const [pendingEventData, setPendingEventData] = useState(null);

  // 반복 일정의 "예외 아닌" 인스턴스인지 — 이 경우만 반복 규칙 편집/범위선택 UI 대상
  const isSeriesMember = !!(event?.recurrence?.seriesId) && !event?.recurrence?.isException;
  // 반복 설정 UI 자체를 보여줄지: 새 일정이거나(신규 생성 시 켤 수 있음), 이미 반복 중인 인스턴스 편집 시.
  // 기존 단일/예외 일정을 나중에 반복으로 "전환"하는 건 지원하지 않음(범위가 커져서 1단계 제외).
  const canConfigureRecurrence = !(event && event.id) || isSeriesMember;
  const recurrenceActive = canConfigureRecurrence && (recurrence.enabled || isSeriesMember);
  // 진짜 시작(첫) 인스턴스인지 — "수정"의 범위 선택에서 "전체"를 여기서만 노출함(그 외 인스턴스에서
  // "전체"를 고르면 실제로는 이 인스턴스 날짜부터 재계산되는데 이름과 동작이 안 맞아 헷갈린다는
  // 피드백으로 도입). "삭제"는 애매함이 없어서(항상 시리즈 전체 삭제) 이 제한을 안 둠.
  const isFirstInstance = event?.recurrence?.isFirst === true;
  const instanceDateLabel = (() => {
    if (!isSeriesMember || !startDate) return '';
    const [, m, d] = startDate.split('-');
    return `${Number(m)}월 ${Number(d)}일`;
  })();

  const extractDate = (dateValue) => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue.split('T')[0];
    if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
    return '';
  };

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartDate(extractDate(event.start));

      const startStr = extractDate(event.start);
      const endStr = extractDate(event.end);

      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        setEndDate(end > start ? extractDate(subDays(end, 1)) : startStr);
      } else {
        setEndDate(startStr);
      }

      setEventType(event.eventType || 'couple');
      setIsPersonal(event.isPersonal || event.extendedProps?.isPersonal || false);
      setIsDday(event.isDday || event.extendedProps?.isDday || false);

      const seriesInfo = event.recurrence;
      if (seriesInfo?.seriesId && !seriesInfo.isException) {
        setRecurrence({
          enabled: true,
          freq: seriesInfo.freq || 'weekly',
          interval: seriesInfo.interval || 1,
          byWeekday: seriesInfo.byWeekday || [],
          endType: seriesInfo.endType || 'date',
          until: seriesInfo.until || '',
          count: seriesInfo.count || 1,
        });
      } else {
        setRecurrence(DEFAULT_RECURRENCE);
      }
    } else {
      // 새 일정 생성 시 폼 초기화 + localStorage에서 마지막 개인 일정 여부 복원
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setEventType('couple');
      const lastPersonalState = localStorage.getItem('twogether_personal_default') === 'true';
      setIsPersonal(lastPersonalState);
      setIsDday(false);
      setRecurrence(DEFAULT_RECURRENCE);
    }
  }, [event]);

  // 반복 미리보기(생성될 개수) + 50개 상한 초과 여부 — 저장 버튼 비활성화 조건에도 사용
  const recurPreview = useMemo(() => {
    if (!recurrenceActive || !startDate) return { count: 0, error: '' };
    if (recurrence.endType === 'date' && !recurrence.until) return { count: 0, error: '' };
    if (recurrence.endType === 'count' && !recurrence.count) return { count: 0, error: '' };
    try {
      const dates = generateOccurrenceDates(toRuleObject(recurrence), startDate);
      if (dates.length === 0) {
        return { count: 0, error: '반복 종료 조건을 확인해주세요. 생성될 일정이 없습니다.' };
      }
      return { count: dates.length, error: '' };
    } catch (err) {
      if (err instanceof RecurrenceLimitError) {
        return { count: err.count, error: err.message };
      }
      return { count: 0, error: '반복 설정을 확인해주세요.' };
    }
  }, [recurrence, startDate, recurrenceActive]);

  const buildEventData = () => {
    const finalEndDate = endDate || startDate;
    const isMultiDay = startDate !== finalEndDate;

    const adjustedStartDate = `${startDate}T00:00:00`;
    const adjustedEndDate = isMultiDay
      ? addDays(new Date(finalEndDate), 1).toISOString().split('T')[0] + 'T00:00:00'
      : `${finalEndDate}T23:59:59`;

    const durationDays = Math.round((new Date(finalEndDate) - new Date(startDate)) / 86400000);

    const data = {
      id: event?.id,
      title,
      description,
      start: adjustedStartDate,
      end: adjustedEndDate,
      eventType,
      isPersonal: isPersonal && eventType === myRole,
      isDday: recurrenceActive ? false : isDday,
    };

    if (recurrenceActive) {
      data.recurrenceRule = toRuleObject(recurrence);
      data.recurrenceTemplate = {
        title,
        description,
        eventType,
        startDate,
        durationDays,
        start: adjustedStartDate,
        end: adjustedEndDate,
      };
    }
    if (isSeriesMember) {
      data.seriesId = event.recurrence.seriesId;
      data.instanceDateStr = extractDate(event.start);
    }

    return { data, isMultiDay };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canClick()) {
      return;
    }

    if (!title.trim()) {
      toast.error('일정 제목을 입력해주세요.');
      return;
    }

    if (!startDate) {
      toast.error('시작일을 입력해주세요.');
      return;
    }

    const finalEndDate = endDate || startDate;
    if (new Date(startDate) > new Date(finalEndDate)) {
      toast.error('종료일은 시작일보다 늦거나 같아야 합니다.');
      return;
    }

    if (recurrenceActive) {
      if (recurrence.endType === 'date' && !recurrence.until) {
        toast.error('반복 종료일을 입력해주세요.');
        return;
      }
      if (recurrence.endType === 'count' && !recurrence.count) {
        toast.error('반복 횟수를 입력해주세요.');
        return;
      }
      if (recurPreview.error) {
        toast.error(recurPreview.error);
        return;
      }
    }

    setLoading(true);

    try {
      const { data: eventData, isMultiDay } = buildEventData();

      // localStorage에 마지막 선택 상태 저장
      if (eventType === myRole) {
        localStorage.setItem('twogether_personal_default', isPersonal ? 'true' : 'false');
      }

      if (isSeriesMember) {
        // 반복 일정의 기존 인스턴스 수정 — 어디까지 적용할지 먼저 물어봄
        setPendingEventData(eventData);
        setScopeMode('save');
        setShowScopeModal(true);
        setLoading(false);
        return;
      }

      await onSave(eventData);

      logEvent('event_created', {
        eventType,
        isMultiDay,
        hasDescription: !!description,
        isRecurring: !!eventData.recurrenceRule,
      });
      // onClose()는 따로 안 부름 — Calendar.jsx의 onSave(handleSaveEvent)가 성공 시 이미
      // closeModal()을 호출함. 여기서 또 부르면 navigate(-1)이 두 번 실행돼 히스토리를
      // 하나 더 건너뛰어 버림(사이드바를 열고 들어온 경로면 그 사이드바 상태로 되돌아가는
      // 버그로 실제 재현됨 — AppHeader.jsx의 closeSidebar 주석에 있는 것과 동일한 문제).
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error(`일정 저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (isSeriesMember) {
      setScopeMode('delete');
      setShowScopeModal(true);
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await onDelete(event.id);
    } catch (err) {
      toast.error(`삭제 중 오류가 발생했습니다.\n${err?.message || String(err)}`);
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleScopeCancel = () => {
    setShowScopeModal(false);
    setPendingEventData(null);
  };

  const handleScopeChoose = async (scope) => {
    setShowScopeModal(false);
    setLoading(true);
    try {
      if (scopeMode === 'delete') {
        await onDelete(event.id, scope, event.recurrence.seriesId);
      } else {
        await onSave({ ...pendingEventData, recurrenceScope: scope });
      }
      // onClose()는 따로 안 부름 — 위 handleSubmit과 같은 이유(Calendar.jsx가 이미 닫음).
    } catch (err) {
      const label = scopeMode === 'delete' ? '삭제' : '저장';
      toast.error(`${label} 중 오류가 발생했습니다.\n${err?.message || String(err)}`);
    } finally {
      setLoading(false);
      setPendingEventData(null);
    }
  };

  if (!isOpen) return null;

  const isSaveDisabled =
    loading ||
    !title.trim() ||
    !startDate ||
    (startDate && endDate && new Date(startDate) > new Date(endDate)) ||
    (recurrenceActive && !!recurPreview.error);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-card">
        <div className="sheet-top-row">
          <span className="sheet-eyebrow">
            {event && event.id ? "일정 수정" : "새 일정 추가"}
          </span>
          <button
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            className="sheet-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="일정 제목을 입력하세요"
            aria-label="일정 제목"
            required
          />

          <div
            className="sheet-type-row"
            role="radiogroup"
            aria-label="일정 유형"
          >
            <label
              className={`sheet-type-opt couple${
                eventType === "couple" ? " sel" : ""
              }`}
            >
              <input
                type="radio"
                name="eventType"
                value="couple"
                checked={eventType === "couple"}
                onChange={() => setEventType("couple")}
              />
              데이트
            </label>
            <label
              className={`sheet-type-opt boy${
                eventType === "boyfriend" ? " sel" : ""
              }`}
            >
              <input
                type="radio"
                name="eventType"
                value="boyfriend"
                checked={eventType === "boyfriend"}
                onChange={() => setEventType("boyfriend")}
              />
              {getMemberName("boyfriend")}
            </label>
            <label
              className={`sheet-type-opt girl${
                eventType === "girlfriend" ? " sel" : ""
              }`}
            >
              <input
                type="radio"
                name="eventType"
                value="girlfriend"
                checked={eventType === "girlfriend"}
                onChange={() => setEventType("girlfriend")}
              />
              {getMemberName("girlfriend")}
            </label>
          </div>

          <textarea
            className="sheet-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="메모를 남겨보세요"
            aria-label="일정 설명"
            rows="6"
            spellCheck={false}
          />

          <div className="sheet-date-block">
            <div className="sheet-date-grid">
              <div className="sheet-date-col">
                <span className="sheet-date-micro">시작</span>
                <input
                  type="date"
                  className="sheet-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="시작일"
                  // 반복 중인 인스턴스는 시작일을 수정해도 실제 발생 날짜엔 반영 안 됨 —
                  // "이후 모두"/"전체" 재생성이 항상 규칙+기준일(클릭한 인스턴스 자신의 날짜)로만
                  // 날짜를 계산하기 때문(재생성 위상 버그 방지 설계, recurrenceService.js 참고).
                  // 그런데 이 값이 durationDays 계산엔 그대로 쓰여서, 수정이 조용히 무시되는 줄
                  // 모르고 시작일만 바꾸면 모든 미래 인스턴스 기간이 의도치 않게 늘어나는 버그가
                  // 있었음(2026-08-25 발견/수정) — 애초에 못 바꾸게 막아 혼동을 없앰
                  disabled={isSeriesMember}
                  required
                />
              </div>
              <div className="sheet-date-col">
                <span className="sheet-date-micro">종료</span>
                <input
                  type="date"
                  className="sheet-date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  aria-label="종료일"
                />
              </div>
            </div>
          </div>

          <div className="sheet-toggle-row">
            <label className="sheet-toggle-item">
              <input
                type="checkbox"
                checked={isDday}
                onChange={(e) => setIsDday(e.target.checked)}
                disabled={recurrenceActive}
              />
              <span className="sheet-switch"></span>
              <span className="sheet-toggle-text">디데이로 표시</span>
            </label>
            {eventType === myRole && (
              <label className="sheet-toggle-item">
                <input
                  type="checkbox"
                  checked={isPersonal}
                  onChange={(e) => setIsPersonal(e.target.checked)}
                  disabled={isSeriesMember}
                />
                <span className="sheet-switch"></span>
                <span className="sheet-toggle-text">나만 보기</span>
              </label>
            )}
            {canConfigureRecurrence && !isSeriesMember && (
              <label className="sheet-toggle-item">
                <input
                  type="checkbox"
                  checked={recurrence.enabled}
                  onChange={(e) =>
                    setRecurrence((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  disabled={isDday}
                />
                <span className="sheet-switch"></span>
                <span className="sheet-toggle-text">반복 일정으로 만들기</span>
              </label>
            )}
          </div>

          {recurrenceActive && (
            <RecurrenceFields
              value={recurrence}
              onChange={setRecurrence}
              startDate={startDate}
              disabled={loading}
              preview={recurPreview}
            />
          )}

          <hr className="sheet-dashed" />

          <div className="sheet-footer-row">
            {event && event.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={loading}
              >
                삭제
              </button>
            ) : (
              <div></div>
            )}

            <div className="sheet-foot-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaveDisabled}
              >
                {loading ? (
                  <>
                    <span className="loading-indicator"></span>
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 삭제 확인 모달 (반복 아닌 일반 일정) */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="confirm-card">
            <p className="confirm-title">일정 삭제</p>
            <p className="confirm-body">이 일정을 삭제하시겠습니까?</p>
            <div className="confirm-actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn btn-danger"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 반복 일정 범위 선택 (이 일정만 / 이후 모두 / 전체) —
          "전체"는 삭제 시 항상, 수정 시엔 진짜 첫 인스턴스를 열었을 때만 노출 */}
      {showScopeModal && (
        <RecurrenceScopeModal
          mode={scopeMode}
          showAllOption={scopeMode === 'delete' || isFirstInstance}
          instanceDateLabel={instanceDateLabel}
          onCancel={handleScopeCancel}
          onChoose={handleScopeChoose}
        />
      )}
    </div>
  );
};

export default EventModal;
