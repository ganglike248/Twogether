// src/hooks/useLinkFill.js
// "링크로 자동 채우기"(LinkFillCard) 상태 — 링크 입력 → 정보 불러오기(콜러블 fetchLinkPreview) → 채움/실패.
// 어느 칸에 어떻게 채울지는 호출하는 쪽이 apply(preview) 콜백으로 정함(비어 있는 칸만 채우는 규칙도 호출 쪽 책임).
// 여행 일정 추가(ScheduleModal)와 선택 사항 후보 추가(OptionFormSheet)가 같이 씀.
//
// 링크 값은 두 방식: 훅이 직접 들고 있거나(일정 — 링크 칸이 따로 없음), 부모 폼 값을 그대로 쓰거나(후보 — 입력값이 곧 저장 url)
// → useLinkFill({ url, onUrlChange })로 넘기면 부모 값을 씀.
//
// 진행 표시(v1.0.24~): 서버가 링크 페이지를 직접 여는 데다 콜드 스타트까지 겹치면 10초 넘게 걸릴 수 있는데, 예전엔 버튼이
// 흐려지고 글씨만 바뀌어 "멈춘 것 같다"는 피드백 → 경과 초(elapsed)를 내보내 카드가 단계별 문구를 보여주고, 사용자가
// cancel()로 기다리지 않고 넘어갈 수 있게 함. 서버 콜러블은 중간에 끊을 수 없어서, 취소/시간 초과 뒤 늦게 온 응답은 무시함.
import { useEffect, useRef, useState } from 'react';
import { extractUrl } from '../utils/appLinkUtils';
import { fetchLinkPreview } from '../services/linkPreviewService';

const CLIENT_TIMEOUT_MS = 20000; // 서버 함수 timeoutSeconds(20)와 맞춤 — 그 뒤엔 실패로 보고 직접 입력하게

const useLinkFill = ({ url: externalUrl, onUrlChange } = {}) => {
  const [ownUrl, setOwnUrl] = useState('');
  const [status, setStatus] = useState('input'); // 'input' | 'filled' | 'failed'
  const [changed, setChanged] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [elapsed, setElapsed] = useState(0); // 불러오기 시작 후 지난 초
  const runRef = useRef(0); // 진행 중인 요청 번호 — 취소/새 요청 뒤 늦게 온 응답 무시용

  const controlled = typeof externalUrl === 'string';
  const url = controlled ? externalUrl : ownUrl;
  const setUrl = controlled ? (onUrlChange || (() => {})) : setOwnUrl;
  const link = extractUrl(url); // 공유 문구가 섞여 있어도 http(s) 부분만

  useEffect(() => {
    if (!fetching) return undefined;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [fetching]);

  const changeUrl = (value) => {
    setUrl(value);
    if (status === 'failed') setStatus('input');
  };

  const reset = () => {
    runRef.current += 1;
    if (!controlled) setOwnUrl('');
    setStatus('input');
    setChanged(false);
    setFetching(false);
  };

  // 기다리지 않고 직접 입력 — 링크는 그대로 둠
  const cancel = () => {
    runRef.current += 1;
    setFetching(false);
    setStatus('input');
  };

  // apply(preview) → 실제로 바뀐 칸이 있으면 true (카드의 "채웠어요 / 바뀐 내용이 없어요" 문구용)
  const fetchInto = async (apply) => {
    if (!link || fetching) return;
    const run = ++runRef.current;
    setFetching(true);
    try {
      const preview = await Promise.race([
        fetchLinkPreview(link),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CLIENT_TIMEOUT_MS)),
      ]);
      if (run !== runRef.current) return; // 취소됐거나 다른 요청이 시작됨
      setChanged(apply(preview));
      setStatus('filled');
    } catch (error) {
      if (run !== runRef.current) return;
      console.error('Error fetching link preview:', error);
      setStatus('failed');
    } finally {
      if (run === runRef.current) setFetching(false);
    }
  };

  return {
    url, link, status, changed, fetching, elapsed,
    canFetch: !!link,
    changeUrl, setUrl, fetchInto, reset, cancel,
    edit: () => setStatus('input'),
  };
};

export default useLinkFill;
