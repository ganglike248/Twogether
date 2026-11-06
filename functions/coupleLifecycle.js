// functions/coupleLifecycle.js
// 커플 연결 해제 / 해제 취소 / 이전 커플 기록 내보내기 / 회원 탈퇴 / 보관 기간 지난 커플 삭제.
// index.js의 콜러블·스케줄 함수가 이 모듈을 호출함(linkPreview.js와 같은 분리 방식). 의존성(db/auth/bucket)을
// 인자로 받아서 에뮬레이터에서 이 모듈만 직접 불러 검증할 수 있게 함.
//
// 정책(2026-11-06 사용자 확정):
// - 해제는 둘 중 한 명이 혼자 가능. 해제 즉시 두 사람 모두 접근 차단(members를 비움 → 규칙의 isCoupleMe 실패).
// - 커플 데이터는 항상 30일 보관. 목적은 (1) 해제한 사람의 "연결 해제 취소", (2) 예전 멤버 둘 다 기록 파일 저장.
//   탈퇴로 인한 해제도 30일 보관(남은 사람이 저장할 수 있게) — 단 취소는 불가.
// - 예전 멤버가 모두 탈퇴하면(저장할 사람이 없으면) 30일을 기다리지 않고 바로 삭제.
// - 회원 탈퇴 시 본인 개인 데이터(사용자 문서·개인 일정·개인 반복 규칙·로그인 계정)는 즉시 삭제.

const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// 회원 탈퇴는 최근 로그인(재인증) 후에만 — 켜둔 채 방치된 기기에서 남이 누르는 것 방지
const RECENT_LOGIN_SECONDS = 5 * 60;

class LifecycleError extends Error {
  constructor(code, message, reason) {
    super(message);
    this.code = code; // functions.https.HttpsError 코드
    this.reason = reason || null; // 클라이언트 분기용(예: 'requires-recent-login')
  }
}

// notify(uid, kind): 'dissolved'(해제·탈퇴 직후 상대에게) | 'expiring'(삭제 3일 전, 예전 멤버에게) —
// 잠금화면에 그대로 보이므로 문구는 index.js에서 내용을 드러내지 않게 정함(사용자 결정)
const EXPIRY_REMINDER_DAYS = 3;

