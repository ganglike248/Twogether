// src/components/Travel/Decisions/LinkFillCard.jsx
// 후보 추가 시트 상단의 "링크로 자동 채우기" 카드.
// 입력칸 값이 곧 후보의 저장 링크(url) — 정보 불러오기에 실패해도 링크는 그대로 저장됨.
// status: 'input'(입력) | 'filled'(불러옴, 파란 요약 + ✎ 수정) | 'failed'(실패 안내 + 다시 불러오기)
import React from 'react';
import { extractUrl } from '../../../utils/appLinkUtils';

const LinkIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);

const ChevronIcon = ({ up }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
  </svg>
);

// description: 카드 안내 문구(채우는 칸이 화면마다 달라서 — 여행 일정 추가엔 사진 칸이 없음)
// collapsed/onToggleCollapse: 접기(사용자 요청) — 부모가 hooks/useLinkFillCollapsed로 들고 있음("또는 직접 입력" 구분선도 같이 숨기려고)
const LinkFillCard = ({
  url, status, changed, fetching, canFetch, onChangeUrl, onPasteUrl, onFetch, onEdit,
  description = '네이버지도 등 공유 링크로 사진·제목·주소·설명을 채워요',
  collapsed = false, onToggleCollapse,
  elapsed = 0, onCancel,
}) => {
  if (status === 'filled') {
    const shown = (extractUrl(url) || url || '').replace(/^https?:\/\//i, ''); // 공유 문구가 섞여 있어도 주소만
    return (
      <div className="lfc-done">
        <span className="lfc-done-icon"><CheckIcon /></span>
        <span className="lfc-done-text">
          <span className="lfc-done-title">{changed ? '링크에서 정보를 채웠어요' : '링크를 확인했어요'}</span>
          <span className="lfc-done-sub">
            {shown} · {changed ? '비어 있던 칸만 채웠어요' : '비어 있는 칸이 없어서 바뀐 내용이 없어요'}
          </span>
        </span>
        <button type="button" className="lfc-done-edit" onClick={onEdit} aria-label="링크 수정">
          <PencilIcon />수정
        </button>
      </div>
    );
  }

  if (collapsed && onToggleCollapse) {
    return (
      <button type="button" className="lfc-collapsed" onClick={onToggleCollapse} aria-expanded="false">
        <span className="lfc-collapsed-icon"><LinkIcon /></span>
        <span className="lfc-collapsed-title">링크로 자동 채우기</span>
        <span className="lfc-toggle-text">펼치기 <ChevronIcon /></span>
      </button>
    );
  }

  return (
    <div className="lfc">
      <div className="lfc-head">
        <span className="lfc-icon"><LinkIcon /></span>
        <span className="lfc-head-text">
          <span className="lfc-title">링크로 자동 채우기</span>
          <span className="lfc-desc">{description}</span>
        </span>
        {onToggleCollapse && (
          <button type="button" className="lfc-toggle" onClick={onToggleCollapse} aria-expanded="true" aria-label="링크로 자동 채우기 접기">
            <span className="lfc-toggle-text">접기 <ChevronIcon up /></span>
          </button>
        )}
      </div>
      <label className="ofs-field">
        <span className="ofs-label">링크</span>
        <input
          type="text"
          inputMode="url"
          className="ofs-input lfc-input"
          value={url}
          onChange={(e) => onChangeUrl(e.target.value)}
          onPaste={onPasteUrl}
          placeholder="링크나 공유 문구를 붙여넣으세요"
        />
      </label>
      {status === 'failed' && (
        <div className="lfc-fail">
          <span className="lfc-fail-icon">!</span>
          <span className="lfc-fail-text">
            <span className="lfc-fail-title">정보를 불러오지 못했어요</span>
            <span className="lfc-fail-sub">링크는 그대로 저장돼요. 아래 칸은 직접 채워 주세요.</span>
          </span>
        </div>
      )}
      <button
        type="button"
        className={`lfc-fetch ${status === 'failed' ? 'retry' : ''} ${fetching ? 'fetching' : ''}`}
        onClick={onFetch}
        disabled={!canFetch || fetching}
        aria-busy={fetching}
      >
        {fetching && <span className="lfc-spinner" aria-hidden="true" />}
        {fetching ? '불러오는 중' : status === 'failed' ? '다시 불러오기' : '정보 불러오기'}
      </button>
      {fetching && (
        // 서버가 링크 페이지를 직접 열어서 오래 걸릴 수 있음(콜드 스타트 포함 10초+) — 멈춘 게 아니라는 걸 보여주고,
        // 기다리기 싫으면 바로 직접 입력으로 넘어갈 수 있게(v1.0.24~)
        <div className="lfc-progress" role="status" aria-live="polite">
          <div className="lfc-progress-bar"><span /></div>
          <div className="lfc-progress-row">
            <span className="lfc-progress-text">
              {elapsed < 3 ? '링크를 확인하고 있어요'
                : elapsed < 8 ? '페이지에서 제목·주소를 읽고 있어요'
                : '조금 오래 걸리고 있어요 · 최대 20초'}
            </span>
            {onCancel && (
              <button type="button" className="lfc-cancel" onClick={onCancel}>직접 입력할게요</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkFillCard;
