import { describe, it, expect } from 'vitest';
import { matchRegions, suggestRegionsFromSchedules } from './regionMatch';
import { describeRegions, mergeRegions, tripPlaceName } from './regionData';

const d = (t, opt) => describeRegions(matchRegions(t, opt));

describe('matchRegions — 글자에서 지역 찾기', () => {
  it.each([
    ['속초 바다 여행', '강원 · 속초시'],
    ['강원도 일주', '강원'],
    ['부산 해운대', '부산 · 해운대구'],
    ['서울특별시 서초구 강남대로 123', '서울 · 서초구'], // 도로명(강남대로)이 강남구로 잡히지 않음
    ['경기도 수원시 영통구 광교로 1', '경기 · 수원시'],
    ['강원 고성', '강원 · 고성군'],
    ['부산 중구 남포동', '부산 · 중구'],
    ['광주 동구 충장로', '전남광주 · 광주 동구'],
    ['광주 비엔날레', '전남광주'],
    ['경기 광주 곤지암', '경기 · 광주시'],
    ['세종', '세종 · 세종시'],
  ])('%s → %s', (text, expected) => {
    expect(d(text)).toBe(expected);
  });

  it.each([['고성 통일전망대'], ['중구 맛집'], ['성수 팝업']])('애매하거나 없는 이름은 안 잡음: %s', (text) => {
    expect(matchRegions(text)).toEqual([]);
  });

  it('주소만 모드: 장소 이름은 무시, 주소는 잡음', () => {
    expect(matchRegions('스타벅스 강남역점', { addressOnly: true })).toEqual([]);
    expect(d('강원특별자치도 속초시 중앙로', { addressOnly: true })).toBe('강원 · 속초시');
  });
});

describe('mergeRegions / tripPlaceName', () => {
  it('시·군·구가 있으면 같은 시·도의 시·도만 항목은 빠짐', () => {
    expect(mergeRegions([{ sido: '51' }], [{ sido: '51', sgg: '51210' }])).toEqual([{ sido: '51', sgg: '51210' }]);
  });
  it('여행지를 비우면 지역 이름으로', () => {
    expect(tripPlaceName({ destination: '', regions: [{ sido: '51', sgg: '51210' }] })).toBe('속초시');
    expect(tripPlaceName({ destination: ' 제주 동쪽 ', regions: [] })).toBe('제주 동쪽');
  });
});

describe('suggestRegionsFromSchedules — 일정에서 찾은 곳', () => {
  it('이미 있는 지역은 빼고 추천', () => {
    const docs = [{ schedules: [{ title: '양양 서피비치' }, { title: '속초 중앙시장' }] }];
    expect(describeRegions(suggestRegionsFromSchedules(docs, [{ sido: '51', sgg: '51210' }]))).toBe('강원 · 양양군');
  });
});