const createCoupleLifecycle = ({ db, auth, bucket, FieldValue, Timestamp, notify = async () => {} }) => {
  const couplesCol = db.collection('couples');
  const usersCol = db.collection('users');

  const fail = (code, message, reason) => { throw new LifecycleError(code, message, reason); };

  const toMillis = (ts) => (ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null);

  // ── 연결 해제 ─────────────────────────────────────────────────────────────
  // reason: 'leave'(직접 해제, 취소 가능) | 'account_deleted'(탈퇴, 취소 불가)
  // 반환: { coupleId, solo } — solo면 상대가 없던 커플(탈퇴 시에만 허용, 호출 측이 바로 삭제함)
  const safeNotify = (uid, kind) => notify(uid, kind).catch((e) => console.error(`[notify] ${kind} uid=${uid}`, e));

  const leaveCouple = async (uid, reason = 'leave') => {
    const result = await leaveCoupleTx(uid, reason);
    if (!result.solo && result.partnerUid) await safeNotify(result.partnerUid, 'dissolved');
    return result;
  };

  const leaveCoupleTx = async (uid, reason) => {
    const userRef = usersCol.doc(uid);
    return db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const coupleId = userSnap.data()?.coupleId || null;
      if (!coupleId) fail('failed-precondition', '연결된 커플이 없어요.');

      const coupleRef = couplesCol.doc(coupleId);
      const coupleSnap = await tx.get(coupleRef);
      const members = coupleSnap.exists ? (coupleSnap.data().members || []) : [];
      if (!members.includes(uid)) {
        // 상대가 거의 동시에 먼저 해제한 경우 등 — 이미 끝난 상태
        fail('failed-precondition', '이미 연결이 해제된 커플이에요.');
      }

      if (members.length < 2) {
        if (reason === 'leave') fail('failed-precondition', '아직 상대방이 연결되지 않았어요.');
        tx.update(userRef, { coupleId: null });
        return { coupleId, solo: true };
      }

      // 트랜잭션은 읽기를 쓰기보다 먼저 해야 함 — 상대 사용자 문서까지 먼저 읽음
      const partnerUid = members.find((m) => m !== uid);
      const partnerRef = usersCol.doc(partnerUid);
      const partnerSnap = await tx.get(partnerRef);

      const now = Timestamp.now();
      tx.update(coupleRef, {
        members: [],
        // ⚠ 순서 그대로 보관 — members[0]=boyfriend, [1]=girlfriend라 취소 시 순서가 바뀌면 역할·색상이 뒤바뀜
        formerMembers: members,
        dissolvedAt: now,
        dissolvedBy: uid,
        dissolveReason: reason,
        purgeAfter: Timestamp.fromMillis(now.toMillis() + RETENTION_DAYS * DAY_MS),
        deletedMembers: reason === 'account_deleted' ? [uid] : [],
      });
      tx.update(userRef, { coupleId: null });
      if (partnerSnap.exists) {
        // 상대는 다음에 앱을 열 때 "커플 연결이 해제됐어요" 안내를 봄(해제/탈퇴 구분 없이 같은 문구)
        tx.update(partnerRef, { coupleId: null, coupleEndedNotice: { coupleId, at: now } });
      }
      return { coupleId, solo: false, partnerUid };
    });
  };

  // 예전 멤버 각자의 "지금 다른 커플에 연결돼 있는지"(=취소 불가 조건) 확인용
  const readUsers = async (uids, tx) => Promise.all(
    uids.map((u) => (tx ? tx.get(usersCol.doc(u)) : usersCol.doc(u).get())),
  );

  const isRetained = (data, nowMs) => !!data?.dissolvedAt && toMillis(data.purgeAfter) > nowMs;

  const computeCanCancel = (data, uid, userSnaps, nowMs) => (
    isRetained(data, nowMs)
    && data.dissolvedBy === uid
    && data.dissolveReason === 'leave'
    && (data.deletedMembers || []).length === 0
    && userSnaps.every((s) => s.exists && !s.data().coupleId)
  );

  // ── 연결 해제 취소 (해제한 사람만, 30일 안, 둘 다 다른 커플에 연결 안 했을 때) ──────────
  const cancelLeave = async (uid, coupleId) => {
    if (!coupleId) fail('invalid-argument', '커플 정보가 필요해요.');
    const coupleRef = couplesCol.doc(coupleId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(coupleRef);
      const data = snap.exists ? snap.data() : null;
      const nowMs = Date.now();
      if (!data?.dissolvedAt) fail('failed-precondition', '해제된 커플이 아니에요.');
      if (!(data.formerMembers || []).includes(uid)) fail('permission-denied', '이 커플의 예전 멤버가 아니에요.');
      if (data.dissolvedBy !== uid || data.dissolveReason !== 'leave') {
        fail('permission-denied', '연결을 해제한 사람만 취소할 수 있어요.');
      }
      if (!isRetained(data, nowMs)) fail('failed-precondition', '보관 기간이 지나 취소할 수 없어요.');

      const former = data.formerMembers;
      const userSnaps = await readUsers(former, tx);
      if ((data.deletedMembers || []).length > 0 || userSnaps.some((s) => !s.exists)) {
        fail('failed-precondition', '상대방이 탈퇴해서 취소할 수 없어요.');
      }
      if (userSnaps.some((s) => s.data().coupleId)) {
        fail('failed-precondition', '이미 다른 커플과 연결돼 있어서 취소할 수 없어요.');
      }

      tx.update(coupleRef, {
        members: former, // 원래 순서 그대로
        formerMembers: FieldValue.delete(),
        dissolvedAt: FieldValue.delete(),
        dissolvedBy: FieldValue.delete(),
        dissolveReason: FieldValue.delete(),
        purgeAfter: FieldValue.delete(),
        deletedMembers: FieldValue.delete(),
        expiryReminderSent: FieldValue.delete(),
      });
      former.forEach((m) => {
        tx.update(usersCol.doc(m), {
          coupleId,
          coupleEndedNotice: FieldValue.delete(),
          ...(m !== uid ? { coupleRestoredNotice: { coupleId, at: Timestamp.now() } } : {}),
        });
      });
    });
    // custom claims 복구는 onCoupleUpdate 트리거가 "추가된 멤버"로 처리함
    return { coupleId };
  };

  // ── 보관 중인 이전 커플 목록 (커플 연결 화면 카드 / 데이터 백업 화면용) ───────────────
  const listFormerCouples = async (uid) => {
    const snap = await couplesCol.where('formerMembers', 'array-contains', uid).get();
    const nowMs = Date.now();
    const result = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!isRetained(data, nowMs)) continue;
      const userSnaps = await readUsers(data.formerMembers);
      const partnerSnap = userSnaps.find((s) => s.id !== uid);
      const purgeMs = toMillis(data.purgeAfter);
      result.push({
        coupleId: docSnap.id,
        dissolvedAt: toMillis(data.dissolvedAt),
        purgeAfter: purgeMs,
        daysLeft: Math.max(0, Math.ceil((purgeMs - nowMs) / DAY_MS)),
        canCancel: computeCanCancel(data, uid, userSnaps, nowMs),
        partnerName: partnerSnap?.exists ? (partnerSnap.data().displayName || '상대방') : '상대방',
      });
    }
    return result.sort((a, b) => b.dissolvedAt - a.dissolvedAt);
  };

  // ── 이전 커플 기록 내보내기 ─────────────────────────────────────────────────
  // 해제 후엔 규칙상 클라이언트가 못 읽으므로 서버가 대신 읽음. 공개 범위는 앱과 동일하게 맞춤:
  // 봉인 편지 내용은 내가 썼거나 이미 공개된 것만, 개인 일정은 아예 포함 안 함(커플 데이터만).
  // 반환 형태는 클라이언트 backupReader 결과와 같고, Timestamp는 backupFormat의 {"__ts":[s,ns]} 태그로 인코딩.
  const encode = (value) => {
    if (value instanceof Timestamp) return { __ts: [value.seconds, value.nanoseconds] };
    if (Array.isArray(value)) return value.map(encode);
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = encode(v);
      return out;
    }
    return value;
  };
  const items = (snap, extra = {}) => snap.docs.map((d) => ({ id: d.id, ...extra, data: encode(d.data()) }));

  const exportFormerCouple = async (uid, coupleId) => {
    if (!coupleId) fail('invalid-argument', '커플 정보가 필요해요.');
    const coupleSnap = await couplesCol.doc(coupleId).get();
    const couple = coupleSnap.exists ? coupleSnap.data() : null;
    if (!couple?.dissolvedAt || !(couple.formerMembers || []).includes(uid)) {
      fail('permission-denied', '저장할 수 있는 이전 커플 기록이 없어요.');
    }
    if (!isRetained(couple, Date.now())) fail('failed-precondition', '보관 기간이 지나 기록이 삭제됐어요.');

    const [eventsSnap, seriesSnap, tripsSnap, bucketSnap, sealedSnap] = await Promise.all([
      db.collection('events').where('coupleId', '==', coupleId).get(),
      db.collection('eventSeries').where('coupleId', '==', coupleId).where('isPersonal', '==', false).get(),
      db.collection('trips').where('coupleId', '==', coupleId).get(),
      db.collection('bucketlists').where('coupleId', '==', coupleId).get(),
      db.collection('sealedMessages').where('coupleId', '==', coupleId).get(),
    ]);
    const tripDetails = await Promise.all(tripsSnap.docs.map(async (t) => {
      const [s, tt, d, c] = await Promise.all([
        db.collection('tripSchedules').where('tripId', '==', t.id).get(),
        db.collection('travelTimes').where('tripId', '==', t.id).get(),
        t.ref.collection('travelDecisions').get(),
        t.ref.collection('checklists').get(),
      ]);
      return { tripSchedules: items(s), travelTimes: items(tt), travelDecisions: items(d, { tripId: t.id }), checklists: items(c, { tripId: t.id }) };
    }));
    const sealedMessages = await Promise.all(sealedSnap.docs.map(async (m) => {
      const data = m.data();
      const readable = data.authorUid === uid || data.isUnlocked === true;
      const content = readable ? (await m.ref.collection('private').doc('content').get()).data() || null : null;
      return { id: m.id, data: encode(data), content: content ? encode(content) : null };
    }));

    const userSnaps = await readUsers(couple.formerMembers);
    const memberNames = Object.fromEntries(couple.formerMembers.map((m, i) => [
      m, userSnaps[i].exists ? (userSnaps[i].data().displayName || '') : '',
    ]));

    // 커플 문서에서 기록에 필요한 것만 (해제 관리용 필드는 제외)
    const { anniversaryDate = null, customCategories = [], eventTypeColors = null, heroImageUrl = null } = couple;
    const flat = (k) => tripDetails.flatMap((t) => t[k]);
    return {
      coupleId,
      formerMembers: couple.formerMembers,
      memberNames,
      couple: encode({ anniversaryDate, customCategories, eventTypeColors, heroImageUrl }),
      collections: {
        events: items(eventsSnap),
        eventSeries: items(seriesSnap),
        trips: items(tripsSnap),
        tripSchedules: flat('tripSchedules'),
        travelTimes: flat('travelTimes'),
        travelDecisions: flat('travelDecisions'),
        checklists: flat('checklists'),
        bucketlists: items(bucketSnap),
        sealedMessages,
      },
    };
  };

  // ── 커플 데이터 완전 삭제 ──────────────────────────────────────────────────
  // ⚠ personal_events와 개인 반복 규칙(eventSeries.isPersonal==true)에도 coupleId가 저장돼 있음 —
  // "coupleId로 찾아서 지우기"를 그 컬렉션에 쓰면 두 사람의 개인 일정까지 날아감. 개인 데이터는
  // 사용자 소유라 커플 삭제 대상이 아님(본인 탈퇴 때만 deleteAccount가 지움).
  const purgeCouple = async (coupleId) => {
    const writer = db.bulkWriter();
    const deleteQuery = async (q) => {
      const snap = await q.get();
      snap.docs.forEach((d) => writer.delete(d.ref));
      return snap.docs;
    };

    const trips = await db.collection('trips').where('coupleId', '==', coupleId).get();
    for (const t of trips.docs) {
      await deleteQuery(db.collection('tripSchedules').where('tripId', '==', t.id));
      await deleteQuery(db.collection('travelTimes').where('tripId', '==', t.id));
      await db.recursiveDelete(t.ref, writer); // travelDecisions·checklists 서브컬렉션 포함
    }
    await deleteQuery(db.collection('events').where('coupleId', '==', coupleId));
    await deleteQuery(db.collection('eventSeries').where('coupleId', '==', coupleId).where('isPersonal', '==', false));
    await deleteQuery(db.collection('bucketlists').where('coupleId', '==', coupleId));
    await deleteQuery(db.collection('edit_logs').where('coupleId', '==', coupleId));
    await deleteQuery(db.collection('inviteCodes').where('coupleId', '==', coupleId));
    const letters = await db.collection('sealedMessages').where('coupleId', '==', coupleId).get();
    for (const m of letters.docs) await db.recursiveDelete(m.ref, writer); // private/content 포함
    await writer.close();

    if (bucket) {
      for (const prefix of [`couples/${coupleId}/`, `sealedMessages/${coupleId}/`, `events/${coupleId}/`]) {
        await bucket.deleteFiles({ prefix }).catch((e) => console.error(`[purgeCouple] storage ${prefix}`, e.message));
      }
    }
    await couplesCol.doc(coupleId).delete();
    console.log(`[purgeCouple] coupleId=${coupleId} 삭제 완료`);
  };

  // 매일 스케줄: 보관 기간 지난 커플 삭제 + 삭제 3일 전 안내(커플당 1번)
  const purgeExpired = async () => {
    const nowMs = Date.now();
    const horizon = Timestamp.fromMillis(nowMs + EXPIRY_REMINDER_DAYS * DAY_MS);
    const snap = await couplesCol.where('purgeAfter', '<=', horizon).get();
    let purged = 0;
    let reminded = 0;
    for (const d of snap.docs) {
      const data = d.data();
      if (!data.dissolvedAt) continue;
      try {
        if (toMillis(data.purgeAfter) <= nowMs) {
          await purgeCouple(d.id);
          purged += 1;
        } else if (!data.expiryReminderSent) {
          const alive = (data.formerMembers || []).filter((m) => !(data.deletedMembers || []).includes(m));
          for (const m of alive) await safeNotify(m, 'expiring');
          await d.ref.update({ expiryReminderSent: true });
          reminded += 1;
        }
      } catch (e) { console.error(`[purgeExpired] coupleId=${d.id}`, e); }
    }
    return { purged, reminded };
  };

  // ── 회원 탈퇴 ─────────────────────────────────────────────────────────────
  const deleteAccount = async (uid, authTimeSec) => {
    if (!authTimeSec || Date.now() / 1000 - authTimeSec > RECENT_LOGIN_SECONDS) {
      fail('failed-precondition', '보안을 위해 다시 로그인한 뒤 진행해주세요.', 'requires-recent-login');
    }

    // 1) 지금 커플 — 상대가 있으면 30일 보관(취소 불가), 혼자였으면 바로 삭제
    const userSnap = await usersCol.doc(uid).get();
    if (userSnap.data()?.coupleId) {
      const { coupleId, solo } = await leaveCouple(uid, 'account_deleted');
      if (solo) await purgeCouple(coupleId);
    }

    // 2) 이미 해제돼 보관 중인 예전 커플 — 탈퇴자로 표시, 예전 멤버가 모두 탈퇴했으면 바로 삭제
    const former = await couplesCol.where('formerMembers', 'array-contains', uid).get();
    for (const d of former.docs) {
      const data = d.data();
      if (!data.dissolvedAt) continue;
      const deleted = [...new Set([...(data.deletedMembers || []), uid])];
      if (data.formerMembers.every((m) => deleted.includes(m))) {
        await purgeCouple(d.id);
      } else {
        await d.ref.update({ deletedMembers: deleted });
      }
    }

    // 3) 개인 데이터
    const writer = db.bulkWriter();
    const personal = await db.collection('personal_events').where('userId', '==', uid).get();
    personal.docs.forEach((d) => writer.delete(d.ref));
    const series = await db.collection('eventSeries').where('userId', '==', uid).where('isPersonal', '==', true).get();
    series.docs.forEach((d) => writer.delete(d.ref));
    writer.delete(usersCol.doc(uid));
    await writer.close();

    // 4) 로그인 계정은 마지막 — 중간에 실패해도 다시 로그인해서 재시도할 수 있게
    await auth.deleteUser(uid);
    console.log(`[deleteAccount] uid=${uid} 탈퇴 완료 (개인 일정 ${personal.size}, 개인 반복 ${series.size})`);
    return { deleted: true };
  };

  return {
    leaveCouple, cancelLeave, listFormerCouples, exportFormerCouple, purgeCouple, purgeExpired, deleteAccount,
  };
};

module.exports = { createCoupleLifecycle, LifecycleError, RETENTION_DAYS, RECENT_LOGIN_SECONDS };
