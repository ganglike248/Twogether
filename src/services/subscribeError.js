// src/services/subscribeError.js
// 실시간 구독(onSnapshot) 실패 공통 처리(AUDIT B-1) — 예전엔 구독 7곳에 오류 콜백이 없어, 권한·연결 오류가 나면
// 로딩 뼈대가 끝나지 않았음. 안내 토스트는 같은 문구가 여러 구독에서 겹쳐도 한 번만 뜨게 toastId 고정.
import { toast } from 'react-toastify';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

// onError가 'retry'를 돌려주면(다시 시도 중) 안내하지 않음
export const reportSubscribeError = (tag, error, onError) => {
  const handled = onError ? onError(error) : undefined;
  if (handled === 'retry') return;
  console.warn(`[subscribe:${tag}]`, error?.code || error);
  toast.error(getFriendlyErrorMessage(error, '불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.'), { toastId: 'subscribe-error' });
};

// 방금 만든 여행의 하위 데이터(일정표·후보·체크리스트) 구독은 서버에 여행이 아직 없어 '권한 없음'으로 한 번 거부될 수 있음
// (기기에선 저장 즉시 목록에 보이지만 규칙은 서버의 exists(trips/..)를 봄). 그럴 땐 조용히 다시 구독(최대 retries번).
// start(onErr) → unsubscribe. onErr가 'retry'를 돌려주면 reportSubscribeError가 안내를 건너뜀
export const subscribeWithPermissionRetry = (start, { retries = 3, baseDelayMs = 700 } = {}) => {
  let unsubscribe = null;
  let attempt = 0;
  let timer = null;
  let stopped = false;
  const run = () => {
    unsubscribe = start((error) => {
      if (error?.code === 'permission-denied' && attempt < retries && !stopped) {
        attempt += 1;
        if (unsubscribe) unsubscribe();
        timer = setTimeout(run, baseDelayMs * attempt);
        return 'retry';
      }
      return undefined;
    });
  };
  run();
  return () => {
    stopped = true;
    clearTimeout(timer);
    if (unsubscribe) unsubscribe();
  };
};
