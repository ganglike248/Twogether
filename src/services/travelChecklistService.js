// src/services/travelChecklistService.js
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';

// items 배열을 읽고-수정-쓰는 작업은 반드시 트랜잭션으로 — getDoc → updateDoc으로 하면 두 사람이
// 거의 동시에 항목을 체크/추가할 때 나중에 쓴 쪽이 먼저 쓴 쪽 변경을 통째로 덮어써 버림
// (2026-10-12 발견/수정). 배열 항목 안 타임스탬프는 여전히 Date.now() — serverTimestamp() 배열 금지.
const mutateItems = async (tripId, mutate) => {
  const checklistRef = doc(db, 'trips', tripId, 'checklists', 'main');
  await runTransaction(db, async (transaction) => {
    const checklistSnap = await transaction.get(checklistRef);
    if (!checklistSnap.exists()) {
      throw new Error('Checklist not found');
    }
    const updatedItems = mutate([...(checklistSnap.data().items || [])]);
    transaction.update(checklistRef, {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    });
  });
};


/**
 * 체크리스트 생성 (빈 상태로 시작)
 */
export const createChecklist = async (tripId, coupleId) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');

  const checklistData = {
    tripId,
    coupleId,
    items: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(checklistRef, checklistData);
  return { id: 'main', ...checklistData };
};

/**
 * 체크리스트 구독 (실시간)
 */
export const subscribeToChecklist = (tripId, callback) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');

  return onSnapshot(checklistRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

/**
 * 체크리스트 조회 (한 번)
 */
export const getChecklist = async (tripId) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');
  const docSnap = await getDoc(checklistRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

/**
 * 체크리스트 항목 추가
 */
export const addChecklistItem = async (tripId, itemData) => {
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
  ]);
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
 * 체크리스트 삭제
 */
export const deleteChecklist = async (tripId) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');
  await deleteDoc(checklistRef);
};

/**
 * 완료도 계산 (%)
 */
export const calculateProgress = (items) => {
  if (!items || items.length === 0) return 0;

  const completed = items.filter(item => item.completed).length;
  return Math.round((completed / items.length) * 100);
};

/**
 * 완료된 항목 개수
 */
export const getCompletedCount = (items) => {
  if (!items) return 0;
  return items.filter(item => item.completed).length;
};

/**
 * 우선순위별 항목 정렬
 */
export const sortByPriority = (items) => {
  if (!items) return [];

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    const priorityA = priorityOrder[a.priority] ?? 2;
    const priorityB = priorityOrder[b.priority] ?? 2;
    return priorityA - priorityB;
  });
};

/**
 * 마감일 임박 여부 (남은 일수)
 */
export const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
