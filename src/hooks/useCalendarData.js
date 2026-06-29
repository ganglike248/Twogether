import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useCalendarData = (coupleId, userId) => {
  const [events, setEvents] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [cyclesLoaded, setCyclesLoaded] = useState(false);
  const [personalLoaded, setPersonalLoaded] = useState(false);

  const isLoading = !eventsLoaded || !tripsLoaded || !cyclesLoaded || !personalLoaded;

  // 일정 구독
  useEffect(() => {
    if (!coupleId) {
      setEventsLoaded(true);
      setTripsLoaded(true);
      setCyclesLoaded(true);
      return;
    }
    const eventsRef = query(
      collection(db, 'events'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const eventsData = snapshot.docs
        .filter(doc => doc.data().eventType !== 'travel')
        .map(doc => {
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
      // 커플 이벤트(couple/boyfriend/girlfriend) 업데이트: 기존 trip/personal 보존
      setEvents(prev => [
        ...prev.filter(e => e.extendedProps?.isTrip || e.extendedProps?.eventType === 'personal'),
        ...eventsData
      ]);
      setEventsLoaded(true);
    }, () => setEventsLoaded(true));
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

        let startDate;
        if (data.startDate?.toDate) {
          startDate = data.startDate.toDate().toISOString().split('T')[0];
        } else if (data.startDate instanceof Date) {
          startDate = data.startDate.toISOString().split('T')[0];
        } else {
          startDate = String(data.startDate);
        }

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
          title: data.title,
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
      // 여행 이벤트 업데이트: 기존 trip이 아닌 것들(couple/boyfriend/girlfriend/personal) 보존
      setEvents(prev => [...prev.filter(e => !e.extendedProps.isTrip), ...tripsData]);
      // trips 상태에 원본 데이터 저장 (Home.jsx에서 사용)
      const tripsRawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrips(tripsRawData);
      setTripsLoaded(true);
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
      setCyclesLoaded(true);
    });
    return () => unsubscribe();
  }, [coupleId]);

  // 개인 일정 구독
  useEffect(() => {
    if (!userId) {
      setPersonalLoaded(true);
      return;
    }
    const personalRef = query(
      collection(db, 'personal_events'),
      where('userId', '==', userId)
    );
    const unsubscribe = onSnapshot(personalRef, (snapshot) => {
      const personalData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start,
          end: data.end,
          allDay: true,
          color: 'var(--color-personal)',
          textColor: '#757575',
          extendedProps: {
            description: data.description,
            eventType: 'personal',
            isPersonal: true,
            sharedToCoupleEventId: data.sharedToCoupleEventId || null,
          }
        };
      });
      // 개인 이벤트 업데이트: 기존 personal이 아닌 것들(couple/boyfriend/girlfriend/trip) 보존
      setEvents(prev => [...prev.filter(e => e.extendedProps.eventType !== 'personal'), ...personalData]);
      setPersonalLoaded(true);
    }, () => setPersonalLoaded(true));
    return () => unsubscribe();
  }, [userId]);

  return { events, cycles, trips, isLoading };
};
