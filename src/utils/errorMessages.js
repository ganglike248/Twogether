// src/utils/errorMessages.js
// Firebase(Auth/Firestore/Storage/Functions) 에러를 사용자가 이해할 수 있는 한글 문구로 변환.
//
// 배경: Firestore 규칙 위반처럼 클라이언트 SDK가 던지는 에러의 error.message는
// "Missing or insufficient permissions." 같은 원문 그대로라 일반 사용자에게 그대로 보여주면 안 됨.
// 반면 이 프로젝트의 서비스 코드(authService.js, notificationService.js 등)가 직접
// `throw new Error('한글 안내 문구')`로 던지는 에러는 이미 사용자에게 보여줄 목적으로 작성된 것이라
// 그대로 노출해도 됨 — 이 둘을 구분하는 기준은 `error.code` 존재 여부:
//   - Firebase SDK 에러는 항상 .code를 가짐 (Firestore: 'permission-denied' 등 접두사 없음,
//     Auth: 'auth/...', Storage: 'storage/...', Functions callable: 'functions/...')
//   - 이 프로젝트가 직접 던지는 Error는 .code가 없고 message 자체가 이미 한글 안내 문구임
//   - 단, Functions callable(`functions/...`)의 message는 우리 Cloud Function이 HttpsError로
//     직접 지정한 한글 문구이므로(예: joinCouple의 "유효하지 않은 초대 코드입니다") 그대로 신뢰함

const FIRESTORE_ERROR_MESSAGES = {
  'permission-denied': '이 작업을 수행할 권한이 없습니다.',
  'unavailable': '네트워크 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.',
  'not-found': '요청한 데이터를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.',
  'already-exists': '이미 존재하는 데이터입니다.',
  'resource-exhausted': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  'failed-precondition': '지금은 이 작업을 수행할 수 없습니다. 새로고침 후 다시 시도해주세요.',
  'aborted': '다른 요청과 충돌이 발생했습니다. 다시 시도해주세요.',
  'cancelled': '요청이 취소되었습니다.',
  'deadline-exceeded': '요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.',
  'unauthenticated': '로그인이 필요합니다. 다시 로그인해주세요.',
  'internal': '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  'data-loss': '데이터 처리 중 문제가 발생했습니다.',
  'invalid-argument': '입력한 값을 확인해주세요.',
  'out-of-range': '입력한 값의 범위를 확인해주세요.',
  'unimplemented': '지원하지 않는 기능입니다.',
};

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/user-not-found': '등록되지 않은 이메일입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
  'auth/requires-recent-login': '보안을 위해 다시 로그인한 후 시도해주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
  'auth/user-disabled': '비활성화된 계정입니다. 고객센터에 문의해주세요.',
  'auth/operation-not-allowed': '현재 지원하지 않는 로그인 방식입니다.',
  'auth/popup-closed-by-user': '로그인 창이 닫혔습니다. 다시 시도해주세요.',
  'auth/cancelled-popup-request': '이미 진행 중인 로그인 요청이 있습니다.',
  'auth/credential-already-in-use': '이미 다른 계정에 연결된 인증 정보입니다.',
  'auth/invalid-action-code': '유효하지 않거나 만료된 링크입니다.',
  'auth/expired-action-code': '만료된 링크입니다. 다시 시도해주세요.',
};

const STORAGE_ERROR_MESSAGES = {
  'storage/unauthorized': '이 파일에 접근할 권한이 없습니다.',
  'storage/canceled': '업로드가 취소되었습니다.',
  'storage/unknown': '파일 처리 중 알 수 없는 오류가 발생했습니다.',
  'storage/quota-exceeded': '저장 공간이 부족합니다.',
  'storage/object-not-found': '파일을 찾을 수 없습니다.',
  'storage/invalid-checksum': '파일 업로드에 실패했습니다. 다시 시도해주세요.',
  'storage/retry-limit-exceeded': '네트워크 상태가 좋지 않습니다. 다시 시도해주세요.',
};

const KNOWN_ERROR_MESSAGES = {
  ...FIRESTORE_ERROR_MESSAGES,
  ...AUTH_ERROR_MESSAGES,
  ...STORAGE_ERROR_MESSAGES,
};

const DEFAULT_FALLBACK = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';

/**
 * 예외 객체를 사용자에게 보여줘도 안전한 한글 문구로 변환.
 * @param {unknown} error - catch로 잡은 예외
 * @param {string} [fallback] - 알려지지 않은 Firebase 에러 코드일 때 보여줄 문구
 * @returns {string}
 */
export const getFriendlyErrorMessage = (error, fallback = DEFAULT_FALLBACK) => {
  const code = error?.code;

  if (typeof code === 'string' && code) {
    // Cloud Functions callable 에러는 우리 서버가 직접 지정한 한글 메시지이므로 그대로 신뢰
    if (code.startsWith('functions/')) {
      return error?.message || fallback;
    }
    return KNOWN_ERROR_MESSAGES[code] || fallback;
  }

  // code가 없으면 이 프로젝트 코드가 직접 던진 한글 안내 문구일 가능성이 높음
  if (typeof error?.message === 'string' && error.message) {
    return error.message;
  }

  return fallback;
};
