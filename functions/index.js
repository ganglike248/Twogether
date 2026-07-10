const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// 특정 유저에게 웹 푸시 발송 — notification 필드를 쓰면 브라우저 자동 표시 + onBackgroundMessage
// 수동 표시가 겹쳐 모바일에서 알림이 2번 뜨는 문제가 있어 data-only로 보내고 클라이언트(sw.js)에서만 표시함.
// type: NotificationSettingsModal.jsx의 NOTIFICATION_TYPES key와 일치해야 함(defaultOn도 그쪽과 동일하게
// 맞출 것). type을 안 넘기면(예: 커플 연결) 설정과 무관하게 무조건 발송함.
async function sendPushToUser(uid, { title, body, link }, logTag, type, defaultOn = true) {
  const userSnap = await db.collection('users').doc(uid).get();
  const userData = userSnap.data() || {};

  if (type) {
    const pref = userData.notificationPrefs?.[type];
    const enabled = pref === undefined ? defaultOn : pref;
    if (!enabled) {
      console.log(`[${logTag}] skip: uid=${uid}가 '${type}' 알림을 꺼둠`);
      return;
    }
  }

  const tokens = userData.fcmTokens || [];
  if (tokens.length === 0) {
    console.log(`[${logTag}] skip: uid=${uid}에게 저장된 fcmTokens 없음`);
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    data: { title, body, link: link || '/' },
    webpush: { headers: { Urgency: 'high' } },
  });

  console.log(`[${logTag}] 발송 완료: 성공 ${response.successCount} / 실패 ${response.failureCount}`);
  response.responses.forEach((r, i) => {
    if (!r.success) console.log(`[${logTag}] 토큰 발송 실패 [${i}]: ${r.error?.code} - ${r.error?.message}`);
  });

  // 만료/등록 취소된 토큰은 정리
  const staleTokens = response.responses
    .map((r, i) => (!r.success && r.error?.code === 'messaging/registration-token-not-registered' ? tokens[i] : null))
    .filter(Boolean);

  if (staleTokens.length > 0) {
    await db.collection('users').doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
    });
  }
}

// ✅ 커플 생성 시 custom claims 설정 (members[0] = 커플 생성자)
exports.onCoupleCreate = functions.firestore
  .document('couples/{coupleId}')
  .onCreate(async (snap, context) => {
    try {
      const coupleId = context.params.coupleId;
      const { members } = snap.data();

      if (!members || members.length === 0) {
        console.warn(`[onCoupleCreate] coupleId=${coupleId} has no members`);
        return;
      }

      // 커플의 모든 멤버에게 custom claim 설정
      for (const uid of members) {
        try {
          await auth.setCustomUserClaims(uid, {
            coupleIds: [coupleId]
          });
          console.log(`[onCoupleCreate] coupleId=${coupleId} uid=${uid} custom claims set`);
        } catch (err) {
          console.error(`[onCoupleCreate] Failed to set claims for uid=${uid}:`, err);
        }
      }
    } catch (error) {
      console.error('[onCoupleCreate] Error:', error);
    }
  });

// ✅ 커플에 멤버 추가 시 custom claims 업데이트
exports.onCoupleUpdate = functions.firestore
  .document('couples/{coupleId}')
  .onUpdate(async (change, context) => {
    try {
      const coupleId = context.params.coupleId;
      const oldMembers = change.before.data().members || [];
      const newMembers = change.after.data().members || [];

      // 새로 추가된 멤버 찾기
      const addedMembers = newMembers.filter(uid => !oldMembers.includes(uid));

      if (addedMembers.length === 0) {
        return; // 멤버 추가 없음
      }

      // 새 멤버들에게 custom claim 설정
      for (const uid of addedMembers) {
        try {
          // 기존 coupleIds 가져오기 (여러 커플 지원)
          const existingClaims = (await auth.getUser(uid)).customClaims || {};
          const existingCoupleIds = existingClaims.coupleIds || [];

          await auth.setCustomUserClaims(uid, {
            coupleIds: [...new Set([...existingCoupleIds, coupleId])]
          });
          console.log(`[onCoupleUpdate] coupleId=${coupleId} uid=${uid} custom claims updated`);
        } catch (err) {
          console.error(`[onCoupleUpdate] Failed to set claims for uid=${uid}:`, err);
        }
      }

      // 기존 멤버들에게 "파트너와 연결됐어요" 알림 발송
      for (const newUid of addedMembers) {
        const newUserSnap = await db.collection('users').doc(newUid).get();
        const newUserName = newUserSnap.data()?.displayName || '상대방';

        for (const existingUid of oldMembers) {
          // 커플 연결은 최초 1회뿐이고 항상 필요해서 설정과 무관하게 무조건 발송 (type 인자 없음)
          await sendPushToUser(existingUid, {
            title: `${newUserName}님과 연결됐어요!`,
            body: '이제 함께 일정을 관리해보세요',
            link: '/',
          }, 'onCoupleUpdate');
        }
      }
    } catch (error) {
      console.error('[onCoupleUpdate] Error:', error);
    }
  });

