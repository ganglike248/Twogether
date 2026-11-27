// src/components/EditLog/EditLogModal.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getEditLogs } from '../../services/eventService';
import { useNameByUid } from '../../hooks/useNameByUid';
import { buildLogLookup, getLogTitle, getLogDate, getChangeRows, getLogSummary } from './editLogFormat';
import { useAuthContext } from '../../contexts/AuthContext';
import { MdCalendarToday, MdEdit } from 'react-icons/md';
import './EditLogModal.css';
import { useDialog } from '../../hooks/useDialog';

// 필터 버튼별로 포함할 action 목록 — 반복 일정은 시리즈 단위 요약 로그(recurrence_*)로 남으므로
// 같은 성격의 필터에 함께 묶음(예전엔 action === filter로만 비교해서 어느 필터에도 안 잡혔음)
const FILTER_ACTIONS = {
  created: ['created', 'recurrence_created'],
  updated: ['updated', 'recurrence_updated', 'converted_to_personal'],
  deleted: ['deleted', 'recurrence_deleted'],
};
const PAGE_SIZE = 10;
// 필터를 걸었을 때 매칭이 PAGE_SIZE개 모일 때까지 다음 페이지를 이어 읽는 최대 횟수(무한 스캔 방지 안전장치)
const MAX_PAGES_PER_FETCH = 20;

// 반복 일정 로그는 배지 색을 기본 action과 같게 씀(별도 CSS 없이 created/updated/deleted 색 재사용)
const actionClassName = (action) => (action || '').replace(/^recurrence_/, '');

