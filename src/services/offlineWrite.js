// src/services/offlineWrite.js
// 오프라인·느린 연결에서 저장 버튼이 "저장 중…"으로 멈추던 문제(AUDIT E-1) 대응.
// Firestore는 오프라인이면 쓰기를 기기 대기열(IndexedDB/메모리)에 넣고 서버가 받을 때까지 promise를 끝내지 않음 →
// 화면이 그걸 await하면 영영 멈춘 것처럼 보임. 여기 함수들은 원래 함수와 인자·결과가 같고,
//  - 온라인이면 원래대로 서버 확인까지 기다림(실패하면 오류도 그대로 전달)
//  - 오프라인이거나 WAIT_MS 안에 끝나지 않으면 "연결되면 저장돼요"를 알리고 바로 진행(쓰기는 대기열에서 나중에 올라감)
// 트랜잭션(runTransaction)은 서버가 꼭 필요해 오프라인이면 바로 실패하므로 여기 대상이 아님.
import { setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const WAIT_MS = 8000;
export const QUEUED_WRITE_EVENT = 'twogether:queued-write';

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const notifyQueued = (reason) => {
  try { window.dispatchEvent(new CustomEvent(QUEUED_WRITE_EVENT, { detail: { reason } })); } catch { /* 무시 */ }
};

/** 쓰기 promise를 오프라인·지연 시 기다리지 않게 감쌈 */
export const settleWrite = (writePromise) => {
  // 나중에 대기열에서 실패해도(권한 등) 처리 안 된 오류로 남지 않게
  const tracked = writePromise.catch((error) => { console.warn('[offlineWrite] 대기열 쓰기 실패:', error?.code || error); throw error; });
  if (isOffline()) {
    tracked.catch(() => {});
    notifyQueued('offline');
    return Promise.resolve();
  }
  let timer;
  const slow = new Promise((resolve) => {
    timer = setTimeout(() => { tracked.catch(() => {}); notifyQueued('slow'); resolve(); }, WAIT_MS);
  });
  return Promise.race([tracked.finally(() => clearTimeout(timer)), slow]);
};

export const safeSetDoc = (...args) => settleWrite(setDoc(...args));
export const safeUpdateDoc = (...args) => settleWrite(updateDoc(...args));
export const safeDeleteDoc = (...args) => settleWrite(deleteDoc(...args));
export const commitBatch = (batch) => settleWrite(batch.commit());

/** addDoc과 같은 결과(문서 참조) — ID를 먼저 만들고 setDoc으로 써서, 오프라인이어도 ID를 바로 돌려줌 */
export const safeAddDoc = async (collectionRef, data) => {
  const ref = doc(collectionRef);
  await settleWrite(setDoc(ref, data));
  return ref;
};

