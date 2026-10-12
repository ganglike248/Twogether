// src/components/EditLog/EditLogModal.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEditLogs, getEventById } from '../../services/eventService';
import { useAuthContext } from '../../contexts/AuthContext';
import { MdCalendarToday, MdEdit } from 'react-icons/md';
import './EditLogModal.css';

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

const EditLogModal = ({ isOpen, onClose, eventId = null }) => {
  const { coupleId } = useAuthContext();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [eventsData, setEventsData] = useState({});
  const eventsDataRef = useRef({});
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

      const newEventsData = { ...eventsDataRef.current };
      await Promise.all(filteredLogs.map(async (log) => {
        if (log.eventId && !newEventsData[log.eventId]) {
          try {
            const eventData = await getEventById(log.eventId);
            if (eventData) newEventsData[log.eventId] = eventData;
          } catch (error) {
            console.error(`Error fetching event ${log.eventId}:`, error);
          }
        }
      }));
      eventsDataRef.current = newEventsData;
      setEventsData(newEventsData);

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
    eventsDataRef.current = {};
    setEventsData({});
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

  // 개선된 이벤트 날짜 포맷팅 함수 - eventsData에서 조회
  const formatEventDate = (log) => {
    // 삭제된 일정·반복 일정 요약 로그(eventId가 시리즈 ID)는 원본 문서가 없어 조회가 안 됨 —
    // 로그에 함께 저장된 값(changes.start, 반복 수정·삭제의 기준일 changes.from)으로 보완
    const eventData = eventsData[log.eventId]
      || (log.changes?.start || log.changes?.from ? { start: log.changes.start || log.changes.from } : null);
    if (!eventData || !eventData.start) {
      return '날짜 정보 없음';
    }

    try {
      let date;
      if (eventData.start.toDate) {
        // Firestore Timestamp
        date = eventData.start.toDate();
      } else if (typeof eventData.start === 'string') {
        // 문자열 날짜
        date = new Date(eventData.start);
      } else {
        // Date 객체
        date = new Date(eventData.start);
      }

      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '날짜 형식 오류';
    }
  };

  // 개선된 이벤트 제목 추출 함수 - eventsData에서 조회
  const getEventTitle = (log) => {
    const title = eventsData[log.eventId]?.title || log.changes?.title;
    return title || '제목 없음';
  };

  const formatChangesImproved = (changes) => {
    if (!changes || typeof changes !== 'object') return null;
    
    const ignoredFields = ['start', 'end', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'];
    const meaningfulChanges = Object.entries(changes).filter(([key]) => 
      !ignoredFields.includes(key)
    );

    if (meaningfulChanges.length === 0) return null;

    return meaningfulChanges.map(([key, value]) => {
      if (typeof value === 'object' && value.from !== undefined) {
        return { field: key, from: value.from, to: value.to };
      }
      return { field: key, from: '', to: JSON.stringify(value) };
    });
  };


  const getActionText = (action) => {
    switch (action) {
      case 'created': return '생성됨';
      case 'updated': return '수정됨';
      case 'deleted': return '삭제됨';
      case 'converted_to_personal': return '개인 전환됨';
      case 'recurrence_created': return '반복 일정 생성됨';
      case 'recurrence_updated': return '반복 일정 수정됨';
      case 'recurrence_deleted': return '반복 일정 삭제됨';
      default: return action;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="log-modal-container">
        <div className="log-modal-header">
          <h2 className="log-modal-title">
            {eventId ? '이벤트 수정 기록' : '전체 수정 기록'}
          </h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
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
              <p>로그를 불러오는 중...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-logs">
              <p>수정 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="logs-list">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const meaningfulChanges = formatChangesImproved(log.changes);
                const hasChanges = log.action === 'updated' && meaningfulChanges && meaningfulChanges.length > 0;
                
                return (
                  <div key={log.id} className="log-item">
                    <div className="log-header">
                      <span
                        className={`log-action log-action-${actionClassName(log.action)}`}
                      >
                        {getActionText(log.action)}
                      </span>
                      <span className="log-timestamp">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="log-details">
                      {/* 개선된 날짜와 일정 제목 표시 */}
                      <div className="event-info">
                        <div className="event-date">
                          <MdCalendarToday className="log-meta-icon" color="#4dabf7" /> 날짜: {formatEventDate(log)}
                        </div>
                        <div className="event-title">
                          <MdEdit className="log-meta-icon" color="#74c0fc" /> 제목: {getEventTitle(log)}
                        </div>
                      </div>
                      
                      {/* 요약 정보 */}
                      <div className="log-summary">
                        {log.action === 'created' && (
                          <span>새로운 일정이 생성되었습니다</span>
                        )}
                        {log.action === 'deleted' && (
                          <span>일정이 삭제되었습니다</span>
                        )}
                        {log.action === 'converted_to_personal' && (
                          <span>개인 일정으로 전환되었습니다</span>
                        )}
                        {log.action === 'recurrence_created' && (
                          <span>반복 일정 {log.changes?.occurrenceCount ? `${log.changes.occurrenceCount}개가 ` : ''}생성되었습니다</span>
                        )}
                        {log.action === 'recurrence_updated' && (
                          <span>반복 일정이 수정되었습니다</span>
                        )}
                        {log.action === 'recurrence_deleted' && (
                          <span>반복 일정 {log.changes?.deletedCount ? `${log.changes.deletedCount}개가 ` : ''}삭제되었습니다</span>
                        )}
                        {log.action === 'updated' && hasChanges && (
                          <span>{meaningfulChanges.length}개 항목이 수정되었습니다</span>
                        )}
                      </div>

                      {/* 자세히 보기 버튼 */}
                      {hasChanges && (
                        <button 
                          className="details-toggle-btn"
                          onClick={() => toggleExpanded(log.id)}
                        >
                          {isExpanded ? '▼ 간단히 보기' : '▶ 자세히 보기'}
                        </button>
                      )}

                      {/* 확장된 변경사항 - 세로 정렬 */}
                      {isExpanded && hasChanges && (
                        <div className="log-changes-expanded">
                          <strong>상세 변경사항:</strong>
                          <div className="changes-comparison-vertical">
                            {meaningfulChanges.map((change, index) => (
                              <div key={index} className="change-item-vertical">
                                <div className="change-values-vertical">
                                  <div className="before-value-vertical">
                                    <span className="label">변경 전:</span>
                                    <span className="value">{change.from || '(없음)'}</span>
                                  </div>
                                  <div className="after-value-vertical">
                                    <span className="label">변경 후:</span>
                                    <span className="value">{change.to}</span>
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
                  <p>더 많은 로그를 불러오는 중...</p>
                </div>
              )}
              
              {/* 더 이상 로드할 항목이 없을 때 */}
              {!hasMore && logs.length > 0 && (
                <div className="no-more-logs">
                  <p>모든 로그를 불러왔습니다.</p>
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
