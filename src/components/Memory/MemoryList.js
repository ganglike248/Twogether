// src/components/Memory/MemoryList.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, where, getDocs, startAfter, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import MemoryCard from './MemoryCard';
import { Link } from 'react-router-dom';
import './MemoryList.css';

const PAGE_SIZE = 10;

const MemoryList = () => {
  const { coupleId, getMemberName } = useAuthContext();
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'boyfriend', 'girlfriend', 'couple'
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const containerRef = useRef(null);

  // 모든 메모리 데이터 가져오기 (페이지네이션)
  const fetchMemories = useCallback(async (isInitial = false) => {
    if (!coupleId) return;
    if (isInitial) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // 오늘 날짜 생성
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // 기본 쿼리 구성
      let q = query(
        collection(db, "events"),
        where("coupleId", "==", coupleId),
        where("start", "<=", todayStr),
        orderBy("start", "desc"),
        limit(PAGE_SIZE)
      );

      // 페이지네이션을 위한 startAfter 추가
      if (!isInitial && lastDoc) {
        q = query(
          collection(db, "events"),
          where("coupleId", "==", coupleId),
          where("start", "<=", todayStr),
          orderBy("start", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const querySnapshot = await getDocs(q);
      const memoriesData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // 날짜 확인 (이중 확인)
        const eventDate = new Date(data.start);
        if (eventDate < today) {
          // eventType 처리
          if (data.eventType === undefined) {
            data.eventType = data.isCouple ? 'couple' : 'boyfriend';
          }

          memoriesData.push({
            id: doc.id,
            ...data,
          });
        }
      });

      if (isInitial) {
        setMemories(memoriesData);
        setFilteredMemories(memoriesData);
      } else {
        setMemories(prev => [...prev, ...memoriesData]);
        setFilteredMemories(prev => [...prev, ...memoriesData]);
      }

      // 마지막 문서 설정
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(memoriesData.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching memories:", error);
    } finally {
      if (isInitial) {
        setIsLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [coupleId, lastDoc]);

  // coupleId 변경 시 상태 초기화 후 초기 로드
  useEffect(() => {
    setMemories([]);
    setFilteredMemories([]);
    setLastDoc(null);
    setHasMore(true);
    fetchMemories(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  // 필터 변경 시 메모리 필터링
  useEffect(() => {
    if (filter === 'all') {
      setFilteredMemories(memories);
    } else {
      const filtered = memories.filter(memory => memory.eventType === filter);
      setFilteredMemories(filtered);
    }
  }, [filter, memories]);

  // 스크롤 핸들러
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !hasMore || loadingMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchMemories(false);
    }
  }, [hasMore, loadingMore, fetchMemories]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div 
      className="memories-container" 
      ref={containerRef}
    >
      <div className="memories-header">
        <h1 className="memories-title">추억</h1>
        <p className="memories-subtitle">우리가 함께한 소중한 순간들</p>
      </div>

      <div className="filter-container">
        <button
          onClick={() => setFilter('all')}
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('couple')}
          className={`filter-button ${filter === 'couple' ? 'active' : ''}`}
        >
          데이트
        </button>
        <button
          onClick={() => setFilter('boyfriend')}
          className={`filter-button ${filter === 'boyfriend' ? 'active' : ''}`}
        >
          {getMemberName('boyfriend')}
        </button>
        <button
          onClick={() => setFilter('girlfriend')}
          className={`filter-button ${filter === 'girlfriend' ? 'active' : ''}`}
        >
          {getMemberName('girlfriend')}
        </button>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">추억을 불러오는 중...</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"></div>
          <h2 className="empty-title">해당하는 추억이 없습니다</h2>
          <p className="empty-text">
            {filter === 'all'
              ? '캘린더에서 일정을 만들어보세요!'
              : '선택한 필터에 해당하는 추억이 없습니다.'}
          </p>
          <Link to="/calendar" className="empty-button">
            추억 만들러 가기
          </Link>
        </div>
      ) : (
        <div className="memories-grid">
          {filteredMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}

      {/* 더 불러오는 중 표시 */}
      {loadingMore && (
        <div className="loading-more">
          <div className="loading-spinner small"></div>
          <p>더 많은 추억을 불러오는 중...</p>
        </div>
      )}
      
      {/* 더 이상 로드할 항목이 없을 때 */}
      {!hasMore && memories.length > 0 && !isLoading && (
        <div className="no-more-logs">
          <p>모든 추억을 불러왔습니다.</p>
        </div>
      )}
    </div>
  );
};

export default MemoryList;