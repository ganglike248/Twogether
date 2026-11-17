import { useMemo } from 'react';
import { getSpecialDaysMap } from '../utils/koreanHolidays';
import { anniversariesInRange } from '../services/recap/recapDates';

// anniversaryDate(연애 시작일)가 있으면 100일 단위·n주년도 특별일(type 'anniversary')로 추가
export const useCalendarEvents = (currentDate, events, anniversaryDate) => {
  const specialDaysMap = useMemo(() => {
    const y = currentDate.getFullYear();
    const map = getSpecialDaysMap([y - 1, y, y + 1]);
    anniversariesInRange(anniversaryDate, `${y - 1}-01-01`, `${y + 1}-12-31`).forEach(({ dateStr, label }) => {
      const list = map.get(dateStr) || [];
      map.set(dateStr, [{ name: label, type: 'anniversary' }, ...list]);
    });
    return map;
  }, [currentDate, anniversaryDate]);

  const specialDayEvents = useMemo(() => {
    const result = [];
    specialDaysMap.forEach((specials, dateStr) => {
      const primary = specials.find((s) => s.type === 'anniversary') || specials.find((s) => s.type === 'holiday') || specials[0];
      result.push({
        id: `special-${dateStr}`,
        title: primary.type === 'anniversary' ? `우리 ${primary.name}` : primary.name,
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