// coupleId 기준으로 actorUid가 아닌 다른 멤버(파트너) uid를 찾음
async function getPartnerUid(coupleId, actorUid, logTag) {
  const coupleSnap = await db.collection('couples').doc(coupleId).get();
  const members = coupleSnap.data()?.members || [];
  const partnerUid = members.find((uid) => uid !== actorUid);
  if (!partnerUid) {
    console.log(`[${logTag}] skip: 파트너 없음 (coupleId=${coupleId}, members=${JSON.stringify(members)})`);
  }
  return partnerUid || null;
}

// ✅ 커플 일정 추가 시 파트너에게 푸시 알림 발송
exports.onEventCreate = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snap, context) => {
    try {
      const { coupleId, createdBy, title } = snap.data();
      if (!coupleId || !createdBy) {
        console.log(`[onEventCreate] skip: coupleId/createdBy 없음 (coupleId=${coupleId}, createdBy=${createdBy})`);
        return;
      }

      const partnerUid = await getPartnerUid(coupleId, createdBy, 'onEventCreate');
      if (!partnerUid) return;

      const creatorSnap = await db.collection('users').doc(createdBy).get();
      const creatorName = creatorSnap.data()?.displayName || '상대방';

      await sendPushToUser(partnerUid, {
        title: `${creatorName}님이 일정을 추가했어요`,
        body: title || '새 일정을 확인해보세요',
        link: '/calendar',
      }, 'onEventCreate', 'eventCreate');
    } catch (error) {
      console.error('[onEventCreate] Error:', error);
    }
  });

// ✅ 일정 날짜/시간 변경 시 파트너에게 푸시 알림 발송 (제목·메모 등 다른 필드 수정은 알림 대상 아님)
exports.onEventUpdate = functions.firestore
  .document('events/{eventId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      if (before.start === after.start && before.end === after.end) {
        return; // 날짜/시간 변경 없음 — 알림 대상 아님
      }

      const { coupleId, updatedBy, title } = after;
      if (!coupleId || !updatedBy) {
        console.log(`[onEventUpdate] skip: coupleId/updatedBy 없음 (coupleId=${coupleId}, updatedBy=${updatedBy})`);
        return;
      }

      const partnerUid = await getPartnerUid(coupleId, updatedBy, 'onEventUpdate');
      if (!partnerUid) return;

      const editorSnap = await db.collection('users').doc(updatedBy).get();
      const editorName = editorSnap.data()?.displayName || '상대방';

      await sendPushToUser(partnerUid, {
        title: `${editorName}님이 일정 날짜를 변경했어요`,
        body: title || '변경된 일정을 확인해보세요',
        link: '/calendar',
      }, 'onEventUpdate', 'eventUpdate', false);
    } catch (error) {
      console.error('[onEventUpdate] Error:', error);
    }
  });

// ✅ FCM 토큰을 현재 로그인 계정에만 등록 — 같은 브라우저로 예전에 다른 계정을 테스트했다면
// FCM 토큰 자체는 계정이 아니라 브라우저 단위라 이전 계정 문서에 토큰이 남아있을 수 있음.
// 등록 전 다른 모든 계정 문서에서 이 토큰을 제거해 "토큰 1개 = 계정 1개"를 강제함.
exports.registerFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const { token } = data;
  if (!token || typeof token !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'token이 필요합니다.');
  }

  const uid = context.auth.uid;
  const holders = await db.collection('users').where('fcmTokens', 'array-contains', token).get();

  const batch = db.batch();
  holders.forEach((docSnap) => {
    if (docSnap.id !== uid) {
      console.log(`[registerFcmToken] uid=${docSnap.id} 문서에서 다른 계정(${uid}) 소유 토큰 제거`);
      batch.update(docSnap.ref, { fcmTokens: admin.firestore.FieldValue.arrayRemove(token) });
    }
  });
  batch.update(db.collection('users').doc(uid), { fcmTokens: admin.firestore.FieldValue.arrayUnion(token) });
  await batch.commit();

  return { success: true };
});

