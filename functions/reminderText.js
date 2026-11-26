// functions/reminderText.js
// 예약 알림의 날짜·문구 계산(순수 함수, Firebase 의존 없음) — index.js에서 분리해 단위 테스트 가능하게(AUDIT Q-2).
// COUPLE_DAYS는 src/utils/koreanHolidays.js의 복사본 — 바꾸면 둘 다 수정.

// KST 기준 'YYYY-MM-DD' 문자열 — 서버는 UTC로 도는데 스케줄은 Asia/Seoul 기준이라 날짜 계산도 KST로 맞춤
function getKstDateStr(offsetDays = 0) {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// src/utils/koreanHolidays.js의 COUPLE_DAYS와 동일 목록(+ 알림 본문용 suggestion 추가) — Cloud Functions는
// 별도 Node 패키지라 클라이언트 소스를 직접 import할 수 없어 복사함. 저쪽 목록이 바뀌면 여기도 같이 갱신할 것.
const COUPLE_DAYS = [
  { month: 1,  day: 14, name: '다이어리데이', suggestion: '다이어리를 선물하며 새해 계획을 함께 세워보는 건 어때요?' },
  { month: 2,  day: 14, name: '발렌타인데이', suggestion: '연인에게 초콜릿을 전해보는 건 어때요?' },
  { month: 3,  day: 14, name: '화이트데이', suggestion: '사탕이나 작은 선물로 마음을 전해보는 건 어때요?' },
  { month: 4,  day: 14, name: '블랙데이', suggestion: '짜장면 한 그릇 어때요? 오늘도 함께라 행복하죠' },
  { month: 5,  day: 14, name: '로즈데이', suggestion: '장미꽃 한 송이를 선물해보는 건 어때요?' },
  { month: 6,  day: 14, name: '키스데이', suggestion: '오늘은 애정표현을 더 듬뿍 해보는 건 어때요?' },
  { month: 7,  day: 14, name: '실버데이', suggestion: '커플 아이템으로 마음을 전해보는 건 어때요?' },
  { month: 8,  day: 14, name: '그린데이', suggestion: '함께 초록빛 산책을 나가보는 건 어때요?' },
  { month: 9,  day: 14, name: '포토데이', suggestion: '오늘은 함께 예쁜 사진을 남겨보는 건 어때요?' },
  { month: 10, day: 14, name: '와인데이', suggestion: '와인 한 잔과 함께 근사한 저녁을 즐겨보는 건 어때요?' },
  { month: 11, day: 11, name: '빼빼로데이', suggestion: '빼빼로를 주고받으며 마음을 전해보는 건 어때요?' },
  { month: 11, day: 14, name: '무비데이', suggestion: '오늘은 함께 영화 한 편 어때요?' },
  { month: 12, day: 14, name: '허그데이', suggestion: '오늘은 서로를 꼭 안아주는 건 어때요?' },
  { month: 12, day: 24, name: '크리스마스 이브', suggestion: '특별한 크리스마스 이브를 함께 보내보는 건 어때요?' },
];

// 주어진 날짜(dateStr)에 해당하는 기념일들을 { name, body } 형태로 전부 반환 — 100일 단위/매년 기념일
// (anniversaryDate 필요) + 연애 시작일과 무관하게 매년 고정으로 오는 이벤트데이(COUPLE_DAYS, 종류별 맞춤 문구).
// 호출 시점(오늘/내일)에 따라 day-of, D-1 알림에 재사용함.
// 기념일 알림 본문(B안, 2026-11) — 100일 단위·n주년마다 다른 문구. D-1은 공통 문구(MILESTONE_TOMORROW_BODY)
const MILESTONE_DAY_BODY = {
  100: '함께한 지 100일, 시작이 좋아요',
  200: '200일째, 익숙해서 더 좋은 날',
  300: '300일, 1년이 코앞이에요',
  500: '500일, 천 일까지 반 왔어요',
  1000: '1000일, 숫자만 봐도 뿌듯한 날',
};
const MILESTONE_YEAR_BODY = {
  1: '1주년, 사계절을 함께 지났어요',
  2: '2주년, 오늘도 우리답게',
};
const MILESTONE_TOMORROW_BODY = '미리 준비해 볼까요?';
const milestoneDayBody = (n) => MILESTONE_DAY_BODY[n] || (n < 1000 ? `함께한 지 ${n}일, 오늘도 우리답게` : `함께한 지 ${n}일`);
const milestoneYearBody = (k) => MILESTONE_YEAR_BODY[k] || `${k}주년을 축하해요`;

function getMilestoneEvents(anniversaryDateStr, dateStr) {
  const events = [];

  if (anniversaryDateStr) {
    const start = new Date(`${anniversaryDateStr}T00:00:00Z`);
    const target = new Date(`${dateStr}T00:00:00Z`);
    const dayCount = Math.round((target - start) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount > 0 && dayCount % 100 === 0) {
      events.push({ name: `${dayCount}일`, body: milestoneDayBody(dayCount), tomorrowBody: MILESTONE_TOMORROW_BODY });
    }

    const [sy, sm, sd] = anniversaryDateStr.split('-').map(Number);
    const [ty, tm, td] = dateStr.split('-').map(Number);
    if (sm === tm && sd === td && ty > sy) {
      events.push({ name: `${ty - sy}주년`, body: milestoneYearBody(ty - sy), tomorrowBody: MILESTONE_TOMORROW_BODY });
    }
  }

  const [, m, d] = dateStr.split('-').map(Number);
  const coupleDay = COUPLE_DAYS.find((c) => c.month === m && c.day === d);
  if (coupleDay) events.push({ name: coupleDay.name, body: coupleDay.suggestion });

  return events;
}

module.exports = { getKstDateStr, COUPLE_DAYS, getMilestoneEvents, MILESTONE_DAY_BODY, MILESTONE_YEAR_BODY, MILESTONE_TOMORROW_BODY };
