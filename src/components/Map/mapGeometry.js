// src/components/Map/mapGeometry.js
// 미리 계산한 SVG 경로(data/*.json) 계산 도우미 — 지도 부품 3곳(KoreaMap·TripMiniMap·MiniKorea)이 같이 씀(AUDIT Q-3)

/** 이름표 위치: 가장 큰 고리(본토)의 꼭짓점 평균 — 섬 때문에 중심이 바다로 가지 않게 */
export const labelPoint = (d) => {
  let best = null;
  d.split('Z').filter(r => r.startsWith('M')).forEach(ring => {
    const pts = ring.slice(1).split('L').map(p => p.split(',').map(Number));
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (!best || area > best.area) best = { area, x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
  });
  return best || { x: 0, y: 0 };
};

/** 경로 문자열들 전체를 감싸는 범위 */
export const bounds = (ds) => {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  ds.forEach(d => {
    const nums = d.match(/-?\d+(\.\d+)?/g) || [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = +nums[i]; const y = +nums[i + 1];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  });
  return { x0, y0, x1, y1 };
};
