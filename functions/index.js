const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

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
    } catch (error) {
      console.error('[onCoupleUpdate] Error:', error);
    }
  });

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

      const coupleSnap = await db.collection('couples').doc(coupleId).get();
      const members = coupleSnap.data()?.members || [];
      const partnerUid = members.find((uid) => uid !== createdBy);
      if (!partnerUid) {
        console.log(`[onEventCreate] skip: 파트너 없음 (coupleId=${coupleId}, members=${JSON.stringify(members)})`);
        return;
      }

      const [partnerSnap, creatorSnap] = await Promise.all([
        db.collection('users').doc(partnerUid).get(),
        db.collection('users').doc(createdBy).get(),
      ]);

      const tokens = partnerSnap.data()?.fcmTokens || [];
      if (tokens.length === 0) {
        console.log(`[onEventCreate] skip: 파트너(uid=${partnerUid})에게 저장된 fcmTokens 없음`);
        return;
      }

      const creatorName = creatorSnap.data()?.displayName || '상대방';

      // notification 필드로 보내면 브라우저 자동 표시 + onBackgroundMessage 수동 표시가 겹쳐
      // 모바일에서 알림이 2번 뜨는 문제가 있어 data-only로 보내고 클라이언트(sw.js)에서만 표시함
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        data: {
          title: `${creatorName}님이 일정을 추가했어요`,
          body: title || '새 일정을 확인해보세요',
          link: '/calendar',
        },
        webpush: {
          headers: { Urgency: 'high' },
        },
      });

      console.log(`[onEventCreate] 발송 완료: 성공 ${response.successCount} / 실패 ${response.failureCount}`);
      response.responses.forEach((r, i) => {
        if (!r.success) console.log(`[onEventCreate] 토큰 발송 실패 [${i}]: ${r.error?.code} - ${r.error?.message}`);
      });

      // 만료/등록 취소된 토큰은 정리
      const staleTokens = response.responses
        .map((r, i) => (!r.success && r.error?.code === 'messaging/registration-token-not-registered' ? tokens[i] : null))
        .filter(Boolean);

      if (staleTokens.length > 0) {
        await db.collection('users').doc(partnerUid).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
        });
      }
    } catch (error) {
      console.error('[onEventCreate] Error:', error);
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
