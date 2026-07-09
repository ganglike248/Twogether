// src/components/Memory/MemoryList.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, orderBy, where, getDocs, startAfter, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { getLocalDateStr } from '../../utils/dataUtils';
import MemoryCard from './MemoryCard';
import EmptyState from '../common/EmptyState';
import { MemoryListSkeleton } from './MemoryCardSkeleton';
import { MdPhotoCamera } from 'react-icons/md';
import './MemoryList.css';

const PAGE_SIZE = 10;
// 검색 스캔 안전장치 — 디바운스로 "검색 1회당 최대 1번" 실행되는 게 보장된 상태에서,
// 극단적으로 방대한 기록 + 존재하지 않는 검색어 조합에도 무한 루프로 빠지지 않도록 하는 상한.
// 평소 사용량에서는 절대 도달하지 않는 값(500페이지 = 5,000건)으로 넉넉히 잡음 — UX에 영향 주지 않는 안전망 용도.
const MAX_RAW_PAGES_PER_SCAN = 500;
// 검색어 입력 디바운스 — 매 키 입력마다 Firestore 스캔이 실행되는 것을 방지
const SEARCH_DEBOUNCE_MS = 300;

const normalizeSearchText = (value) => String(value || '').toLowerCase();

const matchesSearchTerm = (memory, term) => {
  const needle = normalizeSearchText(term).trim();
  if (!needle) return true;
  return (
    normalizeSearchText(memory.title).includes(needle) ||
    normalizeSearchText(memory.description).includes(needle)
  );
};

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // 검색 결과 페이지네이션
  const [searchResults, setSearchResults] = useState([]);
  const [searchLastDoc, setSearchLastDoc] = useState(null);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [searchIsLoadingMore, setSearchIsLoadingMore] = useState(false);

  const containerRef = useRef(null);
  // 검색 중 personalMemories(실시간 구독) 변경으로 검색 effect가 재실행되지 않도록
  // 최신 값을 ref로만 참조 — 검색은 검색어/필터가 바뀔 때만 다시 실행됨
  const personalMemoriesRef = useRef([]);
  // fetchMoreSearchResults가 searchResults state에 의존하지 않도록 최신 id 목록을 ref로 추적
  const searchResultIdsRef = useRef(new Set());
  // 검색어가 바뀔 때마다 증가 — 이전(오래된) 검색 요청이 늦게 응답해도 결과에 반영되지 않도록 방지
  const searchGenerationRef = useRef(0);

  // 검색어 디바운스
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

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
      const todayStr = getLocalDateStr();
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data(), eventType: 'personal', isPersonal: true }))
        .filter(m => m.start && m.start.split('T')[0] <= todayStr)
        .sort((a, b) => (a.start > b.start ? -1 : 1));
      setPersonalMemories(data);
    });
    return () => unsubscribe();
  }, [userId]);

  // 검색 effect가 personalMemories 변경(실시간 구독)에 반응해 재실행되지 않도록 최신 값만 ref로 동기화
  useEffect(() => {
    personalMemoriesRef.current = personalMemories;
  }, [personalMemories]);

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
    const todayStr = getLocalDateStr();

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
      const todayStr = getLocalDateStr();

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

  // 원본 문서를 날짜순으로 스캔하며 검색어에 매칭되는 공유 일정을 targetCount개만큼 모음.
  // 디바운스 덕분에 실제 검색당 1회만 호출되므로 매칭될 때까지 계속 스캔함 —
  // MAX_RAW_PAGES_PER_SCAN은 평소엔 닿지 않는 안전장치일 뿐, UX에 영향을 주는 상한이 아님.
  const fetchSharedSearchPage = useCallback(async (afterDoc = null, existingIds = new Set(), targetCount = PAGE_SIZE) => {
    if (!coupleId || filter === 'personal' || targetCount <= 0) {
      return { results: [], last: afterDoc, hasMoreShared: false };
    }

    const todayStr = getLocalDateStr();
    const results = [];
    let cursor = afterDoc;
    let hasMoreShared = true;
    let rawPagesFetched = 0;

    while (results.length < targetCount && hasMoreShared && rawPagesFetched < MAX_RAW_PAGES_PER_SCAN) {
      const constraints = [
        where('coupleId', '==', coupleId),
        where('start', '<=', todayStr),
        orderBy('start', 'desc'),
      ];

      if (filter !== 'all') {
        constraints.splice(2, 0, where('eventType', '==', filter));
      }
      if (cursor) {
        constraints.push(startAfter(cursor));
      }
      constraints.push(limit(PAGE_SIZE));

      const snapshot = await getDocs(query(collection(db, 'events'), ...constraints));
      const docs = snapshot.docs;
      rawPagesFetched += 1;
      cursor = docs[docs.length - 1] || null;
      hasMoreShared = docs.length === PAGE_SIZE;

      docs.forEach(doc => {
        const memory = { id: doc.id, ...normalizeMemory(doc.data()) };
        if (!existingIds.has(memory.id) && matchesSearchTerm(memory, debouncedSearchTerm)) {
          existingIds.add(memory.id);
          results.push(memory);
        }
      });
    }

    return { results, last: cursor, hasMoreShared };
  }, [coupleId, filter, debouncedSearchTerm]);

  // 검색 결과 추가 로드 (페이지네이션) — 날짜순 페이지를 읽고 클라이언트에서 제목/내용 필터링.
  // searchGenerationRef로 검색어가 바뀐 뒤 늦게 도착한 응답을 무시함 (경쟁 조건 방지).
  const fetchMoreSearchResults = useCallback(async () => {
    if (!coupleId || !debouncedSearchTerm || searchIsLoadingMore || !searchHasMore) return;

    const myGeneration = searchGenerationRef.current;
    setSearchIsLoadingMore(true);
    try {
      const existingIds = new Set(searchResultIdsRef.current);
      const { results, last, hasMoreShared } = await fetchSharedSearchPage(searchLastDoc, existingIds, PAGE_SIZE);

      if (myGeneration !== searchGenerationRef.current) return;

      setSearchResults(prev => (
        [...prev, ...results].sort((a, b) => (a.start > b.start ? -1 : 1))
      ));
      setSearchLastDoc(last);
      setSearchHasMore(hasMoreShared);
    } catch (error) {
      console.error('Error fetching more search results:', error);
    } finally {
      // generation이 바뀐(오래된) 요청이어도 이 요청 자체의 로딩 상태는 항상 풀어줘야 함 —
      // 아니면 검색어를 바꾼 뒤 다음 검색들이 계속 로딩 중 상태로 멈춰버림
      setSearchIsLoadingMore(false);
    }
  }, [
    coupleId,
    debouncedSearchTerm,
    searchIsLoadingMore,
    searchHasMore,
    fetchSharedSearchPage,
    searchLastDoc
  ]);

  // searchResults가 바뀔 때마다 id 목록을 ref로 동기화 — fetchMoreSearchResults가
  // searchResults 자체에 의존하지 않도록 해서 페이지를 불러올 때마다 스크롤 리스너가 재등록되는 것을 방지
  useEffect(() => {
    searchResultIdsRef.current = new Set(searchResults.map(m => m.id));
  }, [searchResults]);

  // 검색 처리 (공유 + 개인 일정 통합). debouncedSearchTerm에만 반응 —
  // personalMemories(실시간 구독)가 바뀌어도 재검색되지 않도록 personalMemoriesRef를 읽음.
  useEffect(() => {
    if (!coupleId) return;

    searchGenerationRef.current += 1;
    const myGeneration = searchGenerationRef.current;

    if (!debouncedSearchTerm) {
      setIsSearching(false);
      setSearchResults([]);
      setSearchLastDoc(null);
      setSearchHasMore(false);
      setSearchIsLoadingMore(false);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSearchLastDoc(null);
    setSearchHasMore(true);
    // 새 검색 시작 시 이전 검색의 "더 불러오기" 로딩 상태가 남아있지 않도록 방어적으로 초기화
    setSearchIsLoadingMore(false);

    const existingIds = new Set();
    // 개인 일정은 이미 클라이언트에 로드되어 있으므로 한 번에 매칭하되,
    // 다른 검색 페이지와 크기 규칙을 맞추기 위해 첫 PAGE_SIZE개만 표시함
    const personalMatches = (filter === 'all' || filter === 'personal')
      ? personalMemoriesRef.current.filter(memory => matchesSearchTerm(memory, debouncedSearchTerm))
      : [];
    const personalPage = personalMatches.slice(0, PAGE_SIZE);
    personalPage.forEach(memory => existingIds.add(memory.id));

    const sharedTarget = PAGE_SIZE - personalPage.length;
    const sharedPromise = sharedTarget > 0
      ? fetchSharedSearchPage(null, existingIds, sharedTarget)
      : Promise.resolve({ results: [], last: null, hasMoreShared: true });

    sharedPromise.then(({ results, last, hasMoreShared }) => {
      if (myGeneration !== searchGenerationRef.current) return;
      const combined = [...personalPage, ...results]
        .sort((a, b) => (a.start > b.start ? -1 : 1));
      setSearchResults(combined);
      setSearchLastDoc(last);
      setSearchHasMore(hasMoreShared);
      setIsSearching(false);
    }).catch(err => {
      if (myGeneration !== searchGenerationRef.current) return;
      console.error('Error searching memories:', err);
      setIsSearching(false);
    });
  }, [debouncedSearchTerm, coupleId, filter, fetchSharedSearchPage]);

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
      ) : isSearching || searchTerm.trim() !== debouncedSearchTerm ? (
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

      {(loadingMore || (searchIsLoadingMore && filteredMemories.length > 0)) && (
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
