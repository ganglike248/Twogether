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
