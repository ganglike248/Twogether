// src/services/bucket/bucketPlanSync.js
// '하고 싶은 것'의 [언제 할까?]로 만든 캘린더 일정(events.bucketId)이 캘린더에서 바뀌면 버킷의 계획 표시도 맞춤.
//  - 일정 날짜를 바꿈 → plannedDate를 새 시작일로
//  - 일정을 지움(또는 개인 일정으로 바꿈) → 계획 풀기(목록엔 그대로)
// 버킷이 아직 그 일정을 계획으로 가리킬 때만 고침(이미 [했어요]로 끝났거나 다른 날로 다시 잡은 경우는 건드리지 않음).
// 일정 저장을 막지 않도록 실패는 조용히 넘김(eventService가 await 없이 부름). eventService를 불러오지 않음(순환 참조 방지).
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { safeUpdateDoc } from '../offlineWrite';

const dateOf = (start) => (typeof start === 'string' ? start.slice(0, 10) : '');

/** nextStart: 새 시작 시각 문자열(날짜 변경) 또는 null(일정이 없어짐) */
export const syncBucketPlanFromEvent = async (eventId, bucketId, nextStart) => {
  if (!eventId || !bucketId) return;
  try {
    const ref = doc(db, 'bucketlists', bucketId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().plannedEventId !== eventId) return;
    const nextDate = nextStart === null ? null : dateOf(nextStart);
    if (nextStart === null) {
      await safeUpdateDoc(ref, { plannedEventId: null, plannedDate: null });
    } else if (nextDate && nextDate !== snap.data().plannedDate) {
      await safeUpdateDoc(ref, { plannedDate: nextDate });
    }
  } catch (error) {
    // 버킷이 이미 지워졌으면 규칙상 읽기가 거부됨 — 맞출 대상이 없으니 넘어감
    console.warn('[bucket] 계획 맞추기 실패:', error?.code || error);
  }
};