// KST 기준 'YYYY-MM-DD' 문자열 — 서버는 UTC로 도는데 스케줄은 Asia/Seoul 기준이라 날짜 계산도 KST로 맞춤
function getKstDateStr(offsetDays = 0) {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// src/utils/koreanHolidays.js의 COUPLE_DAYS와 동일 목록(+ 알림 본문용 suggestion 추가) — Cloud Functions는
// 별도 Node 패키지라 클라이언트 소스를 직접 import할 수 없어 복사함. 저쪽 목록이 바뀌면 여기도 같이 갱신할 것.
const COUPLE_DAYS = [
  { month: 1,  day: 14, name: '다이어리데이', suggestion: '다이어리를 선물하며 새해 계획을 함께 세워보는 건 어때요?' },
  { month: 2,  day: 14, name: '발렌타인데이', suggestion: '연인에게 초콜릿을 전해보는 건 어때요?' },
  { month: 3,  day: 14, name: '화이트데이', suggestion: '사탕이나 작은 선물로 마음을 전해보는 건 어때요?' },
  { month: 4,  day: 14, name: '블랙데이', suggestion: '짜장면 한 그릇 어때요? 오늘도 함께라 행복하죠' },
  { month: 5,  day: 14, name: '로즈데이', suggestion: '장미꽃 한 송이를 선물해보는 건 어때요?' },
  { month: 6,  day: 14, name: '키스데이', suggestion: '오늘은 애정표현을 더 듬뿍 해보는 건 어때요?' },
  { month: 7,  day: 14, name: '실버데이', suggestion: '커플 아이템으로 마음을 전해보는 건 어때요?' },
  { month: 8,  day: 14, name: '그린데이', suggestion: '함께 초록빛 산책을 나가보는 건 어때요?' },
  { month: 9,  day: 14, name: '포토데이', suggestion: '오늘은 함께 예쁜 사진을 남겨보는 건 어때요?' },
  { month: 10, day: 14, name: '와인데이', suggestion: '와인 한 잔과 함께 근사한 저녁을 즐겨보는 건 어때요?' },
  { month: 11, day: 11, name: '빼빼로데이', suggestion: '빼빼로를 주고받으며 마음을 전해보는 건 어때요?' },
  { month: 11, day: 14, name: '무비데이', suggestion: '오늘은 함께 영화 한 편 어때요?' },
  { month: 12, day: 14, name: '허그데이', suggestion: '오늘은 서로를 꼭 안아주는 건 어때요?' },
  { month: 12, day: 24, name: '크리스마스 이브', suggestion: '특별한 크리스마스 이브를 함께 보내보는 건 어때요?' },
];

// 주어진 날짜(dateStr)에 해당하는 기념일들을 { name, body } 형태로 전부 반환 — 100일 단위/매년 기념일
// (anniversaryDate 필요) + 연애 시작일과 무관하게 매년 고정으로 오는 이벤트데이(COUPLE_DAYS, 종류별 맞춤 문구).
// 호출 시점(오늘/내일)에 따라 day-of, D-1 알림에 재사용함.
function getMilestoneEvents(anniversaryDateStr, dateStr) {
  const events = [];
  const defaultBody = '축하해요, 오늘 하루도 예쁘게 보내요';

  if (anniversaryDateStr) {
    const start = new Date(`${anniversaryDateStr}T00:00:00Z`);
    const target = new Date(`${dateStr}T00:00:00Z`);
    const dayCount = Math.round((target - start) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount > 0 && dayCount % 100 === 0) {
      events.push({ name: `${dayCount}일`, body: defaultBody });
    }

    const [sy, sm, sd] = anniversaryDateStr.split('-').map(Number);
    const [ty, tm, td] = dateStr.split('-').map(Number);
    if (sm === tm && sd === td && ty > sy) {
      events.push({ name: `${ty - sy}주년`, body: defaultBody });
    }
  }

  const [, m, d] = dateStr.split('-').map(Number);
  const coupleDay = COUPLE_DAYS.find((c) => c.month === m && c.day === d);
  if (coupleDay) events.push({ name: coupleDay.name, body: coupleDay.suggestion });

  return events;
}

// ✅ 매일 오전 9시(KST): 여행 시작 D-day + 기념일 D-day
exports.sendMorningReminders = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    try {
      // 여행 시작 D-3 / D-1
      const d1 = getKstDateStr(1);
      const d3 = getKstDateStr(3);
      const tripsSnap = await db.collection('trips').where('startDate', 'in', [d1, d3]).get();

      const tripCoupleIds = [...new Set(tripsSnap.docs.map((d) => d.data().coupleId).filter(Boolean))];
      const membersByCouple = new Map();
      await Promise.all(tripCoupleIds.map(async (cid) => {
        const snap = await db.collection('couples').doc(cid).get();
        membersByCouple.set(cid, snap.data()?.members || []);
      }));

      for (const doc of tripsSnap.docs) {
        const { coupleId, title, startDate } = doc.data();
        if (!coupleId) continue;
        const ddayLabel = startDate === d1 ? '내일' : '3일 후';
        const members = membersByCouple.get(coupleId) || [];
        for (const uid of members) {
          await sendPushToUser(uid, {
            title: `여행이 ${ddayLabel} 시작해요`,
            body: title || '여행 일정을 확인해보세요',
            link: '/travel',
          }, 'sendMorningReminders', 'tripDday', true);
        }
      }

      // 기념일 D-day + D-1 (모든 커플의 anniversaryDate를 순회해야 해서 커플 전체 스캔 필요.
      // anniversaryDate가 없어도 이벤트데이(발렌타인데이 등)는 대상이라 members만 확인)
      const todayStr = getKstDateStr(0);
      const tomorrowStr = getKstDateStr(1);
      const couplesSnap = await db.collection('couples').get();
      for (const doc of couplesSnap.docs) {
        const { members, anniversaryDate } = doc.data();
        if (!members?.length) continue;

        for (const evt of getMilestoneEvents(anniversaryDate, todayStr)) {
          for (const uid of members) {
            await sendPushToUser(uid, {
              title: `오늘은 ${evt.name}이에요 🎉`,
              body: evt.body,
              link: '/',
            }, 'sendMorningReminders', 'anniversaryDday', true);
          }
        }

        for (const evt of getMilestoneEvents(anniversaryDate, tomorrowStr)) {
          for (const uid of members) {
            await sendPushToUser(uid, {
              title: `내일은 ${evt.name}이에요`,
              body: evt.body,
              link: '/',
            }, 'sendMorningReminders', 'anniversaryDday', true);
          }
        }
      }
    } catch (error) {
      console.error('[sendMorningReminders] Error:', error);
    }
  });

