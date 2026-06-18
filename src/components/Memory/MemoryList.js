// src/components/Memory/MemoryList.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, where, getDocs, startAfter, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import MemoryCard from './MemoryCard';
import EmptyState from '../common/EmptyState';
import { MemoryListSkeleton } from './MemoryCardSkeleton';
import { MdPhotoCamera } from 'react-icons/md';
import './MemoryList.css';

const PAGE_SIZE = 10;

const MemoryList = () => {
  const { coupleId, getMemberName, user } = useAuthContext();
  const userId = user?.uid;

  const [memories, setMemories] = useState([]);
  const [personalMemories, setPersonalMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // 검색 결과 페이지네이션
  const [searchResults, setSearchResults] = useState([]);
  const [searchLastDoc, setSearchLastDoc] = useState(null);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchIsLoadingMore, setSearchIsLoadingMore] = useState(false);

  const containerRef = useRef(null);

  const normalizeMemory = (data) => {
    if (data.eventType === undefined) {
      return { ...data, eventType: data.isCouple ? 'couple' : 'boyfriend' };
    }
    return data;
  };

  // 공유 + 개인 일정을 필터/검색에 따라 합산
  useEffect(() => {
    // 검색 중이면 searchResults 사용
    if (searchTerm.trim()) {
      setFilteredMemories(searchResults);
      return;
    }

    // 검색 미중일 때 기존 목록 + 페이지네이션 결과
    let result;
    if (filter === 'personal') {
      result = [...personalMemories];
    } else if (filter === 'all') {
      result = [...memories, ...personalMemories]
        .sort((a, b) => (a.start > b.start ? -1 : a.start < b.start ? 1 : 0));
    } else {
      result = memories.filter(m => m.eventType === filter);
    }
    setFilteredMemories(result);
  }, [memories, personalMemories, filter, searchTerm, searchResults]);

  // 개인 일정 실시간 구독 (과거 이벤트만)
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'personal_events'),
      where('userId', '==', userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data(), eventType: 'personal', isPersonal: true }))
        .filter(m => m.start && m.start.split('T')[0] <= todayStr)
        .sort((a, b) => (a.start > b.start ? -1 : 1));
      setPersonalMemories(data);
    });
    return () => unsubscribe();
  }, [userId]);

  // 공유 일정 구독 (개인 필터 선택 시 스킵)
  useEffect(() => {
    if (!coupleId) return;

    if (filter === 'personal') {
      setMemories([]);
      setLastDoc(null);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

    const constraints = [
      where('coupleId', '==', coupleId),
      where('start', '<=', todayStr),
      orderBy('start', 'desc'),
      limit(PAGE_SIZE)
    ];

    if (filter !== 'all') {
      constraints.splice(2, 0, where('eventType', '==', filter));
    }

    const q = query(collection(db, 'events'), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoriesData = [];
      snapshot.forEach(doc => {
        memoriesData.push({ id: doc.id, ...normalizeMemory(doc.data()) });
      });
      setMemories(memoriesData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(memoriesData.length === PAGE_SIZE);
      setIsLoading(false);
    }, (error) => {
      console.error('Error subscribing to memories:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [coupleId, filter]);

  // 추가 공유 일정 로드 (스크롤)
  const fetchMoreMemories = useCallback(async () => {
    if (!coupleId || !lastDoc || !hasMore || searchTerm.trim() || filter === 'personal') return;
    setLoadingMore(true);

    try {
      const _d = new Date();
      const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

      const constraints = [
        where('coupleId', '==', coupleId),
        where('start', '<=', todayStr),
        orderBy('start', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      ];

      if (filter !== 'all') {
        constraints.splice(2, 0, where('eventType', '==', filter));
      }

      const q = query(collection(db, 'events'), ...constraints);
      const snapshot = await getDocs(q);
      const newMemories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...normalizeMemory(doc.data()),
      }));

      setMemories(prev => [...prev, ...newMemories]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(newMemories.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching more memories:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [coupleId, lastDoc, hasMore, filter, searchTerm]);

  const resetPagination = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
  }, []);

  // 검색 결과 추가 로드 (페이지네이션)
  const fetchMoreSearchResults = useCallback(async () => {
    if (!coupleId || !searchTerm.trim() || searchIsLoadingMore || !searchHasMore) return;

    setSearchIsLoadingMore(true);
    try {
      const searchLower = searchTerm.toLowerCase();
      const _d = new Date();
      const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

      const promises = [];
      let hasSearchConstraints = false;

      // 공유 일정 검색
      if (filter !== 'personal') {
        const constraints = [
          where('coupleId', '==', coupleId),
          where('start', '<=', todayStr),
          orderBy('start', 'desc'),
        ];
        if (filter !== 'all') {
          constraints.splice(2, 0, where('eventType', '==', filter));
        }
        if (searchLastDoc) {
          constraints.push(startAfter(searchLastDoc));
        }
        constraints.push(limit(PAGE_SIZE));

        hasSearchConstraints = true;
        promises.push(getDocs(query(collection(db, 'events'), ...constraints)));
      } else {
        promises.push(Promise.resolve(null));
      }

      // 개인 일정 검색
      if (userId && (filter === 'all' || filter === 'personal')) {
        promises.push(getDocs(query(
          collection(db, 'personal_events'),
          where('userId', '==', userId)
        )));
      } else {
        promises.push(Promise.resolve(null));
      }

      const [sharedSnapshot, personalSnapshot] = await Promise.all(promises);
      const results = [];

      if (sharedSnapshot) {
        sharedSnapshot.forEach(doc => {
          const data = normalizeMemory(doc.data());
          const titleMatch = (data.title || '').toLowerCase().includes(searchLower);
          const descMatch = (data.description || '').toLowerCase().includes(searchLower);
          if (titleMatch || descMatch) results.push({ id: doc.id, ...data });
        });
      }

      if (personalSnapshot) {
        personalSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.start || data.start.split('T')[0] > todayStr) return;
          const titleMatch = (data.title || '').toLowerCase().includes(searchLower);
          const descMatch = (data.description || '').toLowerCase().includes(searchLower);
          if (titleMatch || descMatch) {
            results.push({ id: doc.id, ...data, eventType: 'personal', isPersonal: true });
          }
        });
      }

      // 이미 표시된 결과 제외하고 추가
      setSearchResults(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newResults = results.filter(r => !existingIds.has(r.id));
        const combined = [...prev, ...newResults].sort((a, b) => (a.start > b.start ? -1 : 1));
        return combined;
      });

      setSearchLastDoc(sharedSnapshot?.docs[sharedSnapshot.docs.length - 1] || null);
      setSearchHasMore(results.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching more search results:', error);
    } finally {
      setSearchIsLoadingMore(false);
    }
  }, [coupleId, searchTerm, filter, userId, searchLastDoc, searchHasMore, searchIsLoadingMore]);

  // 검색 처리 (공유 + 개인 일정 통합) — 검색어 변경 시 결과 초기화
  useEffect(() => {
    if (!coupleId) return;
    const searchLower = searchTerm.toLowerCase();

    if (!searchLower.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchLastDoc(null);
      setSearchHasMore(true);
      return; // compute useEffect가 filteredMemories 갱신
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchResults([]); // 검색어 변경 시 초기화
    setSearchLastDoc(null);
    setSearchHasMore(true);

    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

    const promises = [];

    // 공유 일정 검색 (personal 필터 제외)
    if (filter !== 'personal') {
      const constraints = [
        where('coupleId', '==', coupleId),
        where('start', '<=', todayStr),
        orderBy('start', 'desc'),
        limit(PAGE_SIZE),
      ];
      if (filter !== 'all') {
        constraints.splice(2, 0, where('eventType', '==', filter));
      }
      promises.push(getDocs(query(collection(db, 'events'), ...constraints)));
    } else {
      promises.push(Promise.resolve(null));
    }

    // 개인 일정 검색 (all/personal 필터)
    if (userId && (filter === 'all' || filter === 'personal')) {
      promises.push(getDocs(query(
        collection(db, 'personal_events'),
        where('userId', '==', userId)
      )));
    } else {
      promises.push(Promise.resolve(null));
    }

    Promise.all(promises).then(([sharedSnapshot, personalSnapshot]) => {
      if (cancelled) return;
      const results = [];

      if (sharedSnapshot) {
        sharedSnapshot.forEach(doc => {
          const data = normalizeMemory(doc.data());
          const titleMatch = (data.title || '').toLowerCase().includes(searchLower);
          const descMatch = (data.description || '').toLowerCase().includes(searchLower);
          if (titleMatch || descMatch) results.push({ id: doc.id, ...data });
        });
      }

      if (personalSnapshot) {
        personalSnapshot.forEach(doc => {
          const data = doc.data();
          if (!data.start || data.start.split('T')[0] > todayStr) return;
          const titleMatch = (data.title || '').toLowerCase().includes(searchLower);
          const descMatch = (data.description || '').toLowerCase().includes(searchLower);
          if (titleMatch || descMatch) {
            results.push({ id: doc.id, ...data, eventType: 'personal', isPersonal: true });
          }
        });
      }

      results.sort((a, b) => (a.start > b.start ? -1 : 1));
      setSearchResults(results);
      setSearchLastDoc(sharedSnapshot?.docs[sharedSnapshot.docs.length - 1] || null);
      setSearchHasMore(results.length === PAGE_SIZE);
      setIsSearching(false);
    }).catch(err => {
      if (cancelled) return;
      console.error('Error searching memories:', err);
      setIsSearching(false);
    });

    return () => { cancelled = true; };
  }, [searchTerm, coupleId, userId, filter]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      // 검색 중인 경우
      if (searchTerm.trim()) {
        if (!searchHasMore || searchIsLoadingMore) return;
        fetchMoreSearchResults();
      } else {
        // 일반 페이지네이션
        if (!hasMore || loadingMore) return;
        fetchMoreMemories();
      }
    }
  }, [hasMore, loadingMore, searchTerm, searchHasMore, searchIsLoadingMore, isLoading, fetchMoreMemories, fetchMoreSearchResults]);

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
          onClick={() => { setFilter('all'); resetPagination(); }}
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
        >
          전체
        </button>
        <button
          onClick={() => { setFilter('personal'); resetPagination(); }}
          className={`filter-button ${filter === 'personal' ? 'active' : ''}`}
        >
          개인
        </button>
        <button
          onClick={() => { setFilter('couple'); resetPagination(); }}
          className={`filter-button ${filter === 'couple' ? 'active' : ''}`}
        >
          데이트
        </button>
        <button
          onClick={() => { setFilter('boyfriend'); resetPagination(); }}
          className={`filter-button ${filter === 'boyfriend' ? 'active' : ''}`}
        >
          {getMemberName('boyfriend')}
        </button>
        <button
          onClick={() => { setFilter('girlfriend'); resetPagination(); }}
          className={`filter-button ${filter === 'girlfriend' ? 'active' : ''}`}
        >
          {getMemberName('girlfriend')}
        </button>
      </div>

      {isLoading ? (
        <MemoryListSkeleton />
      ) : isSearching ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">검색 중...</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <EmptyState
          icon={<MdPhotoCamera size={56} />}
          title="해당하는 추억이 없습니다"
          text={filter === 'all'
            ? '캘린더에서 일정을 만들어보세요!'
            : '선택한 필터에 해당하는 추억이 없습니다.'}
          button={{ text: '추억 만들러 가기', link: '/calendar' }}
        />
      ) : (
        <div className="memories-grid">
          {filteredMemories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}

      {(loadingMore || searchIsLoadingMore) && (
        <div className="loading-more">
          <div className="loading-spinner small"></div>
          <p>{searchTerm.trim() ? '더 많은 검색 결과를 불러오는 중...' : '더 많은 추억을 불러오는 중...'}</p>
        </div>
      )}

      {!hasMore && !searchTerm.trim() && filter !== 'personal' && memories.length > 0 && !isLoading && !isSearching && (
        <div className="no-more-logs">
          <p>모든 추억을 불러왔습니다.</p>
        </div>
      )}

      {searchTerm.trim() && !searchHasMore && searchResults.length > 0 && !isSearching && (
        <div className="no-more-logs">
          <p>모든 검색 결과를 불러왔습니다.</p>
        </div>
      )}
    </div>
  );
};

export default MemoryList;
