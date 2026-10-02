import { useMemo } from 'react';
import { getSpecialDaysMap } from '../utils/koreanHolidays';

export const useCalendarEvents = (currentDate, events) => {
  const specialDaysMap = useMemo(() => {
    const y = currentDate.getFullYear();
    return getSpecialDaysMap([y - 1, y, y + 1]);
  }, [currentDate]);

  const specialDayEvents = useMemo(() => {
    const result = [];
    specialDaysMap.forEach((specials, dateStr) => {
      const primary = specials.find((s) => s.type === 'holiday') || specials[0];
      result.push({
        id: `special-${dateStr}`,
        title: primary.name,
        start: dateStr,
        allDay: true,
        extendedProps: { isSpecial: true, specialType: primary.type },
      });
    });
    return result;
  }, [specialDaysMap]);

  const allEvents = useMemo(
    () => [...specialDayEvents, ...events],
    [events, specialDayEvents]
  );

  return { specialDaysMap, specialDayEvents, allEvents };
};
