// src/services/recap/recapDates.js
// 요약 계산용 날짜 도우미 — 전부 로컬 날짜 문자열('YYYY-MM-DD') 기준(toISOString 금지 규칙).
import { getLocalDateStr } from '../../utils/dataUtils';

const pad = (n) => String(n).padStart(2, '0');

export const monthRange = (year, month) => {
  const last = new Date(year, month, 0).getDate(); // month: 1~12
  return { fromStr: `${year}-${pad(month)}-01`, toStr: `${year}-${pad(month)}-${pad(last)}`, days: last };
};

export const addMonths = (year, month, delta) => {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

export const dayDiff = (aStr, bStr) =>
  Math.round((new Date(`${bStr}T00:00:00`) - new Date(`${aStr}T00:00:00`)) / 86400000);

/** [fromStr, toStr]와 겹치는지(양끝 포함) */
export const overlaps = (startStr, endStr, fromStr, toStr) => startStr <= toStr && endStr >= fromStr;

/** 범위 안 날짜 문자열 목록 */
export const eachDay = (fromStr, toStr) => {
  const out = [];
  const d = new Date(`${fromStr}T00:00:00`);
  const end = new Date(`${toStr}T00:00:00`);
  while (d <= end) { out.push(getLocalDateStr(d)); d.setDate(d.getDate() + 1); }
  return out;
};

/** 연애 시작일 기준, 범위 안에 있는 100일 단위·주년 기념일 */
export const anniversariesInRange = (anniversaryDate, fromStr, toStr) => {
  if (!anniversaryDate) return [];
  const start = new Date(`${anniversaryDate}T00:00:00`);
  const out = [];
  // N일째 = 시작일 + (N-1)일 (홈 D+day 계산과 같은 기준)
  const firstN = Math.max(1, Math.ceil((dayDiff(anniversaryDate, fromStr) + 1) / 100)) * 100;
  for (let n = firstN; ; n += 100) {
    const d = new Date(start); d.setDate(d.getDate() + n - 1);
    const s = getLocalDateStr(d);
    if (s > toStr) break;
    if (s >= fromStr) out.push({ dateStr: s, label: `${n}일` });
  }
  const fromYear = Number(fromStr.slice(0, 4));
  const toYear = Number(toStr.slice(0, 4));
  for (let y = fromYear; y <= toYear; y++) {
    const k = y - start.getFullYear();
    if (k < 1) continue;
    const s = `${y}-${anniversaryDate.slice(5)}`;
    if (s >= fromStr && s <= toStr) out.push({ dateStr: s, label: `${k}주년` });
  }
  return out.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
};
