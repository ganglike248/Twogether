// src/components/Travel/Trip/RegionPicker.jsx
// 여행 지역 고르기 — 고른 지역 칩(누르면 빠짐) + [+ 지역 더하기]로 시·도 → 시·군·구 선택. 우리 지도에 칠해질 단위.
// value/onChange는 저장 모양(trips.regions) 그대로. 추천 문구(hint)는 부모가 여행지 글자로 만들어 넘김.
import React, { useState } from 'react';
import { SIDO_LIST, SIDO_BY_CODE, getSggChoices, groupRegions, groupToRegions, mergeRegions } from '../../../services/regions/regionData';
import './RegionPicker.css';

// newKeys: 이번 여행으로 처음 칠해지는 묶음 key(Set) — '처음' 표시(여행 끝 기록 3단계)
const RegionPicker = ({ value = [], onChange, hint, newKeys }) => {
  const [open, setOpen] = useState(false);
  const [sido, setSido] = useState(null);
  const groups = groupRegions(value);
  const selectedKeys = new Set(groups.map(g => g.key));

  const remove = (key) => onChange(groups.filter(g => g.key !== key).flatMap(groupToRegions));
  const addChoice = (choice) => {
    if (selectedKeys.has(choice.key)) { remove(choice.key); return; }
    onChange(mergeRegions(value, choice.codes.map(sgg => ({ sido, sgg }))));
  };
  const addSidoOnly = () => { onChange(mergeRegions(value, [{ sido }])); setOpen(false); setSido(null); };

  return (
    <div className="rp">
      {hint && <p className="rp-hint">{hint}</p>}
      <div className="rp-chips">
        {groups.map(g => (
          <button key={g.key} type="button" className="rp-chip on" onClick={() => remove(g.key)} aria-label={`${g.label} 빼기`}>
            {g.codes.length ? `${g.sidoShort} · ${g.label}` : g.label}
            {newKeys?.has(g.key) && <em className="rp-new">처음</em>}
            <span aria-hidden="true">×</span>
          </button>
        ))}
        {!open && <button type="button" className="rp-chip add" onClick={() => setOpen(true)}>+ 지역 더하기</button>}
      </div>

      {open && (
        <div className="rp-panel">
          {!sido ? (
            <>
              <p className="rp-step">시·도를 골라 주세요</p>
              <div className="rp-chips">
                {SIDO_LIST.map(s => <button key={s.code} type="button" className="rp-chip" onClick={() => setSido(s.code)}>{s.short}</button>)}
              </div>
            </>
          ) : (
            <>
              <p className="rp-step">
                <button type="button" className="rp-back" onClick={() => setSido(null)}>‹ 시·도</button>
                {SIDO_BY_CODE[sido].short}에서 간 곳
              </p>
              <div className="rp-chips">
                {getSggChoices(sido).map(c => (
                  <button key={c.key} type="button" className={`rp-chip${selectedKeys.has(c.key) ? ' on' : ''}`} onClick={() => addChoice(c)}>{c.label}</button>
                ))}
              </div>
              <button type="button" className="rp-link" onClick={addSidoOnly}>시·군·구는 모르겠어요 · {SIDO_BY_CODE[sido].short}만 칠하기</button>
            </>
          )}
          <button type="button" className="rp-done" onClick={() => { setOpen(false); setSido(null); }}>완료</button>
        </div>
      )}
    </div>
  );
};

export default RegionPicker;
