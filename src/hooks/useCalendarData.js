import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const useCalendarData = (coupleId, userId, options = {}) => {
  const {
    includeCoupleEvents = true,
    includeTrips = true,
    includeCycles = true,
    includePersonalEvents = true,
  } = options;

  // 각 데이터 타입별 독립적 상태 관리 (누락 버그 방지)
  const [coupleEvents, setCoupleEvents] = useState([]);
  const [tripEvents, setTripEvents] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [personalEvents, setPersonalEvents] = useState([]);
  const [trips, setTrips] = useState([]);

  // 로딩 상태 (각 useEffect에서 개별 관리)
  const [coupleLoaded, setCoupleLoaded] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [cyclesLoaded, setCyclesLoaded] = useState(false);
  const [personalLoaded, setPersonalLoaded] = useState(false);

  const isLoading = !coupleLoaded || !tripsLoaded || !cyclesLoaded || !personalLoaded;

  // ✅ 구독 #1: 공유 일정 (couple/boyfriend/girlfriend, travel 제외)
  useEffect(() => {
    if (!includeCoupleEvents) {
      setCoupleEvents([]);
      setCoupleLoaded(true);
      return;
    }
    if (!coupleId) {
      setCoupleEvents([]);
      setCoupleLoaded(true);
      return;
    }
    setCoupleLoaded(false);
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
      // ✅ 독립적 상태 업데이트 — 다른 useEffect 영향 없음
      setCoupleEvents(eventsData);
      setCoupleLoaded(true);
    }, () => setCoupleLoaded(true));
    return () => unsubscribe();
  }, [coupleId, includeCoupleEvents]);

  // ✅ 구독 #2: 여행 이벤트 (tripEvents) + 여행 원본 데이터 (trips)
  useEffect(() => {
    if (!includeTrips) {
      setTripEvents([]);
      setTrips([]);
      setTripsLoaded(true);
      return;
    }
    if (!coupleId) {
      setTripEvents([]);
      setTrips([]);
      setTripsLoaded(true);
      return;
    }
    setTripsLoaded(false);
    const tripsRef = query(
      collection(db, 'trips'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(tripsRef, (snapshot) => {
      const tripsRawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const tripsCalendarData = tripsRawData.map(data => {
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
          id: data.id,
          title: data.title,
          start: `${startDate}T00:00:00`,
          end: `${adjustedEndDate}T00:00:00`,
          allDay: true,
          color: 'var(--color-trip)',
          textColor: '#757575',
          extendedProps: {
            description: data.destination || '',
            isTrip: true,
            tripId: data.id
          }
        };
      });

      // ✅ 독립적 상태 업데이트
      setTripEvents(tripsCalendarData);
      setTrips(tripsRawData);
      setTripsLoaded(true);
    }, () => setTripsLoaded(true));
    return () => unsubscribe();
  }, [coupleId, includeTrips]);

  // ✅ 구독 #3: 생리 기록
  useEffect(() => {
    if (!includeCycles) {
      setCycles([]);
      setCyclesLoaded(true);
      return;
    }
    if (!coupleId) {
      setCycles([]);
      setCyclesLoaded(true);
      return;
    }
    setCyclesLoaded(false);
    const cyclesRef = query(
      collection(db, 'cycles'),
      where('coupleId', '==', coupleId)
    );
    const unsubscribe = onSnapshot(cyclesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCycles(data);
      setCyclesLoaded(true);
    }, () => setCyclesLoaded(true));
    return () => unsubscribe();
  }, [coupleId, includeCycles]);

  // ✅ 구독 #4: 개인 일정
  useEffect(() => {
    if (!includePersonalEvents) {
      setPersonalEvents([]);
      setPersonalLoaded(true);
      return;
    }
    if (!userId) {
      setPersonalEvents([]);
      setPersonalLoaded(true);
      return;
    }
    setPersonalLoaded(false);
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
      // ✅ 독립적 상태 업데이트
      setPersonalEvents(personalData);
      setPersonalLoaded(true);
    }, () => setPersonalLoaded(true));
    return () => unsubscribe();
  }, [userId, includePersonalEvents]);

  // 렌더링 시에만 4개 데이터 병합 (각 useEffect는 독립적)
  const events = useMemo(() => [
    ...coupleEvents,
    ...tripEvents,
    ...personalEvents
  ], [coupleEvents, tripEvents, personalEvents]);

  return { events, cycles, trips, isLoading };
};
