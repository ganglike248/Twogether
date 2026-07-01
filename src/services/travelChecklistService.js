// src/services/travelChecklistService.js
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

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
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');
  const checklistSnap = await getDoc(checklistRef);

  if (!checklistSnap.exists()) {
    throw new Error('Checklist not found');
  }

  const checklist = checklistSnap.data();
  const newItem = {
    id: `item_${Date.now()}`,
    title: itemData.title,
    description: itemData.description || '',
    completed: false,
    completedBy: null,
    completedAt: null,
    dueDate: itemData.dueDate || null,
    priority: itemData.priority || 'medium',
    order: (checklist.items?.length || 0) + 1,
    createdAt: Date.now(),
  };

  const updatedItems = [...(checklist.items || []), newItem];

  await updateDoc(checklistRef, {
    items: updatedItems,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 체크리스트 항목 토글 (완료/미완료)
 */
export const toggleChecklistItem = async (tripId, itemId, userId) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');
  const checklistSnap = await getDoc(checklistRef);

  if (!checklistSnap.exists()) {
    throw new Error('Checklist not found');
  }

  const checklist = checklistSnap.data();
  const updatedItems = (checklist.items || []).map(item => {
    if (item.id !== itemId) return item;

    // 토글
    const isCompleting = !item.completed;

    return {
      ...item,
      completed: isCompleting,
      completedBy: isCompleting ? userId : null,
      completedAt: isCompleting ? Date.now() : null,
    };
  });

  await updateDoc(checklistRef, {
    items: updatedItems,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 체크리스트 항목 수정 (모든 필드)
 */
export const updateChecklistItem = async (tripId, itemId, updates) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');
  const checklistSnap = await getDoc(checklistRef);

  if (!checklistSnap.exists()) {
    throw new Error('Checklist not found');
  }

  const checklist = checklistSnap.data();
  const updatedItems = (checklist.items || []).map(item => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      ...updates,
      updatedAt: Date.now(),
    };
  });

  await updateDoc(checklistRef, {
    items: updatedItems,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 체크리스트 항목 삭제
 */
export const deleteChecklistItem = async (tripId, itemId) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');
  const checklistSnap = await getDoc(checklistRef);

  if (!checklistSnap.exists()) {
    throw new Error('Checklist not found');
  }

  const checklist = checklistSnap.data();
  const updatedItems = (checklist.items || []).filter(item => item.id !== itemId);

  await updateDoc(checklistRef, {
    items: updatedItems,
    updatedAt: serverTimestamp(),
  });
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
