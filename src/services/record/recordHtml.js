// src/services/record/recordHtml.js
// 사람이 읽을 수 있는 "우리 기록" HTML 문서 생성 — 커플 연결 해제/탈퇴 직전, 해제 후 30일 동안(서버가 대신 읽은
// 데이터), 데이터 백업 화면에서 공용으로 씀. Firebase에 의존하지 않는 순수 함수(입력은 backupReader 결과와 같은 모양).
// 이 파일은 앱 밖에서(오프라인으로, 몇 년 뒤에도) 열리므로 외부 스크립트 없이 CSS만 인라인으로 넣고, 웹폰트는
// 못 불러와도 시스템 글꼴로 자연스럽게 보이게 함. 사용자 입력은 전부 escape.

import { MASCOT_DATA_URI } from './recordAssets';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Firestore Timestamp(toDate) / Date / 'YYYY-MM-DD…' 문자열 / 밀리초 → Date
const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') {
    const s = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v; // 날짜만이면 로컬 자정(UTC로 읽으면 하루 밀림)
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (d, withYear = true) => (d
  ? `${withYear ? `${d.getFullYear()}년 ` : ''}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
  : '');
const fmtShort = (d) => (d ? `${d.getMonth() + 1}.${d.getDate()}` : '');
const won = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d]/g, ''));
  return n ? `${n.toLocaleString('ko-KR')}원` : '';
};
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);
const linkTo = (u, label) => {
  const url = safeUrl(u);
  return url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '';
};
const multiline = (t) => esc(t).replace(/\n/g, '<br>');

// 일정이 걸친 날짜(양끝 포함). 여러 날짜 일정의 end는 "마지막 날 다음날 00:00"(배타적)이라 하루를 빼서 맞춤
// (dataUtils.getEventDayRange와 같은 규칙)
const eventRange = (ev) => {
  const start = toDate(typeof ev.start === 'string' ? ev.start.slice(0, 19) : ev.start);
  if (!start) return null;
  let end = toDate(typeof ev.end === 'string' ? ev.end.slice(0, 19) : ev.end) || start;
  if (ymd(end) > ymd(start) && end.getHours() === 0 && end.getMinutes() === 0) {
    end = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
  }
  return { start, end: ymd(end) < ymd(start) ? start : end };
};

const STYLE = `
:root{
  /* 종이 위 필름 다이어리 — 앱 홈 화면의 따뜻한 종이색과 코랄 포인트를 그대로 씀 */
  --paper:#fffaf6; --card:#ffffff; --ink:#3b2f33; --muted:#8a7a80; --line:#f1e2e6;
  --accent:#e85d63; --accent-soft:#ffe8ea; --done:#2f9e6b;
  --display:"Gowun Batang","Nanum Myeongjo",serif;
  --body:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--paper:#1f191b;--card:#2a2225;--ink:#f3e9ec;--muted:#b3a3a9;--line:#3d3236;--accent:#ff8a8f;--accent-soft:#45282c;--done:#5fd39b;color-scheme:dark}}
:root[data-theme="dark"]{--paper:#1f191b;--card:#2a2225;--ink:#f3e9ec;--muted:#b3a3a9;--line:#3d3236;--accent:#ff8a8f;--accent-soft:#45282c;--done:#5fd39b;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.65 var(--body);word-break:keep-all}
.wrap{max-width:720px;margin:0 auto;padding-block:40px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:40px}
.hero{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
header{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 0}
.mascot{width:clamp(76px,22vw,128px);max-width:100%;height:auto;flex:0 0 auto}
.tagline{font:400 16px/1.6 var(--display);color:var(--ink);margin:6px 0 0}
.story{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding:28px 20px;background:var(--card);border:1px solid var(--line);border-radius:18px}
.story .mascot{width:150px}
.story h2{border:0;padding:0}
.story p{margin:0;font:400 16px/1.9 var(--display);max-width:32em;text-wrap:balance}
.story .num{color:var(--accent);font-weight:700;font-variant-numeric:tabular-nums}
.story .closing{color:var(--muted);font-size:15px}
.eyebrow{font-size:12px;letter-spacing:.12em;color:var(--accent);font-weight:700}
h1{font:700 34px/1.25 var(--display);margin:0;text-wrap:balance}
h1 .heart{color:var(--accent)}
.since{color:var(--muted)}
.stats{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:10px;font-size:14px;color:var(--muted)}
.stats b{color:var(--ink);font-variant-numeric:tabular-nums}
nav{display:flex;flex-wrap:wrap;gap:8px}
nav a{font-size:13px;padding:4px 12px;border:1px solid var(--line);border-radius:999px;color:var(--ink);text-decoration:none;background:var(--card)}
section{display:flex;flex-direction:column;gap:14px}
h2{font:700 22px/1.3 var(--display);margin:0;padding-bottom:8px;border-bottom:1px dashed var(--line)}
h3{font-size:15px;margin:8px 0 0;color:var(--muted);font-weight:700}
.list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.row{display:grid;grid-template-columns:72px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.row:last-child{border-bottom:0}
.when{font-variant-numeric:tabular-nums;color:var(--muted);font-size:13px;padding-top:2px}
.what{min-width:0;overflow-wrap:anywhere}
.title{font-weight:600}
.desc{color:var(--muted);font-size:14px;margin-top:2px}
.tag{display:inline-block;font-size:11px;padding:1px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent);margin-left:6px;vertical-align:2px;font-weight:600}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px;min-width:0}
.card .head{display:flex;flex-direction:column;gap:2px}
.card .name{font:700 19px/1.35 var(--display)}
.meta{color:var(--muted);font-size:13px}
.sub{font-size:13px;font-weight:700;color:var(--accent);letter-spacing:.04em;margin-top:6px}
.check{color:var(--done);font-weight:700}
.open{color:var(--muted)}
a{color:var(--accent)}
.letter .body{white-space:normal;background:var(--paper);border-radius:10px;padding:14px 16px;font-family:var(--display);font-size:16px;line-height:1.8}
.sealed{color:var(--muted);font-style:italic}
.empty{color:var(--muted);font-size:14px}
.tools{display:flex;justify-content:flex-end}
.tools button{font:inherit;font-size:13px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer}
.tools button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
details.year{border-bottom:1px solid var(--line)}
details.year>summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 2px;font:700 18px/1.3 var(--display)}
details.year>summary::-webkit-details-marker{display:none}
details.year>summary::after{content:"펼치기";font:600 12px var(--body);color:var(--accent)}
details.year[open]>summary::after{content:"접기"}
details.year>summary .count{margin-left:auto;font:400 13px var(--body);color:var(--muted);font-variant-numeric:tabular-nums}
details.year>.inner{display:flex;flex-direction:column;gap:14px;padding-bottom:18px}
details.month{border-top:1px solid var(--line)}
details.month>summary{list-style:none;cursor:pointer;display:flex;align-items:baseline;gap:12px;padding:10px 2px;font-weight:700;color:var(--muted)}
details.month>summary::-webkit-details-marker{display:none}
details.month>summary::after{content:"＋";margin-left:8px;color:var(--accent);font-weight:400}
details.month[open]>summary::after{content:"－"}
details.month>summary .count{margin-left:auto;font-weight:400;font-size:13px;font-variant-numeric:tabular-nums}
details.month>.list{padding-bottom:8px}
footer{color:var(--muted);font-size:12px;border-top:1px dashed var(--line);padding-top:16px}
@media (max-width:480px){h1{font-size:28px}.row{grid-template-columns:60px 1fr}}
@media print{nav{display:none}.card{break-inside:avoid}}
`;

/**
 * @param {object} p
 * @param {string[]} p.members       [boyfriend uid, girlfriend uid] (커플 문서 members / formerMembers 순서)
 * @param {object}   p.memberNames   { uid: 닉네임 }
 * @param {string}   p.viewerUid     파일을 저장하는 사람
 * @param {object}   p.couple        { anniversaryDate, customCategories, heroImageUrl }
 * @param {object}   p.data          { events, personal_events?, trips, tripSchedules, travelDecisions, checklists, bucketlists, sealedMessages }
 * @param {Date}     [p.savedAt]
 * @param {string}   [p.note]        상단 안내 문구(예: 보관 기간 안내)
 */
export const buildRecordHtml = ({ members = [], memberNames = {}, viewerUid, couple = {}, data = {}, savedAt = new Date(), note = '' }) => {
  const nameOf = (uid) => (uid === viewerUid ? '나' : (memberNames[uid] || '상대방'));
  const displayName = (uid) => memberNames[uid] || (uid === viewerUid ? '나' : '상대방');
  const [bfUid, gfUid] = members;
  const typeLabel = { couple: '우리', boyfriend: displayName(bfUid), girlfriend: displayName(gfUid) };
  const anniversary = toDate(couple.anniversaryDate);
  const daysTogether = anniversary ? Math.floor((savedAt - anniversary) / 86400000) + 1 : null;

  const events = (data.events || []).map((e) => ({ ...e.data, id: e.id }))
    .filter((e) => e.eventType !== 'travel') // 여행은 여행 섹션에서
    .map((e) => ({ ...e, range: eventRange(e) })).filter((e) => e.range)
    .sort((a, b) => a.range.start - b.range.start);
  const personal = (data.personal_events || []).map((e) => ({ ...e.data, range: eventRange(e.data) }))
    .filter((e) => e.range).sort((a, b) => a.range.start - b.range.start);
  const trips = (data.trips || []).map((t) => ({ ...t.data, id: t.id }))
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  const buckets = (data.bucketlists || []).map((b) => b.data);
  const letters = (data.sealedMessages || []).map((m) => ({ ...m.data, content: m.content }))
    .sort((a, b) => (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0));
  const doneBuckets = buckets.filter((b) => b.completed);

  // 몇 년치 기록이면 한 페이지가 휴대폰 화면 수천 장이 됨(10년·일정 1.4만 개 실측 ≈ 1,500장) — 연도별로 접고 가장 최근
  // 연도만 펼쳐서, 접힌 연도 목록이 그대로 목차가 되게 함. <details>라 스크립트 없이도 동작.
  const byYear = (list, yearOf) => {
    const map = new Map();
    for (const item of list) {
      const y = yearOf(item);
      if (!map.has(y)) map.set(y, []);
      map.get(y).push(item);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]); // 최근 연도가 위
  };
  // render(items, isLatestYear) — 일정은 연도 안에서 월도 접으므로 최근 연도인지 알려줌
  const yearBlocks = (groups, unit, render) => groups.map(([year, items], i) => `
    <details class="year"${i === 0 ? ' open' : ''}><summary><span>${Number.isFinite(year) ? `${year}년` : '날짜 없음'}</span><span class="count">${unit} ${items.length.toLocaleString('ko-KR')}개</span></summary>
    <div class="inner">${render(items, i === 0)}</div></details>`).join('');

  const eventRow = (e, withTag) => {
    const when = ymd(e.range.start) === ymd(e.range.end)
      ? fmtShort(e.range.start)
      : `${fmtShort(e.range.start)}–${fmtShort(e.range.end)}`;
    const tag = withTag && typeLabel[e.eventType] ? `<span class="tag">${esc(typeLabel[e.eventType])}</span>` : '';
    const repeat = e.recurrence?.seriesId ? '<span class="tag">반복</span>' : '';
    return `<li class="row"><div class="when">${when}</div><div class="what"><span class="title">${esc(e.title)}</span>${tag}${repeat}${e.description ? `<div class="desc">${multiline(e.description)}</div>` : ''}</div></li>`;
  };

  // 매일 쓰는 커플은 1년치만 해도 일정이 1천 개가 넘어서(실측 하루 약 3.9개) 연도 안에서 월도 접음.
  // 처음 열었을 때는 가장 최근 연도의 가장 최근 달만 펼쳐 둠.
  const monthRows = (list, withTag, isLatestYear) => {
    const months = new Map();
    for (const e of list) {
      const m = e.range.start.getMonth() + 1;
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(e);
    }
    return [...months.entries()].sort((a, b) => b[0] - a[0]).map(([m, items], i) => `
      <details class="month"${isLatestYear && i === 0 ? ' open' : ''}><summary><span>${m}월</span><span class="count">${items.length.toLocaleString('ko-KR')}개</span></summary>
      <ul class="list">${items.map((e) => eventRow(e, withTag)).join('')}</ul></details>`).join('');
  };
  const eventRows = (list, withTag) => (list.length
    ? yearBlocks(byYear(list, (e) => e.range.start.getFullYear()), '일정', (items, latest) => monthRows(items, withTag, latest))
    : '<p class="empty">기록된 일정이 없어요.</p>');

  const tripCard = (t) => {
    const start = toDate(t.startDate); const end = toDate(t.endDate);
    const days = (data.tripSchedules || []).filter((s) => s.data.tripId === t.id).map((s) => s.data).sort((a, b) => a.day - b.day);
    const decisions = (data.travelDecisions || []).filter((d) => d.tripId === t.id).map((d) => d.data);
    const checklist = (data.checklists || []).find((c) => c.tripId === t.id)?.data?.items || [];
    const dayHtml = days.filter((d) => (d.schedules || []).length).map((d) => {
      const date = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + d.day - 1) : null;
      const items = [...d.schedules].sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))).map((s) => `
        <li class="row"><div class="when">${esc(s.time || '')}${s.endTime ? `–${esc(s.endTime)}` : ''}</div><div class="what">
          <span class="title">${esc(s.title)}</span>${s.completed ? ' <span class="check">✓</span>' : ''}
          ${[s.location, won(s.cost)].filter(Boolean).length ? `<div class="desc">${esc([s.location, won(s.cost)].filter(Boolean).join(' · '))}</div>` : ''}
          ${s.description ? `<div class="desc">${multiline(s.description)}</div>` : ''}
        </div></li>`).join('');
      return `<div class="sub">Day ${esc(d.day)}${date ? ` · ${fmtDate(date, false)}` : ''}</div><ul class="list">${items}</ul>`;
    }).join('');
    const decisionHtml = decisions.filter((d) => (d.options || []).length).map((d) => `
      <div class="sub">${esc(d.title)}</div><ul class="list">${d.options.map((o) => {
        const decided = o.isDecided || d.decidedOption?.id === o.id;
        const detail = [won(o.price), o.address].filter(Boolean).join(' · ');
        return `<li class="row"><div class="when">${decided ? '<span class="check">✓ 확정</span>' : ''}</div><div class="what"><span class="title">${esc(o.title)}</span>
          ${detail ? `<div class="desc">${esc(detail)}</div>` : ''}${o.description ? `<div class="desc">${multiline(o.description)}</div>` : ''}
          ${safeUrl(o.url) ? `<div class="desc">${linkTo(o.url, '링크 열기')}</div>` : ''}</div></li>`;
      }).join('')}</ul>`).join('');
    const checklistHtml = checklist.length ? `<div class="sub">체크리스트</div><ul class="list">${checklist.map((i) => `
      <li class="row"><div class="when">${i.completed ? '<span class="check">✓</span>' : '<span class="open">○</span>'}</div><div class="what">${esc(i.title)}</div></li>`).join('')}</ul>` : '';
    return `<article class="card"><div class="head"><span class="name">${esc(t.title)}</span>
      <span class="meta">${start ? fmtDate(start) : ''}${end && ymd(end) !== ymd(start) ? ` – ${fmtDate(end, start?.getFullYear() !== end.getFullYear())}` : ''}${t.destination ? ` · ${esc(t.destination)}` : ''}</span></div>
      ${t.description ? `<div class="desc">${multiline(t.description)}</div>` : ''}
      ${dayHtml}${decisionHtml}${checklistHtml}</article>`;
  };

  const categoryName = (key) => couple.customCategories?.[key]?.label
    || { food: '음식', place: '여행', date: '데이트' }[key] || key || '';

  // 버킷리스트도 수백 개가 될 수 있어 20개가 넘으면 접어 둠
  const bucketGroup = (label, list, done) => `
    <details class="year"${list.length <= 20 ? ' open' : ''}><summary><span>${label}</span><span class="count">${list.length.toLocaleString('ko-KR')}개</span></summary>
    <div class="inner">${bucketRows(list, done)}</div></details>`;
  const bucketRows = (list, done) => (list.length ? `<ul class="list">${list.map((b) => `
    <li class="row"><div class="when">${done ? `<span class="check">✓</span> ${fmtShort(toDate(b.completedAt))}` : '<span class="open">○</span>'}</div>
    <div class="what"><span class="title">${esc(b.title)}</span>${b.category ? `<span class="tag">${esc(categoryName(b.category))}</span>` : ''}${b.content ? `<div class="desc">${multiline(b.content)}</div>` : ''}</div></li>`).join('')}</ul>` : '<p class="empty">없어요.</p>');

  const letterCard = (m) => {
    const written = toDate(m.createdAt); const opened = toDate(m.unlockedAt);
    const body = m.content
      ? `<div class="body">${multiline(m.content.content)}</div>${safeUrl(m.content.imageUrl) ? `<div class="meta">${linkTo(m.content.imageUrl, '첨부 사진 보기')} (원본이 지워지면 열리지 않아요)</div>` : ''}`
      : '<p class="sealed">아직 열리지 않은 편지라 내용은 담기지 않았어요.</p>';
    return `<article class="card letter"><div class="head"><span class="name">${esc(m.title)}</span>
      <span class="meta">${esc(nameOf(m.authorUid))} → ${esc(nameOf(m.recipientUid))} · ${written ? `${fmtDate(written)}에 씀` : ''}${m.isUnlocked && opened ? ` · ${fmtDate(opened)}에 열림` : ''}</span></div>${body}</article>`;
  };

  // 마지막 장 "우리의 이야기" — 이 파일은 헤어질 때만이 아니라 평소 백업으로도 저장하므로(사용자 의견) 이별이 아니라
  // 함께한 시간을 기념하는 톤으로. 숫자가 0인 문장은 빼고, 숫자만 강조색(span)으로.
  const num = (v) => `<span class="num">${Number(v).toLocaleString('ko-KR')}</span>`;
  const storyLines = [
    daysTogether > 0 ? `처음 만난 날부터 ${num(daysTogether)}일이 흘렀어요.` : '',
    events.length ? `그동안 ${num(events.length)}개의 하루를 함께 적어 두었어요.` : '',
    trips.length && doneBuckets.length ? `${num(trips.length)}번 함께 여행을 떠났고, 하고 싶던 일 ${num(doneBuckets.length)}가지를 이뤘어요.`
      : trips.length ? `${num(trips.length)}번 함께 여행을 떠났어요.`
      : doneBuckets.length ? `하고 싶던 일 ${num(doneBuckets.length)}가지를 함께 이뤘어요.` : '',
    letters.length ? `${num(letters.length)}통의 편지에 서로의 마음을 담았어요.` : '',
  ].filter(Boolean);

  const coupleTitle = `${esc(displayName(bfUid))} <span class="heart">♥</span> ${esc(displayName(gfUid))}`;
  const sections = [
    ['events', '함께한 일정', eventRows(events, true)],
    ['trips', '여행', trips.length ? yearBlocks(byYear(trips, (t) => toDate(t.startDate)?.getFullYear()), '여행', (items) => items.map(tripCard).join('')) : '<p class="empty">기록된 여행이 없어요.</p>'],
    ['bucket', '버킷리스트', buckets.length ? `${bucketGroup('이룬 것', doneBuckets.sort((a, b) => (toDate(b.completedAt) || 0) - (toDate(a.completedAt) || 0)), true)}${bucketGroup('하고 싶은 것', buckets.filter((b) => !b.completed), false)}` : '<p class="empty">버킷리스트가 없어요.</p>'],
    ['letters', '봉인 편지', letters.length ? yearBlocks(byYear(letters, (m) => toDate(m.createdAt)?.getFullYear()), '편지', (items) => items.map(letterCard).join('')) : '<p class="empty">주고받은 편지가 없어요.</p>'],
    ...(personal.length ? [['personal', '내 개인 일정', eventRows(personal, false)]] : []),
  ];

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>우리두리 기록</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap">
<style>${STYLE}</style></head>
<body><div class="wrap">
<div class="hero"><header>
  <span class="eyebrow">우리두리 기록</span>
  <h1>${coupleTitle}</h1>
  ${anniversary ? `<span class="since">${fmtDate(anniversary)}부터 · 함께한 지 ${daysTogether.toLocaleString('ko-KR')}일</span>` : ''}
  <div class="stats"><span>일정 <b>${events.length}</b></span><span>여행 <b>${trips.length}</b></span><span>버킷리스트 <b>${doneBuckets.length}</b>/${buckets.length} 달성</span><span>편지 <b>${letters.length}</b></span></div>
  <p class="tagline">함께 쌓아 온 날들을 한곳에 모았어요.</p>
  ${note ? `<p class="meta">${esc(note)}</p>` : ''}
</header><img class="mascot" src="${MASCOT_DATA_URI}" alt="하트 풍선을 함께 든 우리두리 캐릭터 둘"></div>
<nav>${sections.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('')}</nav>
<div class="tools"><button type="button" id="toggle-all">모두 펼치기</button></div>
${sections.map(([id, label, html]) => `<section id="${id}"><h2>${label}</h2>${html}</section>`).join('\n')}
<section class="story" id="story"><img class="mascot" src="${MASCOT_DATA_URI}" alt="">
<h2>우리의 이야기</h2>
${storyLines.map((l) => `<p>${l}</p>`).join('')}
<p class="closing">평범한 하루도 함께 적어 두니 특별한 날이 되었어요.<br>이 기록이 언제 꺼내 보아도 따뜻한 기억이기를 바라요.</p>
</section>
<footer>${fmtDate(savedAt)}에 우리두리에서 저장한 기록이에요. 사진은 링크로만 담겨 있어서 원본이 지워지면 열리지 않아요.</footer>
</div>
<script>(function(){var b=document.getElementById('toggle-all');if(!b)return;b.addEventListener('click',function(){var d=document.querySelectorAll('details.year,details.month');var open=b.textContent==='모두 펼치기';for(var i=0;i<d.length;i++)d[i].open=open;b.textContent=open?'모두 접기':'모두 펼치기';});})();</script>
</body></html>`;
};

export const recordFileName = (savedAt = new Date()) => `우리두리-기록-${ymd(savedAt)}.html`;
