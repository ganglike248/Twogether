// src/components/Map/MapPage.jsx
// /map — 시·도 지도, /map/:sido — 그 시·도의 시·군·구 지도. 간 곳을 누르면 들어가고, 안 간 곳은 [여기로 여행 계획하기].
// 칠하는 기준은 여행의 regions(trips.regions)이며 이미 시작한 여행만(mapStats).
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { HiChevronRight } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTrips } from '../../hooks/useTrip';
import { MenuPageHeader } from '../common/MenuPage';
import ConfirmModal from '../common/ConfirmModal';
import KoreaMap from './KoreaMap';
import { computeMapStats } from './mapStats';
import { SIDO_LIST, SIDO_BY_CODE, SGG_BY_CODE, REGION_SOURCE, groupRegions } from '../../services/regions/regionData';
import sidoData from './data/sido.json';
import '../common/MenuPage.css';
import './MapPage.css';

const loadSgg = (code) => import(`./data/sgg/${code}.json`).then(m => m.default || m);
const md = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };

const MapLegend = () => (
  <div className="map-legend" aria-hidden="true">
    <span><i className="un" />아직</span><span><i className="l1" />1번</span><span><i className="l2" />2번</span><span><i className="l3" />3번+</span>
  </div>
);

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sido } = useParams();
  const { coupleId } = useAuthContext();
  const { trips, loading } = useTrips(coupleId);
  const [sggData, setSggData] = useState(null);
  const [pick, setPick] = useState(null); // 안 간 곳 { code, name, regions }
  const [selectedSgg, setSelectedSgg] = useState(null);
  const sparkCodes = location.state?.spark || []; // 여행 끝 기록에서 처음 칠한 시·군·구

  const stats = useMemo(() => computeMapStats(trips), [trips]);
  const sidoInfo = sido ? SIDO_BY_CODE[sido] : null;

  useEffect(() => {
    if (!sidoInfo) { setSggData(null); return; }
    let alive = true;
    setSggData(null);
    setSelectedSgg(null);
    loadSgg(sido).then(d => alive && setSggData(d)).catch(() => alive && setSggData({ w: 1, h: 1, d: {} }));
    return () => { alive = false; };
  }, [sido, sidoInfo]);

  const back = () => {
    if (location.key === 'default') navigate(sido ? '/map' : '/travel', { replace: true });
    else navigate(-1);
  };

  const planHere = () => {
    const regions = pick.regions;
    setPick(null);
    navigate('/travel?modal=trip', { state: { modal: true, prefillRegions: regions } });
  };

  // ── 시·도 지도 ──
  if (!sido) {
    const visitedSido = SIDO_LIST.filter(s => stats.sidoCounts[s.code]).sort((a, b) => stats.sidoCounts[b.code] - stats.sidoCounts[a.code]);
    return (
      <div className="menu-page map-page">
        <MenuPageHeader title="우리 지도" onBack={back} />
        <div className="map-big"><b>{visitedSido.length}곳</b><span>{SIDO_LIST.length}개 시·도 중 함께 가 본 곳 · 여행 {stats.visited.length}번</span></div>
        <div className="map-paper">
          <KoreaMap
            data={sidoData}
            counts={stats.sidoCounts}
            nameOf={(code, short) => (short ? SIDO_BY_CODE[code]?.short : SIDO_BY_CODE[code]?.name) || ''}
            ariaLabel={`함께 가 본 시·도 ${visitedSido.length}곳`}
            onSelect={(code) => {
              if (stats.sidoCounts[code]) navigate(`/map/${code}`);
              else setPick({ code, name: SIDO_BY_CODE[code].short, regions: [{ sido: code }] });
            }}
          />
          <MapLegend />
          <p className="map-credit">지도: {REGION_SOURCE}</p>
        </div>

        {!loading && stats.unregioned.length > 0 && (
          <div className="map-cleanup">
            <p className="map-cleanup-t">지역을 고르면 지도에 칠해지는 지난 여행 {stats.unregioned.length}개</p>
            {stats.unregioned.slice(0, 5).map(t => (
              <button key={t.id} type="button" className="map-row" onClick={() => navigate(`/travel/${t.id}`, { state: { editTrip: true } })}>
                <span className="map-row-tx"><b>{t.title}</b><span>{t.destination} · 지역 고르기</span></span>
                <HiChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        {visitedSido.length > 0 && <p className="map-section">자주 간 곳</p>}
        {visitedSido.map(s => {
          const places = groupRegions(stats.tripsBySido[s.code].flatMap(t => (t.regions || []).filter(r => r.sido === s.code)))
            .filter(g => g.codes.length).map(g => g.label);
          return (
            <button key={s.code} type="button" className="map-row" onClick={() => navigate(`/map/${s.code}`)}>
              <span className="map-row-n">{s.short}</span>
              <span className="map-row-tx"><b>{[...new Set(places)].slice(0, 3).join(' · ') || s.name}</b><span>여행 {stats.sidoCounts[s.code]}번 · 마지막 {md(stats.dateStr(stats.tripsBySido[s.code][0].startDate))}</span></span>
              <HiChevronRight aria-hidden="true" />
            </button>
          );
        })}
        {!loading && stats.visited.length === 0 && stats.unregioned.length === 0 && (
          <p className="map-empty">아직 칠한 곳이 없어요. 여행을 만들 때 지역을 고르면 여기에 칠해져요.</p>
        )}

        <ConfirmModal
          isOpen={!!pick}
          title={pick?.name || ''}
          message="아직 함께 안 가 본 곳이에요. 여기로 여행을 계획해 볼까요?"
          confirmText="여기로 여행 계획하기"
          cancelText="닫기"
          danger={false}
          onConfirm={planHere}
          onCancel={() => setPick(null)}
        />
      </div>
    );
  }

  // ── 시·군·구 지도 ──
  if (!sidoInfo) return <div className="menu-page map-page"><MenuPageHeader title="우리 지도" onBack={back} /><p className="map-empty">없는 지역이에요.</p></div>;
  const sidoTrips = stats.tripsBySido[sido] || [];
  const sggCodes = sggData ? Object.keys(sggData.d) : [];
  const visitedSgg = sggCodes.filter(c => stats.sggCounts[c]);
  const listTrips = selectedSgg ? sidoTrips.filter(t => (t.regions || []).some(r => r.sgg === selectedSgg)) : sidoTrips;
  const sggName = (code, short) => {
    const s = SGG_BY_CODE[code];
    if (!s) return '';
    return short ? (s.gu || s.city) : s.name;
  };

  return (
    <div className="menu-page map-page">
      <MenuPageHeader title={sidoInfo.short} onBack={back} />
      <div className="map-big"><b>{visitedSgg.length}곳</b><span>{sggCodes.length ? `${sggCodes.length}개 시·군·구 중 함께 가 본 곳` : '불러오는 중…'}</span></div>
      {sparkCodes.length > 0 && (
        <p className="map-spark-toast" role="status">새로 칠해진 곳 · {[...new Set(sparkCodes.map(c => SGG_BY_CODE[c]?.city))].join(', ')}</p>
      )}
      <div className="map-paper">
        {sggData && (
          <KoreaMap
            data={sggData}
            counts={stats.sggCounts}
            nameOf={sggName}
            labelSize={sggCodes.length > 20 ? 7 : 8}
            sparkCodes={sparkCodes}
            ariaLabel={`${sidoInfo.short}에서 함께 가 본 곳 ${visitedSgg.length}곳`}
            onSelect={(code) => {
              if (stats.sggCounts[code]) setSelectedSgg(prev => (prev === code ? null : code));
              else setPick({ code, name: SGG_BY_CODE[code]?.name || '', regions: [{ sido, sgg: code }] });
            }}
          />
        )}
        <MapLegend />
        <p className="map-credit">지도: {REGION_SOURCE}</p>
      </div>

      <p className="map-section">
        {selectedSgg ? `${SGG_BY_CODE[selectedSgg]?.name}에서 함께한 여행` : `${sidoInfo.short}에서 함께한 여행`}
        {selectedSgg && <button type="button" className="map-reset" onClick={() => setSelectedSgg(null)}>전체 보기</button>}
      </p>
      {listTrips.map(t => {
        const places = groupRegions((t.regions || []).filter(r => r.sido === sido)).filter(g => g.codes.length).map(g => g.label);
        return (
          <button key={t.id} type="button" className="map-row" onClick={() => navigate(`/travel/${t.id}`)}>
            <span className="map-row-n">{Number(stats.dateStr(t.startDate).slice(5, 7))}월</span>
            <span className="map-row-tx"><b>{t.title}</b><span>{places.join(' · ') || sidoInfo.short} · {md(stats.dateStr(t.startDate))}</span></span>
            <HiChevronRight aria-hidden="true" />
          </button>
        );
      })}
      {listTrips.length === 0 && <p className="map-empty">아직 이 지역의 여행이 없어요.</p>}

      <ConfirmModal
        isOpen={!!pick}
        title={pick?.name || ''}
        message="아직 함께 안 가 본 곳이에요. 여기로 여행을 계획해 볼까요?"
        confirmText="여기로 여행 계획하기"
        cancelText="닫기"
        danger={false}
        onConfirm={planHere}
        onCancel={() => setPick(null)}
      />
    </div>
  );
};

export default MapPage;
