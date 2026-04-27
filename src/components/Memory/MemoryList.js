// src/components/Memory/MemoryList.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, where, getDocs, startAfter, limit, onSnapshot } from 'firebase/firestore';
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

  // 메모리 데이터 정규화
  const normalizeMemory = (data) => {
    if (data.eventType === undefined) {
      data.eventType = data.isCouple ? 'couple' : 'boyfriend';
    }
    return data;
  };

  // 초기 실시간 구독 (첫 페이지)
  useEffect(() => {
    if (!coupleId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const q = query(
      collection(db, "events"),
      where("coupleId", "==", coupleId),
      where("start", "<=", todayStr),
      orderBy("start", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const memoriesData = [];
      querySnapshot.forEach((doc) => {
        memoriesData.push({
          id: doc.id,
          ...normalizeMemory(doc.data()),
        });
      });

      setMemories(memoriesData);
      setFilteredMemories(memoriesData);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(memoriesData.length === PAGE_SIZE);
      setIsLoading(false);
    }, (error) => {
      console.error("Error subscribing to memories:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [coupleId]);

  // 추가 메모리 로드 (페이지네이션용 - getDocs 유지)
  const fetchMoreMemories = useCallback(async () => {
    if (!coupleId || !lastDoc || !hasMore) return;
    setLoadingMore(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const q = query(
        collection(db, "events"),
        where("coupleId", "==", coupleId),
        where("start", "<=", todayStr),
        orderBy("start", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const querySnapshot = await getDocs(q);
      const memoriesData = [];

      querySnapshot.forEach((doc) => {
        memoriesData.push({
          id: doc.id,
          ...normalizeMemory(doc.data()),
        });
      });

      setMemories(prev => [...prev, ...memoriesData]);
      setFilteredMemories(prev => [...prev, ...memoriesData]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(memoriesData.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching more memories:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [coupleId, lastDoc, hasMore]);

  // 필터 변경 시 메모리 필터링
  useEffect(() => {
    if (filter === 'all') {
      setFilteredMemories(memories);
    } else {
      const filtered = memories.filter(memory => memory.eventType === filter);
      setFilteredMemories(filtered);
    }
  }, [filter, memories]);

  // 필터 변경 시 페이지네이션 초기화 (새로운 필터로 데이터 재로드)
  const resetPagination = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
  }, []);

  // 스크롤 핸들러
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !hasMore || loadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchMoreMemories();
    }
  }, [hasMore, loadingMore, fetchMoreMemories]);

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
          onClick={() => {
            setFilter('all');
            resetPagination();
          }}
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
        >
          전체
        </button>
        <button
          onClick={() => {
            setFilter('couple');
            resetPagination();
          }}
          className={`filter-button ${filter === 'couple' ? 'active' : ''}`}
        >
          데이트
        </button>
        <button
          onClick={() => {
            setFilter('boyfriend');
            resetPagination();
          }}
          className={`filter-button ${filter === 'boyfriend' ? 'active' : ''}`}
        >
          {getMemberName('boyfriend')}
        </button>
        <button
          onClick={() => {
            setFilter('girlfriend');
            resetPagination();
          }}
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