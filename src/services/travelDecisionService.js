// src/services/travelDecisionService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 선택지(decision) 생성
 */
export const createDecision = async (tripId, decisionData) => {
  const tripRef = doc(db, 'trips', tripId);
  const decisionsRef = collection(tripRef, 'travelDecisions');

  const newDecision = {
    tripId,
    coupleId: decisionData.coupleId,
    category: decisionData.category,
    title: decisionData.title,
    description: decisionData.description || '',
    options: decisionData.options || [],
    status: 'deciding',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(decisionsRef, newDecision);
  return { id: docRef.id, ...newDecision };
};

/**
 * 선택지 수정
 */
export const updateDecision = async (tripId, decisionId, updates) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  await updateDoc(decisionRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 선택지 삭제
 */
export const deleteDecision = async (tripId, decisionId) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  await deleteDoc(decisionRef);
};

/**
 * 특정 옵션에 점수 추가/수정
 */
export const addScore = async (tripId, decisionId, optionId, userId, score) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  const decisionSnap = await getDoc(decisionRef);

  if (!decisionSnap.exists()) {
    throw new Error('Decision not found');
  }

  const decision = decisionSnap.data();
  const updatedOptions = (decision.options || []).map(opt => {
    if (opt.id !== optionId) return opt;

    // 기존 점수 제거
    const updatedScores = (opt.scores || []).filter(s => s.userId !== userId);

    // 새 점수 추가 (0 이상일 때)
    if (score > 0) {
      updatedScores.push({
        userId,
        score,
      });
    }

    // 총점 계산
    const totalScore = updatedScores.reduce((sum, s) => sum + s.score, 0);

    return {
      ...opt,
      scores: updatedScores,
      totalScore,
    };
  });

  await updateDoc(decisionRef, {
    options: updatedOptions,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 선택지 확정
 */
export const decideOption = async (tripId, decisionId, optionId, userId) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  await updateDoc(decisionRef, {
    status: 'decided',
    decidedOption: optionId,
    decidedAt: serverTimestamp(),
    decidedBy: userId,
  });
};

/**
 * 선택지 목록 실시간 구독
 */
export const subscribeToDecisions = (tripId, callback) => {
  const tripRef = doc(db, 'trips', tripId);
  const decisionsRef = collection(tripRef, 'travelDecisions');
  const q = query(decisionsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (querySnapshot) => {
    const decisions = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));
    callback(decisions);
  });
};

/**
 * 옵션 추가 (선택지 내에)
 */
export const addOption = async (tripId, decisionId, optionData) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  const decisionSnap = await getDoc(decisionRef);

  if (!decisionSnap.exists()) {
    throw new Error('Decision not found');
  }

  const newOption = {
    id: optionData.id || `opt_${Date.now()}`,
    url: optionData.url,
    title: optionData.title,
    image: optionData.image || '',
    description: optionData.description || '',
    price: optionData.price || '',
    scores: [],
    totalScore: 0,
  };

  const updatedOptions = [...(decisionSnap.data().options || []), newOption];

  await updateDoc(decisionRef, {
    options: updatedOptions,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 옵션 수정
 */
export const updateOption = async (tripId, decisionId, optionId, updateData) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  const decisionSnap = await getDoc(decisionRef);

  if (!decisionSnap.exists()) {
    throw new Error('Decision not found');
  }

  const updatedOptions = decisionSnap.data().options.map(opt => {
    if (opt.id !== optionId) return opt;

    return {
      ...opt,
      title: updateData.title || opt.title,
      url: updateData.url || opt.url,
      description: updateData.description || opt.description,
      price: updateData.price || opt.price,
      image: updateData.image || opt.image,
    };
  });

  await updateDoc(decisionRef, {
    options: updatedOptions,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 옵션 삭제
 */
export const deleteOption = async (tripId, decisionId, optionId) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  const decisionSnap = await getDoc(decisionRef);

  if (!decisionSnap.exists()) {
    throw new Error('Decision not found');
  }

  const updatedOptions = decisionSnap.data().options.filter(opt => opt.id !== optionId);

  await updateDoc(decisionRef, {
    options: updatedOptions,
    updatedAt: serverTimestamp(),
  });
};

/**
 * 총점으로 정렬 (높은 순)
 */
export const sortByTotalScore = (options) => {
  if (!options || !Array.isArray(options)) return [];

  return [...options].sort((a, b) => {
    const scoreA = a.totalScore || 0;
    const scoreB = b.totalScore || 0;
    return scoreB - scoreA;
  });
};

/**
 * 자신의 점수 여부로 정렬 (미입력 먼저, 같으면 점수순)
 */
export const sortByUserScore = (options, userId) => {
  if (!options || !Array.isArray(options)) return [];

  return [...options].sort((a, b) => {
    const aHasScore = (a.scores || []).some(s => s.userId === userId);
    const bHasScore = (b.scores || []).some(s => s.userId === userId);

    // 자신이 점수 매기지 않은 것 먼저 (false < true)
    if (aHasScore !== bHasScore) {
      return aHasScore ? 1 : -1;
    }

    // 같으면 총점으로 정렬 (높은 점수 먼저)
    const scoreA = a.totalScore || 0;
    const scoreB = b.totalScore || 0;
    return scoreB - scoreA;
  });
};

/**
 * 최고 점수 옵션 찾기 (동점이면 여러 개)
 */
export const getTopOptions = (options) => {
  if (!options || !Array.isArray(options) || options.length === 0) return [];

  const sorted = sortByTotalScore(options);
  const maxScore = sorted[0].totalScore || 0;

  return sorted.filter(opt => (opt.totalScore || 0) === maxScore);
};

/**
 * 사용자의 점수 조회 (특정 옵션)
 */
export const getUserScore = (option, userId) => {
  if (!option || !option.scores) return null;

  const score = option.scores.find(s => s.userId === userId);
  return score ? score.score : null;
};

/**
 * 사용자가 점수를 매겼는지 확인
 */
export const hasUserScored = (option, userId) => {
  return getUserScore(option, userId) !== null;
};

