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
            imageUrls: data.imageUrls || [],
            isTrip: false
          }
        };
      });
      setEvents(eventsData);
      setIsLoading(false);
    }, () => setIsLoading(false));
    return () => unsubscribe();
  }, [coupleId]);

  // 여행 구독
  useEffect(() => {
    if (!coupleId) return;
    const tripsRef = query(
      collection(db, 'trips'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(tripsRef, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => {
        const data = doc.data();

        // startDate를 문자열로 변환
        let startDate;
        if (data.startDate?.toDate) {
          startDate = data.startDate.toDate().toISOString().split('T')[0];
        } else if (data.startDate instanceof Date) {
          startDate = data.startDate.toISOString().split('T')[0];
        } else {
          startDate = String(data.startDate);
        }

        // endDate를 문자열로 변환
        let endDate;
        if (data.endDate?.toDate) {
          endDate = data.endDate.toDate().toISOString().split('T')[0];
        } else if (data.endDate instanceof Date) {
          endDate = data.endDate.toISOString().split('T')[0];
        } else {
          endDate = String(data.endDate);
        }

        // FullCalendar allDay 이벤트: end를 다음날 00:00으로 설정하여 그 전날까지 표시
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const adjustedEndDate = endDateObj.toISOString().split('T')[0];

        return {
          id: doc.id,
          title: `✈️ ${data.title}`,
          start: `${startDate}T00:00:00`,
          end: `${adjustedEndDate}T00:00:00`,
          allDay: true,
          color: 'var(--color-trip)',
          textColor: '#757575',
          extendedProps: {
            description: data.destination || '',
            isTrip: true,
            tripId: doc.id
          }
        };
      });
      setEvents(prev => [...prev.filter(e => !e.extendedProps.isTrip), ...tripsData]);
    });
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
