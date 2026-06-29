// src/services/travelChecklistService.js
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 기본 체크리스트 템플릿
 */
const DEFAULT_CHECKLIST_TEMPLATE = [
  { id: `item_${Date.now()}_0`, title: '항공권 예약', order: 1, priority: 'high' },
  { id: `item_${Date.now()}_1`, title: '숙소 예약', order: 2, priority: 'high' },
  { id: `item_${Date.now()}_2`, title: '렌트카 예약', order: 3, priority: 'high' },
  { id: `item_${Date.now()}_3`, title: '비자 확인', order: 4, priority: 'high' },
  { id: `item_${Date.now()}_4`, title: '여행자보험', order: 5, priority: 'medium' },
  { id: `item_${Date.now()}_5`, title: '짐 준비', order: 6, priority: 'medium' },
  { id: `item_${Date.now()}_6`, title: '여권 확인', order: 7, priority: 'high' },
  { id: `item_${Date.now()}_7`, title: '환전하기', order: 8, priority: 'medium' },
];

/**
 * 체크리스트 생성 (기본 템플릿으로 초기화)
 */
export const createChecklist = async (tripId, coupleId) => {
  const tripRef = doc(db, 'trips', tripId);
  const checklistRef = doc(tripRef, 'checklists', 'main');

  const items = DEFAULT_CHECKLIST_TEMPLATE.map((item, index) => ({
    ...item,
    id: `item_${Date.now()}_${index}`,
    completed: false,
    completedBy: null,
    completedAt: null,
  }));

  const checklistData = {
    tripId,
    coupleId,
    items,
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
    createdAt: serverTimestamp(),
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
      completedAt: isCompleting ? serverTimestamp() : null,
    };
  });

  await updateDoc(checklistRef, {
    items: updatedItems,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 체크리스트 항목 수정
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
    return { ...item, ...updates };
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
