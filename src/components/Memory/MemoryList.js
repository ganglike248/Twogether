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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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

  // 필터와 검색 조합 적용
  const applyFiltersAndSearch = (allMemories, currentFilter, currentSearch) => {
    let result = allMemories;

    // 필터 적용
    if (currentFilter !== 'all') {
      result = result.filter(memory => memory.eventType === currentFilter);
    }

    // 검색 적용
    if (currentSearch.trim()) {
      const searchLower = currentSearch.toLowerCase();
      result = result.filter(memory => {
        const titleMatch = (memory.title || '').toLowerCase().includes(searchLower);
        const descriptionMatch = (memory.description || '').toLowerCase().includes(searchLower);
        return titleMatch || descriptionMatch;
      });
    }

    setFilteredMemories(result);
  };

  // 필터 기반 실시간 구독
  useEffect(() => {
    if (!coupleId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const constraints = [
      where("coupleId", "==", coupleId),
      where("start", "<=", todayStr),
      orderBy("start", "desc"),
      limit(PAGE_SIZE)
    ];

    if (filter !== 'all') {
      constraints.splice(2, 0, where("eventType", "==", filter));
    }

    const q = query(collection(db, "events"), ...constraints);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const memoriesData = [];
      querySnapshot.forEach((doc) => {
        memoriesData.push({
          id: doc.id,
          ...normalizeMemory(doc.data()),
        });
      });

      setMemories(memoriesData);
      // 검색어가 없을 때만 필터된 결과 업데이트 (검색 중이면 검색 useEffect에서 처리)
      if (!searchTerm.trim()) {
        applyFiltersAndSearch(memoriesData, filter, '');
      }
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(memoriesData.length === PAGE_SIZE);
      setIsLoading(false);
    }, (error) => {
      console.error("Error subscribing to memories:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [coupleId, filter, searchTerm]);

  // 추가 메모리 로드 (필터 포함 페이지네이션) - 검색 중일 때는 작동 안 함
  const fetchMoreMemories = useCallback(async () => {
    if (!coupleId || !lastDoc || !hasMore || searchTerm.trim()) return;
    setLoadingMore(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const constraints = [
        where("coupleId", "==", coupleId),
        where("start", "<=", todayStr),
        orderBy("start", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      ];

      if (filter !== 'all') {
        constraints.splice(2, 0, where("eventType", "==", filter));
      }

      const q = query(collection(db, "events"), ...constraints);
      const querySnapshot = await getDocs(q);
      const memoriesData = [];

      querySnapshot.forEach((doc) => {
        memoriesData.push({
          id: doc.id,
          ...normalizeMemory(doc.data()),
        });
      });

      const updatedMemories = [...memories, ...memoriesData];
      setMemories(updatedMemories);
      // 검색어가 없을 때만 필터링 적용
      if (!searchTerm.trim()) {
        applyFiltersAndSearch(updatedMemories, filter, '');
      }
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(memoriesData.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching more memories:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [coupleId, lastDoc, hasMore, filter, searchTerm]);

  // 필터 변경 시 페이지네이션 초기화 (onSnapshot이 자동으로 새 데이터 로드)
  const resetPagination = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
  }, []);

  // 검색어 변경 시 Firestore에서 전체 데이터 로드
  useEffect(() => {
    if (!coupleId) return;

    const searchLower = searchTerm.toLowerCase();
    if (!searchLower.trim()) {
      // 검색 종료 - 무한 스크롤 모드로 돌아감
      setIsSearching(false);
      applyFiltersAndSearch(memories, filter, '');
      return;
    }

    // 검색 시작 - 전체 데이터 로드
    setIsSearching(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const constraints = [
      where("coupleId", "==", coupleId),
      where("start", "<=", todayStr),
      orderBy("start", "desc")
    ];

    if (filter !== 'all') {
      constraints.splice(2, 0, where("eventType", "==", filter));
    }

    const q = query(collection(db, "events"), ...constraints);
    getDocs(q).then((querySnapshot) => {
      const searchResults = [];
      querySnapshot.forEach((doc) => {
        const data = normalizeMemory(doc.data());
        // 클라이언트에서 검색어 필터링
        const titleMatch = (data.title || '').toLowerCase().includes(searchLower);
        const descriptionMatch = (data.description || '').toLowerCase().includes(searchLower);
        if (titleMatch || descriptionMatch) {
          searchResults.push({
            id: doc.id,
            ...data,
          });
        }
      });
      setFilteredMemories(searchResults);
      setIsSearching(false);
    }).catch((error) => {
      console.error("Error searching memories:", error);
      setIsSearching(false);
    });
  }, [searchTerm, coupleId, filter]);

  // 스크롤 핸들러 (검색 중일 때는 비활성화)
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !hasMore || loadingMore || isSearching) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchMoreMemories();
    }
  }, [hasMore, loadingMore, isSearching, fetchMoreMemories]);

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

      <div className="search-container">
        <input
          type="text"
          placeholder="제목이나 내용으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
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

      {isLoading || isSearching ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">{isSearching ? '검색 중...' : '추억을 불러오는 중...'}</p>
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
      
      {/* 더 이상 로드할 항목이 없을 때 (검색 중이 아닐 때) */}
      {!hasMore && memories.length > 0 && !isLoading && !isSearching && (
        <div className="no-more-logs">
          <p>모든 추억을 불러왔습니다.</p>
        </div>
      )}
    </div>
  );
};

export default MemoryList;