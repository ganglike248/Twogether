// src/components/EditLog/EditLogModal.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEditLogs, getEventById } from '../../services/eventService';
import './EditLogModal.css';

const EditLogModal = ({ isOpen, onClose, eventId = null }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [eventsData, setEventsData] = useState({}); // 이벤트 데이터 캐시
  const modalBodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      resetAndFetchLogs();
    }
  }, [isOpen, eventId, filter]);

  const resetAndFetchLogs = async () => {
    setLogs([]);
    setLastDoc(null);
    setHasMore(true);
    setExpandedLogs(new Set());
    setEventsData({});
    await fetchLogs(true);
  };

  // fetchLogs를 useCallback으로 감싸서 의존성 문제 해결
  const fetchLogs = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await getEditLogs(eventId, 10, isInitial ? null : lastDoc);
      const filteredLogs = filter === 'all' 
        ? result.logs 
        : result.logs.filter(log => log.action === filter);

      // 각 로그의 이벤트 데이터를 조회
      const newEventsData = { ...eventsData };
      const fetchPromises = filteredLogs.map(async (log) => {
        if (log.eventId && !newEventsData[log.eventId]) {
          try {
            const eventData = await getEventById(log.eventId);
            if (eventData) {
              newEventsData[log.eventId] = eventData;
            }
          } catch (error) {
            console.error(`Error fetching event ${log.eventId}:`, error);
          }
        }
      });

      await Promise.all(fetchPromises);
      setEventsData(newEventsData);

      if (isInitial) {
        setLogs(filteredLogs);
      } else {
        setLogs(prev => [...prev, ...filteredLogs]);
      }
      
      setLastDoc(result.lastDoc);
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
  }, [eventId, filter, lastDoc, eventsData]);

  const handleScroll = useCallback(() => {
    if (!modalBodyRef.current || !hasMore || loadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchLogs(false);
    }
  }, [hasMore, loadingMore, fetchLogs]);

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
    const eventData = eventsData[log.eventId];
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
    const eventData = eventsData[log.eventId];
    if (!eventData || !eventData.title) {
      return '제목 없음';
    }
    return eventData.title;
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

  const getActionColor = (action) => {
    switch (action) {
      case 'created': return '#4CAF50';
      case 'updated': return '#FF9800';
      case 'deleted': return '#F44336';
      default: return '#757575';
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'created': return '생성됨';
      case 'updated': return '수정됨';
      case 'deleted': return '삭제됨';
      default: return action;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
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
                        className="log-action"
                        style={{ backgroundColor: getActionColor(log.action) }}
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
                          📅 날짜: {formatEventDate(log)}
                        </div>
                        <div className="event-title">
                          📝 제목: {getEventTitle(log)}
                        </div>
                      </div>
                      
                      {/* 요약 정보 */}
                      {/* <div className="log-summary">
                        {log.action === 'created' && (
                          <span>새로운 일정이 생성되었습니다</span>
                        )}
                        {log.action === 'deleted' && (
                          <span>일정이 삭제되었습니다</span>
                        )}
                        {log.action === 'updated' && hasChanges && (
                          <span>{meaningfulChanges.length}개 항목이 수정되었습니다</span>
                        )}
                      </div> */}

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
