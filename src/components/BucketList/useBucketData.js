// src/components/BucketList/useBucketData.js — 버킷 목록 + 커플 카테고리 실시간 구독(오류 시 로딩 끝냄)
import { useEffect, useState } from 'react';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { reportSubscribeError } from '../../services/subscribeError';

export const useBucketData = (coupleId) => {
  const [bucketList, setBucketList] = useState([]);
  const [customCategories, setCustomCategories] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return undefined;
    return onSnapshot(
      doc(db, 'couples', coupleId),
      (snap) => setCustomCategories(snap.data()?.customCategories || {}),
      (error) => reportSubscribeError('bucket-categories', error),
    );
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return undefined;
    const q = query(collection(db, 'bucketlists'), where('coupleId', '==', coupleId));
    return onSnapshot(
      q,
      (snap) => { setBucketList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setIsLoading(false); },
      (error) => { reportSubscribeError('bucketlists', error); setIsLoading(false); },
    );
  }, [coupleId]);

  return { bucketList, customCategories, isLoading: !!coupleId && isLoading };
};
