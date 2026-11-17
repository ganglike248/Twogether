// src/components/Recap/YearCards.jsx
// 연말 랩업 카드 11장 — buildYearRecap() 결과를 그림. 시안(캔버스 RecapYear*) 기준.
import React, { useState } from 'react';

const md = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}월 ${d}일`; };
const maxOf = (arr) => Math.max(1, ...arr);

const Bars = ({ items, highlight }) => {
  const max = maxOf(items.map(i => i.n));
  return (
    <div className="rc-vbars">
      {items.map(i => (
        <div key={i.label} className={`rc-vbar${i.label === highlight ? ' hi' : ''}`}>
          <span className="n">{i.n}</span>
          <span className="bar" style={{ height: `${Math.max(4, (i.n / max) * 100)}%` }} />
          <span className="l">{i.label}</span>
        </div>
      ))}
    </div>
  );
};

export const YearCoverCard = ({ cover }) => (
  <div className="rc-cover">
    <div className="rc-book">
      <span className="rc-tape center" />
      <span className="rc-book-year">{cover.year}</span>
      <span className="rc-book-t">우리의 다이어리</span>
      {cover.names.length === 2 && <span className="rc-book-names">{cover.names[0]} ♥ {cover.names[1]}</span>}
      <span className="rc-book-meta">
        {cover.dday && <span>D+{cover.dday}</span>}
        {cover.nth && <span>{cover.nth === 1 ? '올해 시작한 우리' : `${cover.nth}번째 해`}</span>}
      </span>
    </div>
    <h1 className="rc-h">올해의 다이어리를<br />펼쳐 볼까요?</h1>
    <p className="rc-d">1월부터 12월까지, 둘이 남긴 기록을 한 장씩 넘겨 봐요</p>
  </div>
);

// 한 해 히트맵 — 줄 하나가 한 달, 칸 하나가 하루(1~31일). 카드와 저장 이미지에서 같이 씀
export const YearHeatmap = ({ calendar: c, title }) => (
  <div className="rc-heat" role="img" aria-label={`한 해 캘린더, 일정이 있던 날 ${c.activeDays}일`}>
    {title && <span className="rc-heat-title">{title}</span>}
    <div className="rc-heat-days" aria-hidden="true"><span className="m" /><span className="cells"><b>1일</b><b>15일</b><b>31일</b></span></div>
    {c.months.map((days, i) => (
      <div key={i} className="rc-heat-row">
        <span className="m">{i + 1}월</span>
        <span className="cells">{days.map((v, d) => <i key={d} className={v === 'trip' ? 'trip' : `l${v}`} />)}</span>
      </div>
    ))}
    <div className="rc-legend"><span><i className="l0" />없음</span><span><i className="l1" />1개</span><span><i className="l2" />2개</span><span><i className="l3" />3개+</span><span><i className="trip" />여행</span></div>
  </div>
);

export const YearCalendarCard = ({ calendar: c }) => (
  <>
    <div className="rc-big"><b>{c.activeDays}일</b><span>일정이 있던 날 · 한 해의 {c.pct}%</span></div>
    <h1 className="rc-h sm">달력을 한 장에 펼치면<br />우리는 이렇게 채웠어요</h1>
    <div className="rc-paper"><YearHeatmap calendar={c} /></div>
    <div className="rc-grid2 tight">
      <div className="rc-stat"><span className="rc-stat-n">{c.weeklyAvg}<small>개</small></span><span className="rc-stat-l">평균 일주일에 남긴 일정</span></div>
      {c.streak && <div className="rc-stat"><span className="rc-stat-n">{c.streak.weeks}주<small>연속</small></span><span className="rc-stat-l">빠짐없이 계획한 가장 긴 기간{c.streak.fromMonth !== c.streak.toMonth ? ` (${c.streak.fromMonth}–${c.streak.toMonth}월)` : ''}</span></div>}
      <div className="rc-stat"><span className="rc-stat-n">{c.weekendPct}%</span><span className="rc-stat-l">일정이 토·일에 있었어요</span></div>
      {c.gap && <div className="rc-stat"><span className="rc-stat-n">{c.gap.days}일</span><span className="rc-stat-l">가장 오래 비었던 때 · {c.gap.label}</span></div>}
      {c.busiestWeek && <div className="rc-stat"><span className="rc-stat-n">{c.busiestWeek.label}</span><span className="rc-stat-l">가장 바빴던 주 · 일정 {c.busiestWeek.count}개</span></div>}
      {c.planAhead != null && <div className="rc-stat"><span className="rc-stat-n">{c.planAhead}일<small>전</small></span><span className="rc-stat-l">평균 이만큼 미리 약속했어요</span></div>}
    </div>
    <p className="rc-foot">올해 첫 일정 · {md(c.first.startStr)} {c.first.title}{c.last && <><br />마지막 · {md(c.last.startStr)} {c.last.title}</>}</p>
  </>
);

export const YearMonthsCard = ({ scenes }) => (
  <>
    <h1 className="rc-h">열두 달,<br />달마다 한 장면</h1>
    <div className="rc-months">
      {scenes.map(s => (
        <div key={s.month} className="rc-month-row">
          <span className="m">{s.month}월</span>
          <span className="t">{s.text}</span>
          <span className={`tag${s.tag === '여행' ? ' trip' : s.tag === '기념일' ? ' ann' : ''}`}>{s.tag}</span>
        </div>
      ))}
    </div>
  </>
);

export const YearTripsCard = ({ trips }) => (
  <>
    <div className="rc-big"><b>{trips.days}일</b><span>함께 떠나 있던 날 · 여행 {trips.count}번</span></div>
    <h1 className="rc-h sm">같이 짐을 싸서<br />이만큼 다녀왔어요</h1>
    <div className="rc-list">
      {trips.list.slice(0, 5).map(t => (
        <div key={`${t.startStr}${t.title}`} className="rc-row">
          <span className="rc-badge violet">{Number(t.startStr.slice(5, 7))}월</span>
          <span className="rc-row-tx"><b>{t.title}</b><span>{md(t.startStr)} · {t.nights > 0 ? `${t.nights}박 ${t.nights + 1}일` : '당일'}</span></span>
        </div>
      ))}
    </div>
    {trips.best && (
      <div className="rc-paper rc-best">
        <span className="rc-tape small" />
        <span className="rc-k">올해 가장 좋았던 여행</span>
        <b>{trips.best.title}</b>
        {trips.best.quote && <span className="rc-best-q">“{trips.best.quote}”</span>}
      </div>
    )}
    {trips.newPlaces.length > 0 && <p className="rc-foot">처음 가 본 곳 · {trips.newPlaces.slice(0, 4).join(', ')}</p>}
  </>
);

export const YearBucketsCard = ({ buckets }) => {
  const total = buckets.categories.reduce((s, c) => s + c.n, 0);
  return (
    <>
      <div className="rc-big"><b>{buckets.count}개</b><span>이룬 버킷리스트</span></div>
      <h1 className="rc-h sm">하고 싶다던 것들,<br />올해 진짜 해냈어요</h1>
      <div className="rc-chips">
        {buckets.titles.map(t => <span key={t}>{t}</span>)}
        {buckets.count > buckets.titles.length && <span className="more">외 {buckets.count - buckets.titles.length}개</span>}
      </div>
      {buckets.categories.length > 1 && (
        <div className="rc-stat wide">
          <span className="rc-stat-l">이룬 버킷의 종류</span>
          <div className="rc-who rc-cat" aria-hidden="true">{buckets.categories.map((c, i) => <span key={c.name} className={`c${i % 4}`} style={{ width: `${(c.n / total) * 100}%` }} />)}</div>
          <div className="rc-who-l wrap">{buckets.categories.map(c => <span key={c.name}>{c.name} {c.n}</span>)}</div>
        </div>
      )}
      {buckets.longestWait && <p className="rc-foot">가장 오래 기다린 버킷 · {buckets.longestWait.title} · 담은 지 {buckets.longestWait.days}일 만에</p>}
    </>
  );
};

export const YearMomentsCard = ({ moments }) => (
  <>
    <h1 className="rc-h">올해 함께<br />맞은 날들</h1>
    <p className="rc-d">{[moments.annCount && `기념일 ${moments.annCount}번`, moments.coupleCount && `이벤트데이 ${moments.coupleCount}번`].filter(Boolean).join(', ')}을 같이 보냈어요</p>
    <div className="rc-list">
      {moments.items.slice(0, 6).map(m => (
        <div key={`${m.dateStr}${m.title}`} className="rc-row">
          <span className="rc-row-date">{md(m.dateStr)}</span>
          <span className="rc-row-tx"><b>{m.title}</b>{m.note && <span>{m.note}</span>}</span>
        </div>
      ))}
    </div>
  </>
);

export const YearLettersCard = ({ letters }) => (
  <>
    <div className="rc-big"><b>{letters.count}통</b><span>주고받은 봉인 편지</span></div>
    <h1 className="rc-h sm">말로 다 못 한 마음을<br />편지로 남겼어요</h1>
    {letters.titles.length > 0 && <div className="rc-envelopes">{letters.titles.map(t => <span key={t} className="rc-envelope">{t}</span>)}</div>}
    {letters.authors.length > 0 && (
      <div className="rc-list">
        {letters.authors.map(a => <div key={a.uid} className="rc-row"><span className="rc-row-tx"><b>{a.name}</b></span><span className="rc-up-dday">{a.count}통</span></div>)}
      </div>
    )}
    {letters.longest && <p className="rc-foot">가장 오래 봉인됐던 편지 · {letters.longest.days}일 만에 열린 &lsquo;{letters.longest.title}&rsquo;</p>}
  </>
);

export const YearWordsCard = ({ words }) => (
  <>
    <h1 className="rc-h">{words.keywords.length ? <>올해 우리 일정에<br />자주 나온 말</> : <>계절마다<br />함께한 일정</>}</h1>
    {words.keywords.length > 0 && (
      <div className="rc-words">
        {words.keywords.map((k, i) => <span key={k.word} className={`w${Math.min(i, 3)}`}>{k.word} <small>{k.n}</small></span>)}
      </div>
    )}
    <div className="rc-paper">
      {words.keywords.length > 0 && <span className="rc-k">계절마다 함께한 일정</span>}
      <Bars items={words.seasons.map(s => ({ label: s.name, n: s.n }))} highlight={words.seasons.reduce((a, b) => (b.n > a.n ? b : a)).name} />
    </div>
  </>
);

export const YearHabitsCard = ({ habits }) => {
  const [open, setOpen] = useState(false);
  return (
  <>
    <h1 className="rc-h">우리는 <em>{habits.topWeekday}요일</em>에<br />가장 많이 만났어요</h1>
    <div className="rc-paper"><Bars items={habits.perWeekday.map(d => ({ label: d.day, n: d.n }))} highlight={habits.topWeekday} /></div>
    {habits.memo && (
      <div className="rc-paper rc-memo">
        <span className="rc-tape small" />
        <span className="rc-k">올해 가장 긴 메모를 남긴 날 · {md(habits.memo.startStr)} {habits.memo.title}</span>
        {open
          ? <p className="full" data-no-tap>{habits.memo.full}</p>
          : <p>{habits.memo.lines.join(' ')}</p>}
        <div className="rc-memo-foot">
          <span className="rc-k">{habits.memo.length}자의 기록</span>
          <button type="button" className="rc-memo-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {open ? '접기' : '펼쳐서 읽기'}
          </button>
        </div>
      </div>
    )}
  </>
  );
};

export const YearCompareCard = ({ compare }) => (
  <>
    <h1 className="rc-h">{compare.more ? <>작년의 우리보다<br />올해 더 많이 함께했어요</> : <>작년과 올해,<br />우리는 이렇게 지냈어요</>}</h1>
    <div className="rc-paper rc-compare">
      {compare.rows.map(r => {
        const max = Math.max(1, r.a, r.b);
        return (
          <div key={r.label} className="rc-cmp-row">
            <span className="l">{r.label}</span>
            <span className="bars"><i className="a" style={{ width: `${(r.a / max) * 100}%` }} /><i className="b" style={{ width: `${(r.b / max) * 100}%` }} /></span>
            <span className="v">{r.a}→<b>{r.b}</b></span>
          </div>
        );
      })}
      <div className="rc-legend"><span><i className="a" />{compare.prevYear}</span><span><i className="b" />{compare.prevYear + 1}</span></div>
    </div>
    {compare.changes.length > 0 && (
      <div className="rc-list">
        {compare.changes.map(c => <div key={c.label} className="rc-row"><span className="rc-row-tx"><span>{c.label}</span><b>{c.from} → {c.to}</b></span></div>)}
      </div>
    )}
    {compare.firsts.length > 0 && <div className="rc-chips"><span className="more">올해 처음</span>{compare.firsts.map(f => <span key={f}>{f}</span>)}</div>}
  </>
);

// 한 장 요약 종이 — 요약 카드와 이미지 저장(RecapExport)에서 같이 씀
export const YearSummaryPaper = ({ summary, calendar }) => (
  <div className="rc-paper rc-summary">
    <span className="rc-tape center" />
    <span className="rc-book-year">{summary.year}</span>
    <span className="rc-book-t">우리의 한 해</span>
    {summary.dday && (
      <span className="rc-summary-dday">
        함께한 지 <b>{summary.dday}일</b>
        <small>({summary.refStr.slice(0, 4)}년 {md(summary.refStr)} 기준)</small>
      </span>
    )}
    {calendar && <YearHeatmap calendar={calendar} title={`한 해 캘린더 · 일정이 있던 날 ${calendar.activeDays}일`} />}
    <div className="rc-summary-rows">
      {summary.rows.map(r => <div key={r.label}><span>{r.label}</span><b>{r.value}</b></div>)}
    </div>
  </div>
);

export const YearSummaryCard = ({ summary, onClose, onSave, saving }) => (
  <>
    <YearSummaryPaper summary={summary} />
    <div className="rc-end">
      <p>내년에도 같이 채워요</p>
      <div className="rc-btn-row">
        <button type="button" className="rc-btn" onClick={onSave} disabled={saving}>{saving ? '만드는 중…' : '이미지로 저장'}</button>
        <button type="button" className="rc-btn primary" onClick={onClose}>다 봤어요</button>
      </div>
    </div>
  </>
);
