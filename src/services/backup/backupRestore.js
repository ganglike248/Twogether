// src/services/backup/backupRestore.js
// 같은 커플의 백업 파일에서 "지금 서버에 없는 문서만" 원래 문서 ID 그대로 다시 만든다.
// - 원래 ID를 유지하므로 여행↔캘린더 이벤트(calendarEventId), 일정표(tripId), 반복 시리즈(seriesId),
//   후보→일정(sourceOptionId) 같은 연결 관계를 다시 이어줄 필요가 없음.
// - 이미 있는 문서는 절대 덮어쓰지 않음(비교는 backupReader가 서버에서 직접 읽은 현재 상태 기준).
//   문서 단위라서, 문서는 남아있고 그 안의 일부(일정표의 일정 하나, 체크리스트 항목 하나 등)만
//   지운 경우는 되살아나지 않음 — 화면에서 사용자에게 안내함.
// - 복원한 문서엔 restoredAt을 붙임 → functions/index.js의 알림 트리거(onEventCreate/
//   onEventSeriesCreate/onSealedMessageCreate)가 이걸 보고 알림을 건너뜀. 공개된 편지를 되살릴 때의
//   공개 전환 쓰기엔 restoredUnlock: true를 붙여 onSealedMessageUpdate도 건너뜀.
//   ⚠ 이 함수 배포 전에 웹만 먼저 배포하면 복원 시 일정 수만큼 파트너에게 알림이 쏟아짐.
import {
  doc, writeBatch, setDoc, updateDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { readBackupData } from './backupReader';

const BATCH_SIZE = 400; // Firestore 배치 한도 500 이하로 여유 있게

// 요약 화면에 보여줄 묶음 — eventSeries(반복 규칙 원본)는 사용자에게 의미 없는 내부 문서라 표시 안 함,
// eventType 'travel' 이벤트는 여행과 한 몸(createTrip이 같이 만듦)이라 "여행"에 포함되므로 따로 안 셈
export const SUMMARY_GROUPS = [
  { key: 'events', label: '일정' },
  { key: 'personal_events', label: '내 개인 일정' },
  { key: 'trips', label: '여행' },
  { key: 'tripDetails', label: '여행 세부 내용 (일정표·선택 사항·체크리스트)' },
  { key: 'bucketlists', label: '버킷리스트' },
  { key: 'sealedMessages', label: '봉인 편지' },
  { key: 'edit_logs', label: '수정 기록' },
  { key: 'couple', label: '커플 설정 (기념일·색상·버킷 카테고리·홈 사진)' },
];

const TRIP_DETAIL_KEYS = ['tripSchedules', 'travelTimes', 'travelDecisions', 'checklists'];

const summaryGroupOf = (collKey, item) => {
  if (collKey === 'eventSeries') return null;
  if (collKey === 'events' && item.data.eventType === 'travel') return null;
  if (TRIP_DETAIL_KEYS.includes(collKey)) return 'tripDetails';
  return collKey;
};

// 서브컬렉션(travelDecisions/checklists)은 여행마다 ID가 겹칠 수 있어(checklists는 항상 'main') tripId까지 키에 포함
const itemKey = (collKey, item) => (item.tripId ? `${item.tripId}/${item.id}` : item.id);

const defaultCheckImage = (url) => new Promise((resolve) => {
  if (!url || typeof Image === 'undefined') { resolve(false); return; }
  const img = new Image();
  const timer = setTimeout(() => resolve(false), 8000);
  img.onload = () => { clearTimeout(timer); resolve(true); };
  img.onerror = () => { clearTimeout(timer); resolve(false); };
  img.src = url;
});

export class RestoreError extends Error {}

// 커플 문서에서 "비어 있는 것만" 채울 값 계산 — 미리보기(plan)와 실제 쓰기(트랜잭션 안) 양쪽에서 씀
const computeCoupleFill = (current, backup, heroAvailable) => {
  const fields = {};
  let count = 0;
  if (!current.anniversaryDate && backup.anniversaryDate) { fields.anniversaryDate = backup.anniversaryDate; count += 1; }
  if (!current.eventTypeColors && backup.eventTypeColors) { fields.eventTypeColors = backup.eventTypeColors; count += 1; }
  if (!current.heroImageUrl && backup.heroImageUrl && heroAvailable) { fields.heroImageUrl = backup.heroImageUrl; count += 1; }
  const currentCats = Array.isArray(current.customCategories) ? current.customCategories : [];
  const backupCats = Array.isArray(backup.customCategories) ? backup.customCategories : [];
  const currentIds = new Set(currentCats.map((c) => c?.id));
  const missingCats = backupCats.filter((c) => c?.id && !currentIds.has(c.id));
  if (missingCats.length > 0) {
    fields.customCategories = [...currentCats, ...missingCats];
    count += missingCats.length;
  }
  return { fields, count };
};

/**
 * 복원 계획 — 아무것도 쓰지 않고, 무엇이 추가되고 무엇이 왜 건너뛰어지는지만 계산.
 * 반환값을 그대로 executeRestore에 넘김.
 */
export const planRestore = async ({ db, backup, coupleId, uid, checkImage = defaultCheckImage, onProgress }) => {
  if (backup.coupleId !== coupleId) {
    throw new RestoreError('다른 커플의 백업 파일이에요. 지금 연결된 커플에서 저장한 파일만 가져올 수 있어요.');
  }

  const current = await readBackupData({ db, coupleId, uid, includeSealedContent: false, onProgress });
  const existing = {};
  for (const [collKey, list] of Object.entries(current)) {
    if (Array.isArray(list)) existing[collKey] = new Set(list.map((item) => itemKey(collKey, item)));
  }

  const { collections } = backup;
  const isMissing = (collKey, item) => !existing[collKey]?.has(itemKey(collKey, item));
  const skipped = { partnerPersonal: 0, partnerLetters: 0, letterNoContent: 0, orphan: 0 };

  const writes = {};
  const pick = (collKey, filterFn) => {
    writes[collKey] = collections[collKey].filter((item) => isMissing(collKey, item) && filterFn(item));
  };

  pick('events', (i) => i.data.coupleId === coupleId);
  pick('trips', (i) => i.data.coupleId === coupleId);
  pick('bucketlists', (i) => i.data.coupleId === coupleId);
  pick('edit_logs', (i) => i.data.coupleId === coupleId);
  pick('personal_events', (i) => {
    if (i.data.userId === uid) return true;
    skipped.partnerPersonal += 1; // 파트너가 내보낸 파일 — 개인 일정은 본인만 복원 가능(규칙상)
    return false;
  });
  pick('eventSeries', (i) => (i.data.isPersonal ? i.data.userId === uid : i.data.coupleId === coupleId));

  // 여행 세부 내용은 그 여행이 지금 있거나 이번에 같이 복원될 때만 가능(규칙이 trips 문서 존재를 확인함)
  const availableTripIds = new Set([...existing.trips, ...writes.trips.map((t) => t.id)]);
  const tripExists = (tripId) => {
    if (availableTripIds.has(tripId)) return true;
    skipped.orphan += 1;
    return false;
  };
  pick('tripSchedules', (i) => tripExists(i.data.tripId));
  pick('travelTimes', (i) => tripExists(i.data.tripId));
  pick('travelDecisions', (i) => tripExists(i.tripId));
  pick('checklists', (i) => tripExists(i.tripId));

  // 봉인 편지는 규칙상 작성자 본인만 만들 수 있음 — 파트너가 쓴 편지는 파트너만 지울 수 있으니
  // 파트너가 자기 백업으로 복원하면 됨
  pick('sealedMessages', (i) => {
    if (i.data.coupleId !== coupleId) return false;
    if (i.data.authorUid !== uid) {
      skipped.partnerLetters += 1;
      return false;
    }
    // 내가 쓴 편지지만 파일에 내용이 없음 = 파트너가 내보낸 파일(봉인 중이라 파트너는 내용을 못 읽음).
    // 이대로 만들면 내용 없는 빈 편지가 되므로 건너뜀 — 내 백업 파일로 복원해야 함
    if (!i.content) {
      skipped.letterNoContent += 1;
      return false;
    }
    return true;
  });

  // 사진은 링크만 백업됨 — 원본이 지워졌으면(홈 사진 제거, 편지 삭제 시 Storage도 같이 삭제됨)
  // 깨진 이미지가 되므로, 지금도 열리는 링크만 되살림
  onProgress?.('사진 링크 확인');
  writes.sealedMessages = await Promise.all(writes.sealedMessages.map(async (m) => {
    const imageUrl = m.content?.imageUrl;
    if (!imageUrl) return m;
    const ok = await checkImage(imageUrl);
    return ok ? m : { ...m, content: { ...m.content, imageUrl: null }, imageDropped: true };
  }));
  const heroAvailable = !current.couple.heroImageUrl && backup.couple.heroImageUrl
    ? await checkImage(backup.couple.heroImageUrl)
    : false;

  const couplePreview = computeCoupleFill(current.couple, backup.couple, heroAvailable);

  const counts = Object.fromEntries(SUMMARY_GROUPS.map((g) => [g.key, { add: 0, total: 0 }]));
  for (const [collKey, list] of Object.entries(collections)) {
    for (const item of list) {
      const group = summaryGroupOf(collKey, item);
      if (group) counts[group].total += 1;
    }
  }
  for (const [collKey, list] of Object.entries(writes)) {
    for (const item of list) {
      const group = summaryGroupOf(collKey, item);
      if (group) counts[group].add += 1;
    }
  }
  counts.couple.add = couplePreview.count;

  const totalWrites = Object.values(writes).reduce((n, list) => n + list.length, 0) + (couplePreview.count > 0 ? 1 : 0);
  const totalAdd = Object.values(counts).reduce((n, c) => n + c.add, 0);

  return {
    coupleId,
    uid,
    writes,
    backupCouple: backup.couple,
    heroAvailable,
    counts,
    skipped,
    droppedImages: writes.sealedMessages.filter((m) => m.imageDropped).length,
    totalWrites,
    totalAdd,
  };
};

const withRestoreMark = (data) => {
  // 예전에 복원됐던 문서를 다시 백업→복원하는 경우 대비해 이전 표시는 버리고 새로 붙임
  const { restoredAt: _restoredAt, restoredUnlock: _restoredUnlock, ...rest } = data;
  return { ...rest, restoredAt: serverTimestamp() };
};

const docRefFor = (db, collKey, item) => {
  if (collKey === 'travelDecisions' || collKey === 'checklists') {
    return doc(db, 'trips', item.tripId, collKey, item.id);
  }
  return doc(db, collKey, item.id);
};

const commitInBatches = async (db, entries, onDone) => {
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(({ ref, data }) => batch.set(ref, data));
    await batch.commit();
    onDone(chunk.length);
  }
};

