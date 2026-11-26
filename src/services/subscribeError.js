// src/services/subscribeError.js
// 실시간 구독(onSnapshot) 실패 공통 처리(AUDIT B-1) — 예전엔 구독 7곳에 오류 콜백이 없어, 권한·연결 오류가 나면
// 로딩 뼈대가 끝나지 않았음. 안내 토스트는 같은 문구가 여러 구독에서 겹쳐도 한 번만 뜨게 toastId 고정.
import { toast } from 'react-toastify';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

export const reportSubscribeError = (tag, error, onError) => {
  console.warn(`[subscribe:${tag}]`, error?.code || error);
  toast.error(getFriendlyErrorMessage(error, '불러오지 못했어요. 연결을 확인하고 다시 열어 주세요.'), { toastId: 'subscribe-error' });
  if (onError) onError(error);
};
