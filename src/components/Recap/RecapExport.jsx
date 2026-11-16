// src/components/Recap/RecapExport.jsx
// 이미지로 저장할 한 장 — 화면 밖(.rc-export-stage)에 그려 두고 안쪽 .rc-export만 캡처.
// (캡처 대상 자체에 화면 밖 위치를 주면 복제본에도 그 위치가 따라가 빈 이미지가 나옴)
import React, { forwardRef } from 'react';
import { MonthCalendarCard, MonthNumbersCard } from './MonthlyCards';
import { YearSummaryPaper } from './YearCards';

const RecapExport = forwardRef(({ recap, isYear }, ref) => (
  <div className="rc-export-stage" aria-hidden="true">
    <div className={`rc-export${isYear ? ' year' : ''}`} ref={ref}>
      <div className="rc-export-head">
        <span>우리두리</span>
        <b>{isYear ? `${recap.year} 우리의 다이어리` : `${recap.year}년 ${recap.month}월의 우리`}</b>
      </div>
      {isYear ? (
        <>
          <YearSummaryPaper summary={recap.summary} calendar={recap.calendar} />
        </>
      ) : (
        <>
          <MonthCalendarCard calendar={recap.calendar} />
          <MonthNumbersCard numbers={recap.numbers} />
        </>
      )}
    </div>
  </div>
));

RecapExport.displayName = 'RecapExport';
export default RecapExport;
