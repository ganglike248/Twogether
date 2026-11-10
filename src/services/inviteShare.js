// src/services/inviteShare.js
// 초대 코드 보내기 — 네이티브 앱은 @capacitor/share(기기 공유 창: 카카오톡·문자 등),
// 웹은 Web Share API, 둘 다 안 되면 메시지 전체를 클립보드에 복사.
import { Capacitor } from '@capacitor/core';

const SHARE_TITLE = '우리두리 초대 코드';

export const buildInviteMessage = (code) =>
  `우리두리에서 같이 기록해요!\n앱에서 '초대 코드를 받았어요'를 누르고 아래 코드를 입력해 주세요.\n\n초대 코드: ${code}\n\nhttps://twogether-206fb.web.app`;

// 공유 창을 그냥 닫은 경우 — 플러그인/브라우저 모두 reject하지만 오류가 아니라 취소
const isCancel = (err) => {
  const msg = `${err?.name || ''} ${err?.message || ''}`.toLowerCase();
  return msg.includes('abort') || msg.includes('cancel');
};

/** @returns {Promise<'shared'|'copied'|'cancelled'>} */
export const shareInviteCode = async (code) => {
  const text = buildInviteMessage(code);
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: SHARE_TITLE, text, dialogTitle: '초대 코드 보내기' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title: SHARE_TITLE, text });
      return 'shared';
    }
  } catch (err) {
    if (isCancel(err)) return 'cancelled';
    // 공유 자체가 실패하면 아래 복사로 대체
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
};
