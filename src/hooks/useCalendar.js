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
        const eventType = data.eventType || (data.isCouple !== undefined
          ? (data.isCouple ? 'couple' : 'boyfriend') : 'couple');
        let color;
        switch (eventType) {
          case 'boyfriend':
            color = 'var(--color-boyfriend)'; break;
          case 'girlfriend':
            color = 'var(--color-girlfriend)'; break;
          default:
            color = 'var(--color-couple)'; break;
        }
        return {
          id: doc.id,
          title: data.title,
          start: data.start,
          end: data.end,
          color,
          extendedProps: {
            description: data.description,
            eventType,
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
