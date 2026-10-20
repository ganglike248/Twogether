// src/components/Travel/Decisions/decisionViewUtils.js
// 선택 사항 탭의 보기 설정(필터·정렬)과 순위 계산 — Firebase 의존 없는 순수 함수만 둠
import { getTopOptions, hasUserScored } from '../../../services/travelDecisionService';
import { normalizeIfPureNumber } from '../../../utils/numberFormat';

export const TOPIC_SORTS = [
  { key: 'unscored', label: '평가 필요 많은 순' },
  { key: 'recent', label: '최근 추가순' },
  { key: 'name', label: '이름순' },
];

export const OPTION_SORTS = [
  { key: 'score', label: '점수순' },
  { key: 'unscoredFirst', label: '내가 평가 안 한 것 먼저' },
  { key: 'favoriteFirst', label: '즐겨찾기 먼저' },
  { key: 'priceAsc', label: '가격 낮은 순' },
  { key: 'recent', label: '최근 추가순' },
];

export const STATUS_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'deciding', label: '검토 중' },
  { key: 'decided', label: '확정' },
];

export const DEFAULT_VIEW = {
  topicIds: null, // null = 전체 카테고리(비교 주제)
  status: 'all',
  favoritesOnly: false,
  topicSort: 'unscored',
  optionSort: 'score',
};

export const getUnscoredCount = (decision, userId) =>
  (decision.options || []).filter(opt => !hasUserScored(opt, userId)).length;

// 순위: 총점 기준 경쟁 순위(동점 공유), 점수 있는 후보 중 3위까지만 — 기존 DecisionTopPick과 같은 규칙
// 후보가 하나뿐이면 순위가 의미 없어서 표시 안 함
export const getRankMap = (options) => {
  const map = {};
  if ((options || []).length < 2) return map;
  getTopOptions(options).forEach(opt => {
    if ((opt.totalScore || 0) > 0) map[opt.id] = opt.rank;
  });
  return map;
};

const createdAtMs = (decision) => decision.createdAt?.toMillis?.() ?? 0;

const priceNumber = (price) => {
  const n = Number(normalizeIfPureNumber(price));
  return Number.isFinite(n) && n > 0 ? n : Infinity; // 숫자가 아닌 가격/빈 값은 뒤로
};

export const sortOptions = (options, sortKey, userId) => {
  // 옵션에는 생성 시각 필드가 없어서 배열에 추가된 순서(뒤가 최신)를 기준으로 씀
  const indexed = (options || []).map((opt, index) => ({ opt, index }));
  const byScore = (a, b) => (b.opt.totalScore || 0) - (a.opt.totalScore || 0) || a.index - b.index;

  const comparators = {
    score: byScore,
    unscoredFirst: (a, b) => {
      const aDone = hasUserScored(a.opt, userId);
      const bDone = hasUserScored(b.opt, userId);
      return aDone === bDone ? byScore(a, b) : (aDone ? 1 : -1);
    },
    favoriteFirst: (a, b) => {
      const fa = !!a.opt.isFavorite;
      const fb = !!b.opt.isFavorite;
      return fa === fb ? byScore(a, b) : (fa ? -1 : 1);
    },
    priceAsc: (a, b) => priceNumber(a.opt.price) - priceNumber(b.opt.price) || byScore(a, b),
    recent: (a, b) => b.index - a.index,
  };

  return indexed.sort(comparators[sortKey] || byScore).map(({ opt }) => opt);
};

export const sortTopics = (decisions, sortKey, userId) => {
  const list = [...decisions];
  const comparators = {
    unscored: (a, b) => getUnscoredCount(b, userId) - getUnscoredCount(a, userId) || createdAtMs(b) - createdAtMs(a),
    recent: (a, b) => createdAtMs(b) - createdAtMs(a),
    name: (a, b) => (a.title || '').localeCompare(b.title || '', 'ko'),
  };
  return list.sort(comparators[sortKey] || comparators.unscored);
};

// 화면에 보일 주제 목록 — 검토 중이 위, 확정이 아래. 즐겨찾기만 보기일 때 남는 후보가 없는 주제는 숨김
export const buildVisibleTopics = (decisions, view, userId) => {
  const filtered = decisions.filter(d => {
    if (view.topicIds && !view.topicIds.includes(d.id)) return false;
    if (view.status !== 'all' && (d.status === 'decided' ? 'decided' : 'deciding') !== view.status) return false;
    return true;
  });

  const withOptions = sortTopics(filtered, view.topicSort, userId)
    .map(d => {
      const options = view.favoritesOnly ? (d.options || []).filter(o => o.isFavorite) : (d.options || []);
      return { decision: d, options: sortOptions(options, view.optionSort, userId) };
    })
    .filter(t => !view.favoritesOnly || t.options.length > 0);

  return [
    ...withOptions.filter(t => t.decision.status !== 'decided'),
    ...withOptions.filter(t => t.decision.status === 'decided'),
  ];
};

// "서연은" / "민준은" — 받침 유무로 은/는 선택(한글 아닌 이름은 은(는))
export const withTopicParticle = (name) => {
  const last = (name || '').charCodeAt((name || '').length - 1);
  if (!(last >= 0xac00 && last <= 0xd7a3)) return `${name}은(는)`;
  return `${name}${(last - 0xac00) % 28 ? '은' : '는'}`;
};
