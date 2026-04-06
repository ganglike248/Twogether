// src/utils/dateUtils.js
import { format, isSameDay, isToday, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// 날짜 형식화
export const formatDate = (dateString, formatPattern = 'yyyy년 MM월 dd일') => {
  try {
    const date = parseISO(dateString);
    return format(date, formatPattern, { locale: ko });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// 오늘 여부 확인
export const checkIfToday = (dateString) => {
  try {
    const date = parseISO(dateString);
    return isToday(date);
  } catch (error) {
    console.error("Error checking if today:", error);
    return false;
  }
};

// 같은 날짜인지 확인
export const checkIfSameDay = (dateString1, dateString2) => {
  try {
    const date1 = parseISO(dateString1);
    const date2 = parseISO(dateString2);
    return isSameDay(date1, date2);
  } catch (error) {
    console.error("Error checking if same day:", error);
    return false;
  }
};

// 날짜 객체에서 일(day) 추출
export const getDayFromDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    return date.getDate();
  } catch (error) {
    console.error("Error getting day from date:", error);
    return '';
  }
};

// 날짜 범위 문자열 생성 (시작일-종료일)
export const getDateRangeString = (startDateString, endDateString) => {
  try {
    if (!endDateString || startDateString === endDateString) {
      return formatDate(startDateString);
    }
    
    return `${formatDate(startDateString)} ~ ${formatDate(endDateString)}`;
  } catch (error) {
    console.error("Error getting date range string:", error);
    return `${startDateString} ~ ${endDateString}`;
  }
};