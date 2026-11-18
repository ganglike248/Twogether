# 우리 지도 경계 SVG 경로 만들기 — 결과: src/components/Map/data/sido.json, sgg/<시도코드>.json
# 1) 원본(행정동 GeoJSON, CC BY 4.0) 받기:
#    curl -L -o /tmp/dong.geojson https://raw.githubusercontent.com/vuski/admdongkor/master/ver20261001/HangJeongDong_ver20261001.geojson
# 2) python3 scripts/map/build_map_paths.py /tmp/dong.geojson
# 행정동을 이웃과 공유하는 선분 제거로 합치고(dissolve.py), 등장방형 투영 후 Douglas-Peucker로 줄임.
# 행정구역이 바뀌면 src/services/regions/koreaRegions.json도 같은 원본으로 다시 만들 것.
import json, os, subprocess, sys, tempfile
src = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, '../../src/components/Map/data')
os.makedirs(os.path.join(out, 'sgg'), exist_ok=True)
def run(dst, level, width, filt=None, eps='0.35'):
    tmp = tempfile.mktemp(suffix='.json')
    args = [sys.executable, '-I', os.path.join(here, 'dissolve.py'), src, tmp, level, str(width)]
    if filt: args += [filt, eps]
    subprocess.run(args, check=True)
    d = json.load(open(tmp)); os.remove(tmp)
    json.dump({'w': d['w'], 'h': d['h'], 'd': {k: v['d'] for k, v in d['regions'].items()}}, open(dst, 'w'), separators=(',', ':'))
run(os.path.join(out, 'sido.json'), 'sido', 330)
codes = sorted({f['properties']['sido'] for f in json.load(open(src))['features']})
for c in codes:
    run(os.path.join(out, 'sgg', f'{c}.json'), 'sgg', 330, c, '0.3')
