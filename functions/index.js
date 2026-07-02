const functions = require('firebase-functions');
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