// ✅ 매일 오후 9시(KST): 내일 일정 리마인드 (커플 공유 일정 + 개인 일정 통합해서 1건으로 발송)
exports.sendEveningReminders = functions.pubsub
  .schedule('0 21 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async () => {
    try {
      const tomorrow = getKstDateStr(1);
      const rangeStart = `${tomorrow}T00:00:00`;
      const rangeEnd = `${tomorrow}T23:59:59`;

      const byUserTitles = new Map();
      const addTitle = (uid, title) => {
        if (!uid) return;
        if (!byUserTitles.has(uid)) byUserTitles.set(uid, []);
        if (title) byUserTitles.get(uid).push(title);
      };

      // 커플 공유 일정
      const eventsSnap = await db.collection('events')
        .where('start', '>=', rangeStart)
        .where('start', '<=', rangeEnd)
        .get();

      const coupleIds = [...new Set(eventsSnap.docs.map((d) => d.data().coupleId).filter(Boolean))];
      const membersByCouple = new Map();
      await Promise.all(coupleIds.map(async (cid) => {
        const snap = await db.collection('couples').doc(cid).get();
        membersByCouple.set(cid, snap.data()?.members || []);
      }));

      eventsSnap.forEach((doc) => {
        const { coupleId, title } = doc.data();
        const members = membersByCouple.get(coupleId) || [];
        members.forEach((uid) => addTitle(uid, title));
      });

      // 개인 일정 — 본인에게만
      const personalSnap = await db.collection('personal_events')
        .where('start', '>=', rangeStart)
        .where('start', '<=', rangeEnd)
        .get();
      personalSnap.forEach((doc) => {
        const { userId, title } = doc.data();
        addTitle(userId, title);
      });

      for (const [uid, titles] of byUserTitles) {
        const preview = titles.slice(0, 3).join(', ');
        const body = titles.length > 3 ? `${preview} 외 ${titles.length - 3}건` : preview;
        await sendPushToUser(uid, {
          title: '내일 일정이 있어요',
          body: body || '내일 일정을 확인해보세요',
          link: '/calendar',
        }, 'sendEveningReminders', 'tomorrowReminder', true);
      }
    } catch (error) {
      console.error('[sendEveningReminders] Error:', error);
    }
  });
