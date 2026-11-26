// src/components/Map/MapPage.jsx
// /map — 시·도 지도, /map/:sido — 그 시·도의 시·군·구 지도. 지역을 누르면 아래에서 시트가 올라와(지도 위를 덮지 않음)
// 다른 지역을 계속 눌러 보며 고를 수 있음: 간 곳은 여행 목록 + [시·군·구 보기], 안 간 곳은 [여기로 여행 계획하기].
// 칠하는 기준은 여행의 regions(trips.regions)이며 이미 시작한 여행만(mapStats).
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { HiChevronRight, HiXMark } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTrips } from '../../hooks/useTrip';
import { MenuPageHeader } from '../common/MenuPage';
import KoreaMap from './KoreaMap';
import { computeMapStats } from './mapStats';
import { SIDO_LIST, SIDO_BY_CODE, SGG_BY_CODE, REGION_SOURCE, groupRegions } from '../../services/regions/regionData';
import sidoData from './data/sido.json';
import '../common/MenuPage.css';
import './MapPage.css';
import { formatMonthDay as md } from '../../utils/dateFormat';

const loadSgg = (code) => import(`./data/sgg/${code}.json`).then(m => m.default || m);
// 여행 기록 한 줄(지역 여행 목록) — 둘 중 먼저 찾은 기록의 첫 줄 앞부분
const quoteOf = (t) => {
  const text = Object.values(t.review || {}).map(r => (r?.text || '').trim()).find(Boolean);
  if (!text) return '';
  const line = text.split('\n')[0];
  return line.length > 32 ? `${line.slice(0, 32)}…` : line;
};

// 상단 요약(시안 '다듬기 B') — 함께 가 본 곳 N/전체 · 여행 수 + 진행 막대 + 한 줄 정보
const MapSummary = ({ done, total, trips, meta }) => (
  <div className="map-summary">
    <div className="map-summary-top">
      <b>함께 가 본 곳 <em>{done}</em>/{total || '–'}</b>
      <span>여행 {trips}번</span>
    </div>
    <div className="map-summary-bar" aria-hidden="true"><i style={{ width: total ? `${Math.round((done / total) * 100)}%` : 0 }} /></div>
    {meta && <p className="map-summary-meta">{meta}</p>}
  </div>
);

const MapLegend = () => (
  <div className="map-legend" aria-hidden="true">
    <span><i className="un" />아직</span><span><i className="l1" />1번</span><span><i className="l2" />2번</span><span><i className="l3" />3번+</span>
  </div>
);

