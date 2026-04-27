import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useCalendarData = (coupleId) => {
  const [events, setEvents] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 일정 구독
  useEffect(() => {
    if (!coupleId) return;
    const eventsRef = query(
      collection(db, 'events'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        let color, textColor;
        switch (data.eventType) {
          case 'boyfriend':
            color = 'var(--color-boyfriend)'; textColor = '#757575'; break;
          case 'girlfriend':
            color = 'var(--color-girlfriend)'; textColor = '#757575'; break;
          case 'couple':
          default:
            color = 'var(--color-couple)'; textColor = '#757575'; break;
        }
        return {
          id: doc.id, title: data.title, start: data.start, end: data.end,
          allDay: true, color, textColor,
          extendedProps: {
            description: data.description,
            eventType: data.eventType,
            imageUrls: data.imageUrls || []
          }
        };
      });
      setEvents(eventsData);
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, [coupleId]);

  // 생리 기록 구독
  useEffect(() => {
    if (!coupleId) return;
    const cyclesRef = query(
      collection(db, 'cycles'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(cyclesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCycles(data);
    });
    return () => unsubscribe();
  }, [coupleId]);

  return { events, cycles, isLoading };
};