// events: 캘린더가 이미 갖고 있는 일정 목록(제목·날짜 표시용) — 기록마다 서버에서 일정을 다시 읽지 않음
const EditLogModal = ({ isOpen, onClose, eventId = null, events = [] }) => {
  const dialogRef = useDialog(isOpen, onClose);
  const { coupleId, getMemberName } = useAuthContext();
  const nameByUid = useNameByUid();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const modalBodyRef = useRef(null);

  const fetchLogs = useCallback(async (isInitial = false, startAfterDoc = null) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // 서버에서 10건씩 가져와 화면에서 거르는 구조라, 필터를 걸면 한 페이지에 매칭이 0건이어도
      // 예전엔 거기서 멈춰 "수정 기록이 없습니다"로 보이고(스크롤할 내용도 없어 다음 페이지도 안 불러옴)
      // 예전 기록을 영영 못 찾았음 — 매칭이 PAGE_SIZE개 모이거나 기록이 끝날 때까지 이어서 읽음
      const allowed = filter === 'all' ? null : FILTER_ACTIONS[filter] || [filter];
      const filteredLogs = [];
      let cursor = startAfterDoc;
      let result = { logs: [], lastDoc: cursor, hasMore: true };
      for (let page = 0; page < MAX_PAGES_PER_FETCH; page++) {
        result = await getEditLogs(coupleId, eventId, PAGE_SIZE, cursor);
        filteredLogs.push(...(allowed ? result.logs.filter(log => allowed.includes(log.action)) : result.logs));
        cursor = result.lastDoc;
        if (!result.hasMore || filteredLogs.length >= PAGE_SIZE) break;
      }

      if (isInitial) {
        setLogs(filteredLogs);
      } else {
        setLogs(prev => [...prev, ...filteredLogs]);
      }

      setLastDoc(cursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [coupleId, eventId, filter]);

  const resetAndFetchLogs = useCallback(async () => {
    setLogs([]);
    setLastDoc(null);
    setHasMore(true);
    setExpandedLogs(new Set());
    await fetchLogs(true, null);
  }, [fetchLogs]);

  useEffect(() => {
    if (isOpen) {
      resetAndFetchLogs();
    }
  }, [isOpen, eventId, filter, resetAndFetchLogs]);

  const handleScroll = useCallback(() => {
    if (!modalBodyRef.current || !hasMore || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchLogs(false, lastDoc);
    }
  }, [hasMore, loadingMore, fetchLogs, lastDoc]);

  useEffect(() => {
    const modalBody = modalBodyRef.current;
    if (modalBody) {
      modalBody.addEventListener('scroll', handleScroll);
      return () => modalBody.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const toggleExpanded = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  const lookup = useMemo(() => buildLogLookup(logs, events), [logs, events]);
  const typeName = (type) => (type === 'couple' ? '데이트' : getMemberName(type) || '일정');

  const getActionText = (action) => {
    switch (action) {
      case 'created': return '만듦';
      case 'updated': return '수정';
      case 'deleted': return '삭제';
      case 'converted_to_personal': return '나만 보기로';
      case 'recurrence_created': return '반복 만듦';
      case 'recurrence_updated': return '반복 수정';
      case 'recurrence_deleted': return '반복 삭제';
      default: return action;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="log-modal-container" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true">
        <div className="log-modal-header">
          <h2 className="log-modal-title">
            {eventId ? '이 일정의 수정 기록' : '전체 수정 기록'}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="닫기">&times;</button>
        </div>

        <div className="log-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            전체
          </button>
          <button 
            className={`filter-btn ${filter === 'created' ? 'active' : ''}`}
            onClick={() => setFilter('created')}
          >
            생성
          </button>
          <button 
            className={`filter-btn ${filter === 'updated' ? 'active' : ''}`}
            onClick={() => setFilter('updated')}
          >
            수정
          </button>
          <button 
            className={`filter-btn ${filter === 'deleted' ? 'active' : ''}`}
            onClick={() => setFilter('deleted')}
          >
            삭제
          </button>
        </div>

        <div className="log-modal-body" ref={modalBodyRef}>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>기록을 불러오는 중이에요</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-logs">
              <p>아직 수정 기록이 없어요</p>
            </div>
          ) : (
            <div className="logs-list">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const rows = log.action === 'updated' ? getChangeRows(log.changes, typeName) : [];
                const hasChanges = rows.length > 0;
                const summary = getLogSummary(log, rows, nameByUid(log.userId));
                const dateText = getLogDate(log, lookup);

                return (
                  <div key={log.id} className="log-item">
                    <div className="log-header">
                      <span className={`log-action log-action-${actionClassName(log.action)}`}>
                        {getActionText(log.action)}
                      </span>
                      <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                    </div>

                    <div className="log-details">
                      <div className="event-info">
                        <div className="event-title">
                          <MdEdit className="log-meta-icon" aria-hidden="true" /> {getLogTitle(log, lookup)}
                        </div>
                        {dateText && (
                          <div className="event-date">
                            <MdCalendarToday className="log-meta-icon" aria-hidden="true" /> {dateText}
                          </div>
                        )}
                      </div>

                      {summary && <div className="log-summary"><span>{summary}</span></div>}

                      {hasChanges && (
                        <button className="details-toggle-btn" onClick={() => toggleExpanded(log.id)} aria-expanded={isExpanded}>
                          {isExpanded ? '▼ 간단히 보기' : '▶ 자세히 보기'}
                        </button>
                      )}

                      {isExpanded && hasChanges && (
                        <div className="log-changes-expanded">
                          <div className="changes-comparison-vertical">
                            {rows.map((row) => (
                              <div key={row.label} className="change-item-vertical">
                                <div className="change-field">{row.label}</div>
                                <div className="change-values-vertical">
                                  <div className="before-value-vertical">
                                    <span className="label">바꾸기 전</span>
                                    <span className="value">{row.from}</span>
                                  </div>
                                  <div className="after-value-vertical">
                                    <span className="label">바꾼 뒤</span>
                                    <span className="value">{row.to}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 더 불러오는 중 표시 */}
              {loadingMore && (
                <div className="loading-more">
                  <div className="loading-spinner small"></div>
                  <p>더 불러오는 중이에요</p>
                </div>
              )}
              
              {/* 더 이상 로드할 항목이 없을 때 */}
              {!hasMore && logs.length > 0 && (
                <div className="no-more-logs">
                  <p>기록을 모두 불러왔어요</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="log-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditLogModal;
