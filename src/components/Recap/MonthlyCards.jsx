// src/components/Recap/MonthlyCards.jsx
// 월간 요약 카드 4장 — buildMonthlyRecap() 결과를 그림. 시안(캔버스 "월간 요약") 기준.
import React from 'react';
import { MdCalendarToday, MdFlight, MdCheck, MdMail } from 'react-icons/md';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const md = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
const range = (a, b) => (a === b ? md(a) : `${md(a)} – ${md(b)}`);

export const MonthCalendarCard = ({ calendar }) => (
  <>
    <h1 className="rc-h">{calendar.month}월도 같이<br />채웠어요</h1>
    <p className="rc-d">한 달 중 <b>{calendar.activeDays}일</b>을 함께 계획했어요</p>
    <div className="rc-paper rc-cal" role="img" aria-label={`${calendar.month}월 달력, 일정 있는 날 ${calendar.activeDays}일`}>
      <span className="rc-tape center" />
      <div className="rc-cal-head"><b>{calendar.month}월</b><span>일정 있는 날 {calendar.activeDays}일</span></div>
      <div className="rc-cal-grid">
        {WEEKDAYS.map(w => <span key={w} className="w">{w}</span>)}
        {Array.from({ length: calendar.firstWeekday }, (_, i) => <span key={`b${i}`} />)}
        {calendar.cells.map(c => (
          <span key={c.day} className={[c.anniversary ? 'ann' : '', !c.anniversary && c.trip ? 'trip' : '', !c.anniversary && !c.trip && c.event ? 'on' : ''].join(' ')}>{c.day}</span>
        ))}
      </div>
      <div className="rc-legend"><span><i className="dot" />일정</span><span><i className="trip" />여행</span><span><i className="ann" />기념일</span></div>
    </div>
  </>
);

const Stat = ({ icon, tone, n, label, sub, taped }) => (
  <div className={`rc-stat${taped ? ' taped' : ''}`}>
    {taped && <span className="rc-tape small" />}
    <span className={`rc-stat-icon ${tone}`} aria-hidden="true">{icon}</span>
    <span className="rc-stat-n">{n}</span>
    <span className="rc-stat-l">{label}</span>
    {sub && <span className="rc-stat-sub">{sub}</span>}
  </div>
);

export const MonthNumbersCard = ({ numbers }) => {
  const total = numbers.byWho.reduce((s, w) => s + w.count, 0);
  return (
    <>
      <h1 className="rc-h">숫자로 보는<br />이번 달 우리</h1>
      <div className="rc-grid2">
        <Stat taped icon={<MdCalendarToday />} tone="pink" n={numbers.events} label="함께한 일정"
          sub={numbers.eventsDiff == null ? null : numbers.eventsDiff >= 0 ? `지난달보다 +${numbers.eventsDiff}` : `지난달보다 ${numbers.eventsDiff}`} />
        <Stat icon={<MdFlight />} tone="violet" n={numbers.trips} label={numbers.tripLabel ? `여행 · ${numbers.tripLabel}` : '여행'}
          sub={numbers.trips ? `${numbers.tripNights}박 ${numbers.tripNights + 1}일` : null} />
        <Stat icon={<MdCheck />} tone="green" n={numbers.bucketsDone} label="이룬 버킷리스트" sub={`남은 버킷 ${numbers.bucketsLeft}개`} />
        <Stat icon={<MdMail />} tone="amber" n={numbers.letters} label="주고받은 편지" sub={numbers.lettersSealed ? `봉인 중 ${numbers.lettersSealed}통` : null} />
        {total > 0 && (
          <div className="rc-stat wide">
            <span className="rc-stat-l">일정을 남긴 사람</span>
            <div className="rc-who" aria-hidden="true">
              {numbers.byWho.map(w => <span key={w.uid} style={{ width: `${(w.count / total) * 100}%`, background: `var(--color-${w.role})` }} />)}
            </div>
            <div className="rc-who-l">{numbers.byWho.map(w => <span key={w.uid}>{w.name} {w.count}개</span>)}</div>
          </div>
        )}
      </div>
    </>
  );
};

export const MonthHighlightsCard = ({ highlights }) => (
  <>
    <h1 className="rc-h">이번 달<br />기억에 남을 순간</h1>
    {highlights.longest && (
      <div className="rc-paper rc-feature">
        <span className="rc-tape center" />
        <span className="rc-k">이번 달 가장 긴 일정</span>
        <span className="rc-feature-t">{highlights.longest.title}</span>
        <span className="rc-k">{range(highlights.longest.startStr, highlights.longest.endStr)} · {highlights.longest.kind}</span>
      </div>
    )}
    <div className="rc-list">
      {highlights.anniversaries.map(a => (
        <div key={a.dateStr} className="rc-row"><span className="rc-badge pink">D</span><span className="rc-row-tx"><b>{a.label}</b><span>{md(a.dateStr)}에 함께 맞았어요</span></span></div>
      ))}
      {highlights.bucketsDone.length > 0 && (
        <div className="rc-row"><span className="rc-badge green"><MdCheck /></span><span className="rc-row-tx"><b>{highlights.bucketsDone.slice(0, 2).join(' · ')}</b><span>버킷리스트 {highlights.bucketsDone.length}개를 이뤘어요</span></span></div>
      )}
      {highlights.yearAgo && (
        <div className="rc-row"><span className="rc-badge amber">1년</span><span className="rc-row-tx"><b>1년 전, {highlights.yearAgo.title}</b><span>{md(highlights.yearAgo.startStr)} · 그날의 우리</span></span></div>
      )}
    </div>
  </>
);

export const MonthNextCard = ({ next, onAddEvent, onSave, saving }) => (
  <>
    <h1 className="rc-h">{next.month}월에는<br />이런 날이 기다려요</h1>
    <div className="rc-up">
      {next.upcoming.map(u => (
        <div key={`${u.dateStr}${u.label}`} className="rc-up-item">
          <span className="rc-row-tx"><b>{u.label}</b><span>{u.endStr ? range(u.dateStr, u.endStr) : md(u.dateStr)} · {u.kind}</span></span>
          <span className="rc-up-dday">{u.dday > 0 ? `D-${u.dday}` : 'D-day'}</span>
        </div>
      ))}
      {next.eventCount > 0 && (
        <div className="rc-up-item">
          <span className="rc-row-tx"><b>예정된 일정 {next.eventCount}개</b><span>가장 가까운 일정 · {md(next.nearestEvent.startStr)} {next.nearestEvent.title}</span></span>
          <span className="rc-up-dday">{next.eventCount}</span>
        </div>
      )}
      {next.emptyWeekends > 0 && <div className="rc-up-empty">아직 비어 있는 주말이 {next.emptyWeekends}번 있어요. 같이 채워 볼까요?</div>}
      {next.upcoming.length === 0 && next.eventCount === 0 && next.emptyWeekends === 0 && (
        <div className="rc-up-empty">다음 달 계획은 아직이에요. 같이 정해 볼까요?</div>
      )}
    </div>
    <div className="rc-end">
      <p>{next.month}월도 같이 채워요</p>
      <div className="rc-btn-row">
        <button type="button" className="rc-btn" onClick={onSave} disabled={saving}>{saving ? '만드는 중…' : '이미지로 저장'}</button>
        <button type="button" className="rc-btn primary" onClick={onAddEvent}>일정 추가하러 가기</button>
      </div>
    </div>
  </>
);
