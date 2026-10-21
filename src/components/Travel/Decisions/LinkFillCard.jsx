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

const LinkFillCard = ({ url, status, changed, fetching, canFetch, onChangeUrl, onPasteUrl, onFetch, onEdit }) => {
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

  return (
    <div className="lfc">
      <div className="lfc-head">
        <span className="lfc-icon"><LinkIcon /></span>
        <span className="lfc-head-text">
          <span className="lfc-title">링크로 자동 채우기</span>
          <span className="lfc-desc">네이버지도 등 공유 링크로 사진·제목·주소·설명을 채워요</span>
        </span>
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
        className={`lfc-fetch ${status === 'failed' ? 'retry' : ''}`}
        onClick={onFetch}
        disabled={!canFetch || fetching}
      >
        {fetching ? '불러오는 중...' : status === 'failed' ? '다시 불러오기' : '정보 불러오기'}
      </button>
    </div>
  );
};

export default LinkFillCard;
