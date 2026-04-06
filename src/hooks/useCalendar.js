// src/hooks/useCalendar.js
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const useCalendar = (coupleId) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'events'),
      where('coupleId', '==', coupleId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start,
          end: data.end,
          color: data.isCouple ? 'var(--color-couple)' : 'var(--color-personal)',
          extendedProps: {
            description: data.description,
            isCouple: data.isCouple,
            imageUrls: data.imageUrls || [],
          },
        };
      });
      setEvents(eventsData);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [coupleId]);

  return { events, loading };
};

export default useCalendar;
