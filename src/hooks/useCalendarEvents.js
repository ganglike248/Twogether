import { useMemo } from 'react';
import { getSpecialDaysMap } from '../utils/koreanHolidays';

const addDaysToStr = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const useCalendarEvents = (currentDate, events, cycles, coupleDoc) => {
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

  // 생리 기록 → 이벤트 변환
  const periodEvents = useMemo(() => {
    const settings = coupleDoc?.cycleSettings;
    if (!settings?.enabled) return [];

    const cl = settings.cycleLength || 28;
    const pl = settings.periodLength || 5;
    const icon = settings.icon || '🌸';
    const label = settings.label || '생리';
    const color = settings.color || '#ffd6e0';
    const showFertile = settings.showFertile || false;
    const showOvulation = settings.showOvulation || false;

    const result = [];

    // 실제 생리 기록 → 이벤트 바
    cycles.forEach(cycle => {
      result.push({
        id: `period-actual-${cycle.id}`,
        title: icon,
        start: cycle.startDate,
        end: addDaysToStr(cycle.startDate, cycle.periodLength || pl),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#555',
        classNames: ['period-event'],
        extendedProps: { isPeriod: true, periodId: cycle.id },
      });
    });

    // 가장 최근 기록 기준으로 예정일·가임기·배란일 계산
    if (cycles.length > 0) {
      const sorted = [...cycles].sort((a, b) =>
        (b.startDate || '').localeCompare(a.startDate || '')
      );
      const mostRecent = sorted[0];
      const base = mostRecent.startDate;

      // 다음 예정일
      const nextStart = addDaysToStr(base, cl);
      result.push({
        id: 'period-predicted',
        title: '예정',
        start: nextStart,
        end: addDaysToStr(nextStart, pl),
        allDay: true,
        backgroundColor: color,
        borderColor: color,
        textColor: '#555',
        classNames: ['period-predicted-event'],
        extendedProps: { isPeriodPredicted: true },
      });

      // 가임기 (현재 사이클 기준)
      if (showFertile && cl - 19 >= 0) {
        result.push({
          id: 'cycle-fertile',
          title: '가임기',
          start: addDaysToStr(base, cl - 19),
          end: addDaysToStr(base, cl - 12),
          allDay: true,
          backgroundColor: 'rgba(180, 153, 255, 0.25)',
          borderColor: '#9B59B6',
          textColor: '#7b3fb0',
          classNames: ['cycle-meta-event'],
          extendedProps: { isCycleMeta: true },
        });
      }

      // 배란일
      if (showOvulation) {
        result.push({
          id: 'cycle-ovulation',
          title: '배란일',
          start: addDaysToStr(base, cl - 14),
          allDay: true,
          backgroundColor: 'rgba(155, 89, 182, 0.2)',
          borderColor: '#9B59B6',
          textColor: '#7b3fb0',
          classNames: ['cycle-meta-event'],
          extendedProps: { isCycleMeta: true },
        });
      }
    }

    return result;
  }, [cycles, coupleDoc]);

  const allEvents = useMemo(
    () => [...specialDayEvents, ...periodEvents, ...events],
    [events, specialDayEvents, periodEvents]
  );

  return { specialDaysMap, specialDayEvents, periodEvents, allEvents };
};
