// src/services/travelChecklistService.js
import {
  doc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { reportSubscribeError } from './subscribeError';

// items 배열을 읽고-수정-쓰는 작업은 반드시 트랜잭션으로 — getDoc → updateDoc으로 하면 두 사람이
// 거의 동시에 항목을 체크/추가할 때 나중에 쓴 쪽이 먼저 쓴 쪽 변경을 통째로 덮어써 버림
// (2026-10-12 발견/수정). 배열 항목 안 타임스탬프는 여전히 Date.now() — serverTimestamp() 배열 금지.
// 체크리스트 문서는 첫 항목을 추가할 때 만듦(createWith: { coupleId }) — 예전엔 탭을 열 때 "없으면 빈 목록으로 생성"했는데,
// 오프라인이라 기기에 저장본이 없을 뿐인 경우에도 '없음'으로 보고 빈 목록을 대기열에 넣어, 연결되면 상대가 만든 항목을
// 덮어쓸 수 있었음(v1.2.1 수정). 트랜잭션은 서버 값을 읽으므로 진짜 없을 때만 만들어짐.
const mutateItems = async (tripId, mutate, createWith = null) => {
  const checklistRef = doc(db, 'trips', tripId, 'checklists', 'main');
  await runTransaction(db, async (transaction) => {
    const checklistSnap = await transaction.get(checklistRef);
    if (!checklistSnap.exists()) {
      if (!createWith) throw new Error('Checklist not found');
      transaction.set(checklistRef, {
        tripId,
        coupleId: createWith.coupleId || null,
        items: mutate([]),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }
    const updatedItems = mutate([...(checklistSnap.data().items || [])]);
    transaction.update(checklistRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  });
};


/**
 * 체크리스트 구독 (실시간)
 */
export const subscribeToChecklist = (tripId, callback, onError) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');

  return onSnapshot(checklistRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  }, (error) => reportSubscribeError('checklist', error, onError));
};

/**
 * 체크리스트 항목 추가
 */
export const addChecklistItem = async (tripId, itemData, coupleId = null) => {
  await mutateItems(tripId, (items) => [
    ...items,
    {
      id: `item_${Date.now()}`,
      title: itemData.title,
      description: itemData.description || '',
      completed: false,
      completedBy: null,
      completedAt: null,
      dueDate: itemData.dueDate || null,
      priority: itemData.priority || 'medium',
      order: items.length + 1,
      createdAt: Date.now(),
    },
  ], { coupleId });
};

/**
 * 체크리스트 항목 토글 (완료/미완료)
 */
export const toggleChecklistItem = async (tripId, itemId, userId) => {
  await mutateItems(tripId, (items) => items.map(item => {
    if (item.id !== itemId) return item;

    // 토글
    const isCompleting = !item.completed;

    return {
      ...item,
      completed: isCompleting,
      completedBy: isCompleting ? userId : null,
      completedAt: isCompleting ? Date.now() : null,
    };
  }));
};

/**
 * 체크리스트 항목 수정 (모든 필드)
 */
export const updateChecklistItem = async (tripId, itemId, updates) => {
  await mutateItems(tripId, (items) => items.map(item => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      ...updates,
      updatedAt: Date.now(),
    };
  }));
};

/**
 * 체크리스트 항목 삭제
 */
export const deleteChecklistItem = async (tripId, itemId) => {
  await mutateItems(tripId, (items) => items.filter(item => item.id !== itemId));
};

/**
 * 완료도 계산 (%)
 */
export const calculateProgress = (items) => {
  if (!items || items.length === 0) return 0;

  const completed = items.filter(item => item.completed).length;
  return Math.round((completed / items.length) * 100);
};
