import json, math, sys
from collections import defaultdict
src, outp, level, width = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
filt = sys.argv[5] if len(sys.argv) > 5 else None   # 예: 시도코드 '11'이면 그 시도만
fc = json.load(open(src))
groups = defaultdict(list); names = {}
for f in fc['features']:
    p = f['properties']
    if filt and p['sido'] != filt: continue
    key = p['sido'] if level == 'sido' else p['sgg']
    names[key] = p['sidonm'] if level == 'sido' else p['sggnm']
    g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        for ring in poly:
            groups[key].append([tuple(pt) for pt in ring])
# 경계 병합: 두 번 나오는 선분(이웃 동과 공유)은 내부선 → 제거
def dissolve(rings):
    cnt = defaultdict(int); seg = []
    for r in rings:
        for a, b in zip(r, r[1:]):
            if a == b: continue
            k = (a, b) if a < b else (b, a)
            cnt[k] += 1; seg.append((a, b))
    nxt = defaultdict(list)
    for a, b in seg:
        k = (a, b) if a < b else (b, a)
        if cnt[k] == 1: nxt[a].append(b)
    out = []
    while nxt:
        start = next(iter(nxt)); ring = [start]; cur = start
        while True:
            lst = nxt.get(cur)
            if not lst: break
            n = lst.pop()
            if not lst: del nxt[cur]
            ring.append(n); cur = n
            if n == start: break
        if len(ring) > 3: out.append(ring)
    return out
# 투영(위도 36도 기준 등장방형) → 화면 좌표
allpts = [pt for rs in groups.values() for r in rs for pt in r]
lon0, lat0 = 127.5, 36.0
k = math.cos(math.radians(lat0))
xs = [(x - lon0) * k for x, y in allpts]; ys = [-(y - lat0) for x, y in allpts]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
sc = width / (maxx - minx); height = (maxy - miny) * sc
proj = lambda p: (((p[0] - lon0) * k - minx) * sc, (-(p[1] - lat0) - miny) * sc)
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dmax, idx = 0, 0
    ax, ay = a; bx, by = b; L = math.hypot(bx - ax, by - ay) or 1e-9
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [a, b]
def area(r): return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(r, r[1:]))) / 2
eps = float(sys.argv[6]) if len(sys.argv) > 6 else 0.35
res = {}
for key, rings in groups.items():
    paths = []
    for r in dissolve(rings):
        pr = [proj(p) for p in r]
        if area(pr) < 0.6: continue  # 화면에서 안 보이는 작은 섬
        half = len(pr) // 2
        s = dp(pr[:half + 1], eps)[:-1] + dp(pr[half:], eps)
        if len(s) < 4: continue
        paths.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in s[:-1]) + 'Z')
    res[key] = {'name': names[key], 'd': ''.join(paths)}
json.dump({'w': width, 'h': round(height, 1), 'regions': res}, open(outp, 'w'), ensure_ascii=False)
print(level, len(res), 'h=', round(height), 'bytes', sum(len(v['d']) for v in res.values()))