const TripRow = ({ trip, places, dateStr, onClick }) => (
  <button type="button" className="map-row" onClick={onClick}>
    <span className="map-row-n">{Number(dateStr(trip.startDate).slice(5, 7))}월</span>
    <span className="map-row-tx">
      <b>{trip.title}</b>
      <span>{places ? `${places} · ` : ''}{md(dateStr(trip.startDate))}</span>
      {quoteOf(trip) && <span className="map-quote">“{quoteOf(trip)}”</span>}
    </span>
    <HiChevronRight aria-hidden="true" />
  </button>
);

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sido } = useParams();
  const { coupleId } = useAuthContext();
  const { trips, loading } = useTrips(coupleId);
  const [sggLoaded, setSggLoaded] = useState({ code: null, data: null }); // 불러온 시·도 경계(지금 시·도 것만 씀)
  const [sheet, setSheet] = useState({ page: null, code: null }); // 아래 시트에 연 지역 — 다른 화면으로 가면 자동으로 닫힘
  const sparkCodes = location.state?.spark || []; // 여행 끝 기록에서 처음 칠한 시·군·구

  const stats = useMemo(() => computeMapStats(trips), [trips]);
  const sidoInfo = sido ? SIDO_BY_CODE[sido] : null;
  const page = sido || 'all';
  const sggData = sggLoaded.code === sido ? sggLoaded.data : null;
  const openCode = sheet.page === page ? sheet.code : null;
  const openSheet = (code) => setSheet(prev => (prev.page === page && prev.code === code ? { page: null, code: null } : { page, code }));
  const closeSheet = () => setSheet({ page: null, code: null });

  useEffect(() => {
    if (!sidoInfo) return undefined;
    let alive = true;
    loadSgg(sido)
      .then(d => alive && setSggLoaded({ code: sido, data: d }))
      .catch(() => alive && setSggLoaded({ code: sido, data: { w: 1, h: 1, d: {} } }));
    return () => { alive = false; };
  }, [sido, sidoInfo]);

  const back = () => {
    if (location.key === 'default') navigate(sido ? '/map' : '/travel', { replace: true });
    else navigate(-1);
  };
  const planHere = (regions) => navigate('/travel?modal=trip', { state: { modal: true, prefillRegions: regions } });
  const placesIn = (t, sidoCode) => groupRegions((t.regions || []).filter(r => r.sido === sidoCode)).filter(g => g.codes.length).map(g => g.label).join(' · ');

  // ── 아래 시트 내용 ──
  const renderSheet = () => {
    if (!openCode) return null;
    let title; let tripsHere; let regions; let extra = null;
    if (!sido) {
      const s = SIDO_BY_CODE[openCode];
      title = s?.name || '';
      tripsHere = stats.tripsBySido[openCode] || [];
      regions = [{ sido: openCode }];
      if (tripsHere.length) extra = <button type="button" className="map-sheet-btn primary" onClick={() => navigate(`/map/${openCode}`)}>시·군·구 보기</button>;
    } else {
      const g = SGG_BY_CODE[openCode];
      title = g?.name || '';
      tripsHere = (stats.tripsBySido[sido] || []).filter(t => (t.regions || []).some(r => r.sgg === openCode));
      regions = [{ sido, sgg: openCode }];
    }
    const n = tripsHere.length;
    return (
      <div className="map-sheet" role="region" aria-label={`${title} 정보`}>
        <div className="map-sheet-handle" aria-hidden="true" />
        <div className="map-sheet-head">
          <div>
            <h2 className="map-sheet-title">{title}</h2>
            <p className="map-sheet-sub">{n ? `함께한 여행 ${n}번 · 마지막 ${md(stats.dateStr(tripsHere[0].startDate))}` : '아직 함께 안 가 본 곳이에요'}</p>
          </div>
          <button type="button" className="map-sheet-close" onClick={closeSheet} aria-label="닫기"><HiXMark /></button>
        </div>
        {n > 0 && (
          <div className="map-sheet-list">
            {tripsHere.slice(0, 3).map(t => (
              <TripRow key={t.id} trip={t} places={sido ? '' : placesIn(t, openCode)} dateStr={stats.dateStr} onClick={() => navigate(`/travel/${t.id}`)} />
            ))}
            {n > 3 && <p className="map-sheet-more">외 {n - 3}개 여행</p>}
          </div>
        )}
        <div className="map-sheet-actions">
          {extra}
          <button type="button" className={`map-sheet-btn${n ? '' : ' primary'}`} onClick={() => planHere(regions)}>
            {n ? '여기로 또 가기' : '여기로 여행 계획하기'}
          </button>
        </div>
      </div>
    );
  };

  // ── 시·도 지도 ──
  if (!sido) {
    const visitedSido = SIDO_LIST.filter(s => stats.sidoCounts[s.code]).sort((a, b) => stats.sidoCounts[b.code] - stats.sidoCounts[a.code]);
    const latestTrip = [...stats.visited].sort((a, b) => stats.dateStr(b.startDate).localeCompare(stats.dateStr(a.startDate)))[0];
    const latest = latestTrip ? { trip: latestTrip, sido: (latestTrip.regions || [])[0]?.sido } : null;
    return (
      <div className={`menu-page map-page${openCode ? ' sheet-open' : ''}`}>
        <MenuPageHeader title="우리 지도" onBack={back} />
        <MapSummary
          done={visitedSido.length}
          total={SIDO_LIST.length}
          trips={stats.visited.length}
          meta={latest ? `시·군·구 ${Object.keys(stats.sggCounts).length}곳 · 가장 최근 ${SIDO_BY_CODE[latest.sido]?.short || ''}(${md(stats.dateStr(latest.trip.startDate))})` : '여행 지역을 고르면 여기에 칠해져요'}
        />
        <div className="map-paper">
          <KoreaMap
            data={sidoData}
            counts={stats.sidoCounts}
            nameOf={(code, short) => (short ? SIDO_BY_CODE[code]?.short : SIDO_BY_CODE[code]?.name) || ''}
            ariaLabel={`함께 가 본 시·도 ${visitedSido.length}곳`}
            labelSize={8}
            selected={openCode}
            onSelect={openSheet}
          />
          <p className="map-hint">지역을 누르면 자세히 볼 수 있어요 · 두 손가락으로 확대</p>
          <MapLegend />
          <p className="map-credit">지도: {REGION_SOURCE}</p>
        </div>

        {!loading && stats.unregioned.length > 0 && (
          <section className="map-block map-cleanup">
            <p className="map-section">지역을 골라 주세요 <span>{stats.unregioned.length}개</span></p>
            <p className="map-cleanup-t">고르면 지도에 칠해지는 지난 여행이에요</p>
            <div className="map-list">
            {stats.unregioned.slice(0, 5).map(t => (
              <button key={t.id} type="button" className="map-row" onClick={() => navigate(`/travel/${t.id}`, { state: { editTrip: true } })}>
                <span className="map-row-tx"><b>{t.title}</b><span>{t.destination} · 지역 고르기</span></span>
                <HiChevronRight aria-hidden="true" />
              </button>
            ))}
            </div>
          </section>
        )}

        {visitedSido.length > 0 && (
          <section className="map-block">
            <p className="map-section">자주 간 곳 <span>{visitedSido.length}곳</span></p>
            <div className="map-list">
        {visitedSido.map(s => {
          const places = [...new Set(stats.tripsBySido[s.code].flatMap(t => placesIn(t, s.code).split(' · ')).filter(Boolean))];
          return (
            <button key={s.code} type="button" className="map-row" onClick={() => navigate(`/map/${s.code}`)}>
              <span className="map-row-n">{s.short}</span>
              <span className="map-row-tx"><b>{places.slice(0, 3).join(' · ') || s.name}</b><span>여행 {stats.sidoCounts[s.code]}번 · 마지막 {md(stats.dateStr(stats.tripsBySido[s.code][0].startDate))}</span></span>
              <HiChevronRight aria-hidden="true" />
            </button>
          );
        })}
            </div>
          </section>
        )}
        {!loading && stats.visited.length === 0 && stats.unregioned.length === 0 && (
          <p className="map-empty">아직 칠한 곳이 없어요. 여행을 만들 때 지역을 고르면 여기에 칠해져요.</p>
        )}
        {renderSheet()}
      </div>
    );
  }

  // ── 시·군·구 지도 ──
  if (!sidoInfo) return <div className="menu-page map-page"><MenuPageHeader title="우리 지도" onBack={back} /><p className="map-empty">없는 지역이에요.</p></div>;
  const sidoTrips = stats.tripsBySido[sido] || [];
  const sggCodes = sggData ? Object.keys(sggData.d) : [];
  const visitedSgg = sggCodes.filter(c => stats.sggCounts[c]);
  const sggName = (code, short) => {
    const s = SGG_BY_CODE[code];
    if (!s) return '';
    return short ? (s.gu || s.city) : s.name;
  };

  return (
    <div className={`menu-page map-page${openCode ? ' sheet-open' : ''}`}>
      <MenuPageHeader title={sidoInfo.short} onBack={back} />
      <MapSummary
        done={visitedSgg.length}
        total={sggCodes.length}
        trips={sidoTrips.length}
        meta={sidoTrips[0] ? `가장 최근 ${sidoTrips[0].title}(${md(stats.dateStr(sidoTrips[0].startDate))})` : `${sidoInfo.short}에서는 아직 함께한 여행이 없어요`}
      />
      {sparkCodes.length > 0 && (
        <p className="map-spark-toast" role="status">새로 칠해진 곳 · {[...new Set(sparkCodes.map(c => SGG_BY_CODE[c]?.city))].join(', ')}</p>
      )}
      <div className="map-paper">
        {sggData && (
          <KoreaMap
            data={sggData}
            counts={stats.sggCounts}
            nameOf={sggName}
            labelSize={sggCodes.length > 20 ? 6 : 7}
            sparkCodes={sparkCodes}
            selected={openCode}
            ariaLabel={`${sidoInfo.short}에서 함께 가 본 곳 ${visitedSgg.length}곳`}
            onSelect={openSheet}
          />
        )}
        <p className="map-hint">지역을 누르면 자세히 볼 수 있어요 · 두 손가락으로 확대</p>
        <MapLegend />
        <p className="map-credit">지도: {REGION_SOURCE}</p>
      </div>

      <section className="map-block">
        <p className="map-section">{sidoInfo.short}에서 함께한 여행 {sidoTrips.length > 0 && <span>{sidoTrips.length}번</span>}</p>
        <div className="map-list">
          {sidoTrips.map(t => (
            <TripRow key={t.id} trip={t} places={placesIn(t, sido) || sidoInfo.short} dateStr={stats.dateStr} onClick={() => navigate(`/travel/${t.id}`)} />
          ))}
        </div>
        {sidoTrips.length === 0 && <p className="map-empty">아직 이 지역의 여행이 없어요.</p>}
      </section>
      {renderSheet()}
    </div>
  );
};

export default MapPage;
