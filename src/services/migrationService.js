// src/services/migrationService.js
// 기존 Firebase(krhj-1111)의 데이터를 새 Firebase(twogether-206fb)로 복사
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

// 기존 Firebase 앱 초기화 (읽기 전용)
const oldFirebaseConfig = {
  apiKey: import.meta.env.VITE_OLD_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_OLD_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_OLD_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_OLD_FIREBASE_APP_ID,
};

let oldDb;

const getOldDb = () => {
  if (!oldDb) {
    // 이미 초기화된 앱이 있으면 재사용, 없으면 새로 초기화
    const existingApp = getApps().find(app => app.name === 'old-firebase');
    const oldApp = existingApp ?? initializeApp(oldFirebaseConfig, 'old-firebase');
    oldDb = getFirestore(oldApp);
  }
  return oldDb;
};

const BATCH_SIZE = 400;

const migrateCollection = async (collectionName, coupleId, onProgress) => {
  const sourceDb = getOldDb();
  const sourceSnap = await getDocs(collection(sourceDb, collectionName));

  if (sourceSnap.empty) {
    onProgress?.(collectionName, 0, 0);
    return 0;
  }

  // 이미 coupleId가 있는 문서는 건너뜀 (멱등성)
  const docs = sourceSnap.docs.filter(d => !d.data().coupleId);
  const total = docs.length;

  if (total === 0) {
    onProgress?.(collectionName, 0, 0);
    return 0;
  }

  let processed = 0;
  const targetCol = collection(db, collectionName);

  // 400개씩 청크 처리
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach(sourceDoc => {
      const newDocRef = doc(targetCol, sourceDoc.id);
      batch.set(newDocRef, { ...sourceDoc.data(), coupleId }, { merge: true });
    });

    await batch.commit();
    processed += chunk.length;
    onProgress?.(collectionName, processed, total);
  }

  return total;
};

export const runMigration = async (coupleId, onProgress) => {
  const collections = ['events', 'trips', 'tripSchedules', 'travelTimes', 'bucketlists'];
  const results = {};

  for (const col of collections) {
    try {
      onProgress?.(col, 0, null); // 시작 알림
      const count = await migrateCollection(col, coupleId, onProgress);
      results[col] = { success: true, count };
    } catch (err) {
      console.error(`Migration failed for ${col}:`, err);
      results[col] = { success: false, error: err.message };
      throw new Error(`${col} 마이그레이션 실패: ${err.message}`);
    }
  }

  return results;
};
