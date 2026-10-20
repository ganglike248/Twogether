// src/services/travelDecisionService.js
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';

// options 배열을 읽고-수정-쓰는 작업은 반드시 트랜잭션으로 — 그냥 getDoc → updateDoc으로 하면
// 두 사람이 거의 동시에 점수를 매기거나 옵션을 고칠 때 나중에 쓴 쪽이 먼저 쓴 쪽 변경을 통째로
// 덮어써 버림(2026-10-12 발견/수정). mutate(options)가 null을 반환하면 쓰기 없이 종료.
const mutateOptions = async (tripId, decisionId, mutate) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  await runTransaction(db, async (transaction) => {
    const decisionSnap = await transaction.get(decisionRef);
    if (!decisionSnap.exists()) {
      throw new Error('Decision not found');
    }
    const updatedOptions = mutate([...(decisionSnap.data().options || [])]);
    if (!updatedOptions) return;
    transaction.update(decisionRef, {
      options: updatedOptions,
      updatedAt: serverTimestamp(),
    });
  });
};


/**
 * 선택지(decision) 생성
 */
export const createDecision = async (tripId, decisionData) => {
  const tripRef = doc(db, 'trips', tripId);
  const decisionsRef = collection(tripRef, 'travelDecisions');

  const newDecision = {
    tripId,
    coupleId: decisionData.coupleId,
    category: decisionData.category || 'custom',
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
 * 특정 옵션에 점수 추가/수정 (의견은 선택사항)
 */
export const addScore = async (tripId, decisionId, optionId, userId, score, comment = '') => {
  await mutateOptions(tripId, decisionId, (options) => options.map(opt => {
    if (opt.id !== optionId) return opt;

    // 기존 점수 제거
    const updatedScores = (opt.scores || []).filter(s => s.userId !== userId);

    // 새 점수 추가 (0 이상일 때)
    if (score > 0) {
      updatedScores.push({
        userId,
        score,
        comment: comment.trim() || '',  // 의견 추가 (선택사항)
      });
    }

    // 총점 계산
    const totalScore = updatedScores.reduce((sum, s) => sum + s.score, 0);

    return {
      ...opt,
      scores: updatedScores,
      totalScore,
    };
  }));
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
 * 선택지 확정 취소 (다시 검토 중으로)
 */
export const undecideDecision = async (tripId, decisionId) => {
  const decisionRef = doc(db, 'trips', tripId, 'travelDecisions', decisionId);
  await updateDoc(decisionRef, {
    status: 'deciding',
    decidedOption: null,
    decidedAt: null,
    decidedBy: null,
    updatedAt: serverTimestamp(),
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
  const newOption = {
    id: optionData.id || `opt_${Date.now()}`,
    url: optionData.url,
    title: optionData.title,
    address: optionData.address || '',
    images: optionData.images || [],
    description: optionData.description || '',
    price: optionData.price || '',
    scores: [],
    totalScore: 0,
  };

  await mutateOptions(tripId, decisionId, (options) => [...options, newOption]);
};

/**
 * 옵션 수정
 */
export const updateOption = async (tripId, decisionId, optionId, updateData) => {
  // 넘어온 필드만 반영 — `||`로 폴백하면 빈 문자열(사용자가 URL/설명/가격을 지움)이 무시되고
  // 예전 값이 그대로 남는 버그가 있었음(2026-10-12 발견/수정). 제목은 모달에서 필수 검증됨.
  const pick = (key, fallback) => (updateData[key] !== undefined ? updateData[key] : fallback);
  await mutateOptions(tripId, decisionId, (options) => options.map(opt => {
    if (opt.id !== optionId) return opt;

    return {
      ...opt,
      title: updateData.title || opt.title,
      url: pick('url', opt.url),
      address: pick('address', opt.address || ''),
      description: pick('description', opt.description),
      price: pick('price', opt.price),
      images: pick('images', opt.images),
    };
  }));
};

/**
 * 옵션 삭제
 */
export const deleteOption = async (tripId, decisionId, optionId) => {
  await mutateOptions(tripId, decisionId, (options) => options.filter(opt => opt.id !== optionId));
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

  // 동점을 고려하여 rank 할당 (top 3까지만 반환)
  const withRank = [];
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    // rank가 3을 초과하면 중단
    if (rank > 3) break;

    // 이전 항목과 점수가 다르면 rank 업데이트
    if (i > 0 && sorted[i].totalScore < sorted[i - 1].totalScore) {
      rank = i + 1;
    }

    // rank가 3 이하인 항목만 추가
    if (rank <= 3) {
      withRank.push({
        ...sorted[i],
        rank,
      });
    }
  }

  return withRank;
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

/**
 * 사용자의 평가 의견 조회 (특정 옵션)
 */
export const getUserComment = (option, userId) => {
  if (!option || !option.scores) return '';

  const score = option.scores.find(s => s.userId === userId);
  return score ? (score.comment || '') : '';
};

/**
 * 옵션 내 이미지 순서 변경
 */
export const updateOptionImageOrder = async (tripId, decisionId, optionId, imageIndex, direction) => {
  await mutateOptions(tripId, decisionId, (options) => options.map(opt => {
    if (opt.id !== optionId) return opt;

    const images = [...(opt.images || [])];

    // 방향에 따라 인덱스 계산
    let newIndex = imageIndex;
    if (direction === 'up' && imageIndex > 0) {
      newIndex = imageIndex - 1;
    } else if (direction === 'down' && imageIndex < images.length - 1) {
      newIndex = imageIndex + 1;
    } else {
      // 순서 변경 불가
      return opt;
    }

    // 이미지 교환
    [images[imageIndex], images[newIndex]] = [images[newIndex], images[imageIndex]];

    return {
      ...opt,
      images,
    };
  }));
};

/**
 * 선택지 내 옵션 순서 변경
 */
export const reorderOptions = async (tripId, decisionId, optionIndex, direction) => {
  await mutateOptions(tripId, decisionId, (options) => {
    // 방향에 따라 인덱스 계산
    let newIndex = optionIndex;
    if (direction === 'up' && optionIndex > 0) {
      newIndex = optionIndex - 1;
    } else if (direction === 'down' && optionIndex < options.length - 1) {
      newIndex = optionIndex + 1;
    } else {
      // 순서 변경 불가
      return null;
    }

    // 옵션 교환
    [options[optionIndex], options[newIndex]] = [options[newIndex], options[optionIndex]];
    return options;
  });
};

/**
 * 옵션 즐겨찾기 토글
 */
export const toggleFavorite = async (tripId, decisionId, optionId) => {
  await mutateOptions(tripId, decisionId, (options) => options.map(opt => {
    if (opt.id !== optionId) return opt;

    return {
      ...opt,
      isFavorite: !opt.isFavorite,
    };
  }));
};

