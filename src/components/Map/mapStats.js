// src/components/Map/mapStats.js
// 우리 지도 집계(순수 함수) — 이미 시작한 여행만 칠함(앞으로 갈 여행은 '예정'으로만 셈).
// 한 여행이 같은 시·도/시·군·구를 여러 번 가져도 1번으로 셈.
import { convertToDate, getLocalDateStr } from '../../utils/dataUtils';
import { mergeRegions } from '../../services/regions/regionData';

const dateStr = (v) => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  const d = convertToDate(v);
  return d ? getLocalDateStr(d) : '';
};

export const computeMapStats = (trips = [], today = new Date()) => {
  const todayStr = getLocalDateStr(today);
  const sidoCounts = {};
  const sggCounts = {};
  const tripsBySido = {};
  const visited = [];
  const upcoming = [];
  const unregioned = [];
  trips.forEach(t => {
    const start = dateStr(t.startDate);
    const regions = mergeRegions(t.regions || []);
    if (!regions.length) { if (start && start <= todayStr) unregioned.push(t); return; }
    if (!start || start > todayStr) { upcoming.push(t); return; }
    visited.push(t);
    new Set(regions.map(r => r.sido)).forEach(code => {
      sidoCounts[code] = (sidoCounts[code] || 0) + 1;
      (tripsBySido[code] = tripsBySido[code] || []).push(t);
    });
    new Set(regions.filter(r => r.sgg).map(r => r.sgg)).forEach(code => { sggCounts[code] = (sggCounts[code] || 0) + 1; });
  });
  Object.values(tripsBySido).forEach(list => list.sort((a, b) => dateStr(b.startDate).localeCompare(dateStr(a.startDate))));
  return { sidoCounts, sggCounts, tripsBySido, visited, upcoming, unregioned, dateStr };
};

export const level = (n) => (n >= 3 ? 3 : n || 0);
