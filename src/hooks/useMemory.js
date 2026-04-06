// src/hooks/useMemory.js
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const useMemory = (coupleId, filter = 'all') => {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setMemories([]);
      setLoading(false);
      return;
    }

    let q;
    if (filter === 'couple') {
      q = query(
        collection(db, 'events'),
        where('coupleId', '==', coupleId),
        where('isCouple', '==', true),
        orderBy('start', 'desc')
      );
    } else if (filter === 'personal') {
      q = query(
        collection(db, 'events'),
        where('coupleId', '==', coupleId),
        where('isCouple', '==', false),
        orderBy('start', 'desc')
      );
    } else {
      q = query(
        collection(db, 'events'),
        where('coupleId', '==', coupleId),
        orderBy('start', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const memoriesData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(data => data.imageUrls && data.imageUrls.length > 0);
      setMemories(memoriesData);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleId, filter]);

  return { memories, loading };
};

export default useMemory;
