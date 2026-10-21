// src/components/Travel/Decisions/PhotoAddSheet.jsx
// 후보 추가/수정 시트 위에 뜨는 "사진 추가" 시트 — 사진 주소를 붙여넣고 미리보기로 확인한 뒤 추가.
// 사진 파일 업로드가 아니라 웹 사진 주소(URL)를 저장하는 기존 방식 그대로.
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { extractUrl } from '../../../utils/appLinkUtils';
import './PhotoAddSheet.css';

const ClipboardIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
  </svg>
);

const PhotoAddSheet = ({ existing, onAdd, onClose }) => {
  const [input, setInput] = useState('');
  // 미리보기 상태: 주소가 바뀔 때마다 'loading'으로 시작해서 img의 load/error로 결정
  const [previewState, setPreviewState] = useState({ src: null, status: 'idle' });

  const url = extractUrl(input);
  const status = previewState.src === url ? previewState.status : (url ? 'loading' : 'idle');
  const duplicate = !!url && existing.includes(url);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(text.trim());
    } catch {
      toast.info('붙여넣기를 할 수 없어요. 입력칸을 길게 눌러 붙여넣어 주세요.');
    }
  };

  const handleAdd = () => {
    if (!url || status !== 'loaded') return;
    if (duplicate) {
      toast.info('이미 추가한 사진이에요.');
      return;
    }
    onAdd(url);
  };

  return createPortal(
    <div className="pas-overlay">
      <div className="pas-sheet" role="dialog" aria-label="사진 추가">
        <div className="pas-grabber" />
        <span className="pas-title">사진 추가</span>

        <div className="pas-field">
          <span className="pas-label">사진 주소</span>
          <div className="pas-input-row">
            <label className="pas-input-wrap">
              <span className="pas-sr">사진 주소</span>
              <input
                type="text"
                inputMode="url"
                className={`pas-input ${url ? 'filled' : ''}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <button type="button" className="pas-paste" onClick={handlePaste}>
              <ClipboardIcon />붙여넣기
            </button>
          </div>
        </div>

        <div className="pas-field">
          <span className="pas-label">미리보기</span>
          <div className={`pas-preview ${status === 'loaded' ? 'loaded' : ''}`}>
            {url ? (
              <img
                key={url}
                src={url}
                alt="미리보기"
                className={`pas-preview-img ${status === 'loaded' ? 'shown' : ''}`}
                onLoad={() => setPreviewState({ src: url, status: 'loaded' })}
                onError={() => setPreviewState({ src: url, status: 'error' })}
              />
            ) : null}
            {status === 'idle' && <span className="pas-preview-msg">사진 주소를 넣으면 여기에 보여요</span>}
            {status === 'loading' && <span className="pas-preview-msg">사진을 불러오는 중...</span>}
            {status === 'error' && (
              <span className="pas-preview-msg error">사진을 불러오지 못했어요<br />주소가 사진 주소인지 확인해 주세요</span>
            )}
            {status === 'loaded' && (
              <span className={`pas-preview-badge ${duplicate ? 'dup' : ''}`}>
                {duplicate ? '이미 추가한 사진이에요' : '✓ 사진을 불러왔어요'}
              </span>
            )}
          </div>
        </div>

        <div className="pas-howto">
          <span className="pas-howto-title">사진 주소 가져오는 법</span>
          <span className="pas-howto-steps">
            1. 네이버지도·블로그 등에서 사진을 <b>길게 눌러요</b><br />
            2. <b>'이미지 주소 복사'</b>를 골라요<br />
            3. 여기로 돌아와 <b>붙여넣기</b>를 눌러요
          </span>
        </div>

        <div className="pas-actions">
          <button type="button" className="ofs-btn cancel" onClick={onClose}>취소</button>
          <button
            type="button"
            className="ofs-btn submit"
            onClick={handleAdd}
            disabled={status !== 'loaded' || duplicate}
          >
            이 사진 추가
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PhotoAddSheet;