/**
 * 계획대로 실제 쓰기. 중간에 실패해도 다시 실행하면 이미 복원된 건 "있는 문서"로 건너뛰므로 안전하게 재시도 가능.
 * onProgress(done, total)
 */
export const executeRestore = async ({ db, plan, onProgress }) => {
  const { coupleId, writes } = plan;
  let done = 0;
  const advance = (n) => { done += n; onProgress?.(done, plan.totalWrites); };

  // 1) 커플 설정 — 버킷 카테고리 배열을 읽고-합쳐-쓰므로 트랜잭션(CLAUDE.md "배열 필드" 규칙)
  const coupleRef = doc(db, 'couples', coupleId);
  if (plan.counts.couple.add > 0) {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(coupleRef);
      const { fields, count } = computeCoupleFill(snap.data() || {}, plan.backupCouple, plan.heroAvailable);
      if (count > 0) tx.update(coupleRef, fields);
    });
    advance(1);
  }

  const toEntries = (collKey) => writes[collKey].map((item) => ({
    ref: docRefFor(db, collKey, item),
    data: withRestoreMark(item.data),
  }));

  // 2) 여행 먼저 커밋 — 일정표/이동시간/선택 사항/체크리스트 규칙이 trips 문서 "존재"를 확인하는데,
  //    규칙의 exists()/get()은 같은 배치 안의 쓰기를 못 봄
  await commitInBatches(db, toEntries('trips'), advance);

  // 3) 나머지 일반 문서
  const restKeys = ['events', 'personal_events', 'eventSeries', 'bucketlists', 'edit_logs', ...TRIP_DETAIL_KEYS];
  await commitInBatches(db, restKeys.flatMap(toEntries), advance);

  // 4) 봉인 편지 — 규칙상 봉인 상태(isUnlocked:false)로만 만들 수 있고, private/content 규칙이 상위 문서를
  //    get()으로 확인하므로 배치로 묶을 수 없음 → 한 통씩 순서대로: 상위 문서 → 내용 → (원래 공개됐으면) 공개 전환
  for (const m of writes.sealedMessages) {
    const ref = doc(db, 'sealedMessages', m.id);
    await setDoc(ref, { ...withRestoreMark(m.data), isUnlocked: false, unlockedAt: null });
    if (m.content) {
      await setDoc(doc(db, 'sealedMessages', m.id, 'private', 'content'), {
        content: m.content.content ?? '',
        imageUrl: m.content.imageUrl ?? null,
      });
    }
    if (m.data.isUnlocked === true) {
      await updateDoc(ref, {
        isUnlocked: true,
        unlockedAt: m.data.unlockedAt || serverTimestamp(),
        restoredUnlock: true,
      });
    }
    advance(1);
  }

  return { added: plan.totalAdd };
};
