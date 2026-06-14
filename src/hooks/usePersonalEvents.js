// src/hooks/usePersonalEvents.js
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const usePersonalEvents = (userId) => {
  const [personalEvents, setPersonalEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPersonalEvents([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'personal_events'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start,
          end: data.end,
          description: data.description,
          color: 'var(--color-personal)',
          textColor: '#757575',
          extendedProps: {
            description: data.description,
            isPersonal: true,
            sharedToCoupleEventId: data.sharedToCoupleEventId || null,
          },
        };
      });
      setPersonalEvents(eventsData);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { personalEvents, loading };
};

export default usePersonalEvents;
