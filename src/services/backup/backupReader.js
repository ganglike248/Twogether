// src/services/backup/backupReader.js
// 백업 대상 데이터를 서버에서 전부 읽음 — 내보내기와 "가져오기 전 현재 상태 비교" 양쪽에서 씀.
// db를 인자로 받는 이유: 앱(firebase.js) 인스턴스에 묶지 않아야 에뮬레이터로 그대로 검증할 수 있음.
//
// ⚠ 반드시 getDocsFromServer — 오프라인 캐시(persistentLocalCache)에서 읽으면 서버엔 있는데 캐시엔
// 없는 문서를 "없음"으로 오판해서, 복원이 그 문서를 setDoc으로 덮어써 최신 수정분을 날릴 수 있음.
// ⚠ 모든 list 쿼리에 규칙이 참조하는 필드(coupleId/userId/tripId, eventSeries는 isPersonal까지)를
// 동등 조건으로 넣을 것 — 없으면 쿼리 자체가 permission-denied (CLAUDE.md "list 쿼리" 트랩 참고).
import {
  collection, doc, query, where, getDocsFromServer, getDocFromServer,
} from 'firebase/firestore';

const toItems = (snap, extra = {}) => snap.docs.map((d) => ({ id: d.id, ...extra, data: d.data() }));

const readWhere = async (db, collName, ...conditions) => {
  const q = query(collection(db, collName), ...conditions.map(([f, v]) => where(f, '==', v)));
  return getDocsFromServer(q);
};

// includeSealedContent: 봉인 편지 내용(private/content)까지 읽을지 — 내보내기만 필요, 비교엔 불필요
export const readBackupData = async ({ db, coupleId, uid, includeSealedContent = true, onProgress }) => {
  const step = (label) => onProgress?.(label);

  step('커플 정보');
  const coupleSnap = await getDocFromServer(doc(db, 'couples', coupleId));
  const couple = coupleSnap.exists() ? coupleSnap.data() : {};

  step('일정');
  const [eventsSnap, personalSnap, coupleSeriesSnap, personalSeriesSnap] = await Promise.all([
    readWhere(db, 'events', ['coupleId', coupleId]),
    readWhere(db, 'personal_events', ['userId', uid]),
    readWhere(db, 'eventSeries', ['coupleId', coupleId], ['isPersonal', false]),
    readWhere(db, 'eventSeries', ['userId', uid], ['isPersonal', true]),
  ]);

  step('여행');
  const tripsSnap = await readWhere(db, 'trips', ['coupleId', coupleId]);
  const trips = toItems(tripsSnap);
  const tripDetails = await Promise.all(trips.map(async ({ id: tripId }) => {
    const [schedules, times, decisions, checklists] = await Promise.all([
      readWhere(db, 'tripSchedules', ['tripId', tripId]),
      readWhere(db, 'travelTimes', ['tripId', tripId]),
      getDocsFromServer(collection(db, 'trips', tripId, 'travelDecisions')),
      getDocsFromServer(collection(db, 'trips', tripId, 'checklists')),
    ]);
    return {
      tripSchedules: toItems(schedules),
      travelTimes: toItems(times),
      travelDecisions: toItems(decisions, { tripId }),
      checklists: toItems(checklists, { tripId }),
    };
  }));

  step('버킷리스트 · 봉인 편지 · 수정 기록');
  const [bucketSnap, sealedSnap, logsSnap] = await Promise.all([
    readWhere(db, 'bucketlists', ['coupleId', coupleId]),
    readWhere(db, 'sealedMessages', ['coupleId', coupleId]),
    readWhere(db, 'edit_logs', ['coupleId', coupleId]),
  ]);

  let sealedMessages = toItems(sealedSnap);
  if (includeSealedContent) {
    // 내용은 내가 썼거나 이미 공개된 편지만 규칙상 읽을 수 있음 — 나머지(파트너가 쓴 봉인 중 편지)는
    // 원래 설계대로 내용 없이 제목/예정시각만 백업됨(content: null)
    sealedMessages = await Promise.all(sealedMessages.map(async (m) => {
      const readable = m.data.authorUid === uid || m.data.isUnlocked === true;
      if (!readable) return { ...m, content: null };
      const contentSnap = await getDocFromServer(doc(db, 'sealedMessages', m.id, 'private', 'content'));
      return { ...m, content: contentSnap.exists() ? contentSnap.data() : null };
    }));
  }

  const flat = (key) => tripDetails.flatMap((t) => t[key]);
  return {
    couple,
    events: toItems(eventsSnap),
    personal_events: toItems(personalSnap),
    eventSeries: [...toItems(coupleSeriesSnap), ...toItems(personalSeriesSnap)],
    trips,
    tripSchedules: flat('tripSchedules'),
    travelTimes: flat('travelTimes'),
    travelDecisions: flat('travelDecisions'),
    checklists: flat('checklists'),
    bucketlists: toItems(bucketSnap),
    sealedMessages,
    edit_logs: toItems(logsSnap),
  };
};
