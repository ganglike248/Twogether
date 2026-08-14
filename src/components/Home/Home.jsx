// src/components/Home/Home.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  differenceInCalendarDays, differenceInMonths, addMonths,
  isSameMonth, parseISO, startOfDay, format, subYears, addDays
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  HiCalendarDays, HiPhoto, HiMapPin, HiPaperAirplane, HiSparkles, HiCheckCircle, HiHeart, HiLockClosed
} from 'react-icons/hi2';
import { useCalendarData } from '../../hooks/useCalendarData';
import { useTripSchedules } from '../../hooks/useTrip';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { convertToDate } from '../../utils/dataUtils';
import { subscribeSealedMessages } from '../../services/sealedMessageService';
import {
  getNotificationPermission,
  isDeviceSubscribed,
  isExplicitlyDisabled,
  enableNotifications,
} from '../../services/notificationService';
import NotificationPrimingModal from '../common/NotificationPrimingModal';
import TutorialSlides from '../Onboarding/TutorialSlides';
import WheelModal from '../Wheel/WheelModal';
import HomeSkeleton from './HomeSkeleton';
import './Home.css';

const Home = () => {
  const { user, userDoc, coupleId, coupleDoc, myRole } = useAuthContext();
  const anniversaryDate = coupleDoc?.anniversaryDate || null;
  const location = useLocation();

  const [dday, setDday] = useState(0);
  const [bucketStats, setBucketStats] = useState({ total: 0, completed: 0 });
  const [bucketList, setBucketList] = useState([]);
  const [bucketLoading, setBucketLoading] = useState(true);
  const [sealedMessages, setSealedMessages] = useState([]);
  const [showTutorial, setShowTutorial] = useState(
    () => !!location.state?.showTutorial
  );
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const { events, trips, isLoading: calendarLoading } = useCalendarData(coupleId, user?.uid, {
    includeCycles: false,
  });
  const navigate = useNavigate();

  // 프로필 또는 커플 연결 후 튜토리얼 표시
  useEffect(() => {
    if (location.state?.showTutorial) {
      setShowTutorial(true);
    }
  }, [location.state?.showTutorial]);

  // 권한이 이미 있는데(이 기능이 생기기 전 가입 등) 이 기기 토큰이 서버에 등록 안 돼 있으면 조용히
  // 백필 등록함 — 이미 브라우저 팝업을 거친 뒤라 재설명이 필요 없는 케이스. 권한이 아직 없는 경우(default)는
  // <NotificationPrimingModal />이 설명 후 물어봄(이 효과에서 직접 팝업을 띄우지 않음).
  const notifAttemptedRef = useRef(false);
  useEffect(() => {
    if (!userDoc || notifAttemptedRef.current || isExplicitlyDisabled()) return;
    if (getNotificationPermission() === 'granted' && !isDeviceSubscribed(userDoc)) {
      notifAttemptedRef.current = true;
      enableNotifications().catch(() => { notifAttemptedRef.current = false; });
    }
  }, [userDoc]);

  const heroImageUrl = coupleDoc?.heroImageUrl || null;
  const customCategories = coupleDoc?.customCategories || {};

  useEffect(() => {
    if (!anniversaryDate) return;
    const startDate = new Date(anniversaryDate);
    const today = new Date();
    const dayDifference = differenceInCalendarDays(today, startDate) + 1;
    setDday(dayDifference);
  }, [anniversaryDate]);

  // 버킷리스트 구독
  useEffect(() => {
    if (!coupleId) {
      setBucketLoading(false);
      return;
    }
    const q = query(collection(db, 'bucketlists'), where('coupleId', '==', coupleId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBucketList(all);
      setBucketStats({ total: all.length, completed: all.filter(d => d.completed).length });
      setBucketLoading(false);
    }, () => setBucketLoading(false));
    return () => unsubscribe();
  }, [coupleId]);

  // 봉인 편지함 구독 (진입 카드에 도착/보유 상태 표시용)
  useEffect(() => {
    if (!coupleId) return;
    const unsubscribe = subscribeSealedMessages(coupleId, setSealedMessages);
    return unsubscribe;
  }, [coupleId]);

  const today = new Date();

  // 연애 기간 계산
  const loveStartDate = anniversaryDate ? new Date(anniversaryDate) : null;
  const loveMonthsTotal = loveStartDate ? differenceInMonths(today, loveStartDate) : 0;
  const loveYears = Math.floor(loveMonthsTotal / 12);
  const loveMonths = loveMonthsTotal % 12;
  const afterMonths = loveStartDate ? addMonths(loveStartDate, loveMonthsTotal) : today;
  const loveDays = differenceInCalendarDays(today, afterMonths);


  // 진행 중인 여행
  const ongoingTrip = trips.find(t => {
    const start = convertToDate(t.startDate);
    const end = convertToDate(t.endDate);
    if (!start || !end) return false;
    const todayStr = format(today, 'yyyy-MM-dd');
    return format(start, 'yyyy-MM-dd') <= todayStr && todayStr <= format(end, 'yyyy-MM-dd');
  });

  // 다음 예정 여행
  const nextTrip = !ongoingTrip ? trips
    .filter(t => {
      const start = convertToDate(t.startDate);
      return start && format(start, 'yyyy-MM-dd') > format(today, 'yyyy-MM-dd');
    })
    .sort((a, b) => convertToDate(a.startDate) - convertToDate(b.startDate))[0] || null
    : null;

  const relevantTrip = ongoingTrip || nextTrip;
  const ongoingDay = ongoingTrip
    ? differenceInCalendarDays(today, convertToDate(ongoingTrip.startDate)) + 1
    : null;
  const { schedules: tripSchedules } = useTripSchedules(ongoingTrip?.id || null);
  const todayScheduleData = tripSchedules.find(s => s.day === ongoingDay);
  const currentTime = format(today, 'HH:mm');
  const todayItems = (todayScheduleData?.schedules || [])
    .filter(item => !item.completed)
    .filter(item => {
      if (!item.time) return true;
      return item.time > currentTime;
    })
    .sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    })
    .slice(0, 3);

  const nextTripDays = nextTrip
    ? differenceInCalendarDays(convertToDate(nextTrip.startDate), today)
    : null;

  // 이번 달 일정 수
  const thisMonthCount = events.filter(e => {
    try { return isSameMonth(parseISO(e.start), today); } catch { return false; }
  }).length;

  // 다음 일정
  const nextEvent = events
    .filter(e => {
      try { return parseISO(e.start) >= startOfDay(today); } catch { return false; }
    })
    .sort((a, b) => parseISO(a.start) - parseISO(b.start))[0] || null;

  // 디데이로 표시된 일정 (미래만, 임박한 순)
  const ddayEvents = events
    .filter(e => e?.extendedProps?.isDday)
    .filter(e => {
      try { return parseISO(e.start) >= startOfDay(today); } catch { return false; }
    })
    .sort((a, b) => parseISO(a.start) - parseISO(b.start));

  // 그날의 우리 — 1~3년 전 오늘 ±3일 이벤트 (personal_events도 useCalendarData가 이미 events에 합쳐서 반환함).
  // 연차별로 최대 2개까지 뽑은 뒤, 라운드로빈으로 채워 매칭이 있는 연차는 최소 1개씩 반드시 보이도록 함
  // (단순히 앞에서부터 4개만 자르면 1년 전 기록이 2년/3년 전보다 먼저 쌓여 뒤쪽 연차가 통째로 밀려날 수 있음).
  const MEMORY_YEARS_AGO = [1, 2, 3];
  const MAX_PER_YEAR = 2;
  const MAX_MEMORY_TOTAL = 4;
  const memoryCandidatesByYear = MEMORY_YEARS_AGO.map((yearsAgo) => {
    const anchor = subYears(today, yearsAgo);
    return events
      .filter(e => {
        try {
          const d = parseISO(e.start);
          return Math.abs(differenceInCalendarDays(d, anchor)) <= 3;
        } catch { return false; }
      })
      .sort((a, b) => {
        const diffA = Math.abs(differenceInCalendarDays(parseISO(a.start), anchor));
        const diffB = Math.abs(differenceInCalendarDays(parseISO(b.start), anchor));
        return diffA - diffB;
      })
      .slice(0, MAX_PER_YEAR)
      .map(e => ({ ...e, yearsAgo }));
  });
  const yearAgoEvents = [];
  for (let round = 0; round < MAX_PER_YEAR && yearAgoEvents.length < MAX_MEMORY_TOTAL; round++) {
    for (const candidates of memoryCandidatesByYear) {
      if (yearAgoEvents.length >= MAX_MEMORY_TOTAL) break;
      if (candidates[round]) yearAgoEvents.push(candidates[round]);
    }
  }

  // 다음 100일 기념일 (dday=0이면 아직 로드 전이므로 100 기준으로 계산)
  const nextMilestone = dday > 0 ? Math.ceil(dday / 100) * 100 : 100;
  const daysToMilestone = nextMilestone - dday;
  const milestoneDate = loveStartDate ? addDays(loveStartDate, nextMilestone - 1) : today;
  const milestoneDateStr = format(milestoneDate, 'yyyy-MM-dd');

  const formatEventDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'M월 d일 (E)', { locale: ko }); }
    catch { return dateStr; }
  };

  const formatYearAgoDate = (dateStr) => {
    try { return format(parseISO(dateStr), 'yyyy년 M월 d일 (E)', { locale: ko }); }
    catch { return dateStr; }
  };

  const formatTripDate = (field) => {
    try { return format(convertToDate(field), 'M월 d일', { locale: ko }); }
    catch { return ''; }
  };

  const eventTypeColor = (event) => {
    if (event?.extendedProps?.isPersonal) return 'var(--color-personal)';
    const type = event?.extendedProps?.eventType;
    if (type === 'couple') return 'var(--color-couple)';
    if (type === 'boyfriend') return 'var(--color-boyfriend)';
    if (type === 'girlfriend') return 'var(--color-girlfriend)';
    return '#adb5bd';
  };

  const lockedForMe = sealedMessages.filter(
    (m) => m.recipientUid === user?.uid && !m.isUnlocked
  );
  const nextUnlockMsg = lockedForMe
    .filter((m) => m.unlockAt)
    .sort((a, b) => a.unlockAt.toMillis() - b.unlockAt.toMillis())[0] || null;
  const nextUnlockDays = nextUnlockMsg
    ? differenceInCalendarDays(nextUnlockMsg.unlockAt.toDate(), today)
    : null;

  const isLoading = calendarLoading || bucketLoading;

  if (isLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="home-container">
      {showTutorial && (
        <TutorialSlides onClose={() => setShowTutorial(false)} />
      )}
      {!showTutorial && <NotificationPrimingModal />}

      {/* 히어로: 사진(좌) + 기념일/이번달/연애기간(우) */}
      <div className="home-hero-split">
        <div className="hero-photo-col">
          {heroImageUrl ? (
            <>
              <img src={heroImageUrl} alt="우리" className="hero-img" />
              <div className="hero-overlay" />
              <div className="hero-text">
                <div className="hero-dday"><HiHeart className="hero-dday-heart" />+{dday}</div>
              </div>
            </>
          ) : (
            <div className="hero-img-placeholder">
              <p className="hero-placeholder-text">
                프로필에서<br />둘만의 사진을<br />업로드해보세요
              </p>
            </div>
          )}
        </div>
        <div className="hero-info-col">
          <div className="hero-stat-card">
            <HiHeart className="stat-icon pink" />
            <div className="stat-content">
              <span className="stat-value">
                {loveYears > 0 ? `${loveYears}년 ` : ''}{loveMonths}개월
              </span>
              <span className="stat-label">+{loveDays}일째 연애 중</span>
            </div>
          </div>
          {loveStartDate && (
            <div
              className="hero-stat-card clickable"
              onClick={() => navigate(`/calendar?date=${milestoneDateStr}`, { replace: true })}
            >
              <HiSparkles className="stat-icon pink" />
              <div className="stat-content">
                <span className="stat-value">
                  {daysToMilestone > 0 ? `D-${daysToMilestone}` : `❤️${nextMilestone}일❤️`}
                </span>
                <span className="stat-label">D+{nextMilestone} 기념일</span>
              </div>
              <span className="stat-arrow">›</span>
            </div>
          )}
          <div className="hero-stat-card">
            <HiCalendarDays className="stat-icon blue" />
            <div className="stat-content">
              <span className="stat-value">{thisMonthCount}</span>
              <span className="stat-label">이번 달 일정</span>
            </div>
          </div>
        </div>
      </div>

      {/* 여행 섹션 */}
      <div className="home-card home-trip-section" onClick={() => navigate('/travel', { replace: true })}>
        <div className="card-label">
          {ongoingTrip
            ? <HiMapPin className="card-label-icon" />
            : <HiPaperAirplane className="card-label-icon" />
          }
          {ongoingTrip ? '지금 여행 중' : '다음 여행'}
        </div>
        {relevantTrip ? (
          <>
            <div className="trip-section-row">
              <div className="trip-section-info">
                <div className="trip-section-title">{relevantTrip.title}</div>
                <div className="trip-section-sub">
                  {ongoingTrip
                    ? `Day ${ongoingDay} · ${ongoingTrip.destination || ''} · ${formatTripDate(ongoingTrip.startDate)}~${formatTripDate(ongoingTrip.endDate)}`
                    : `${nextTrip.destination || ''} · ${formatTripDate(nextTrip.startDate)}~${formatTripDate(nextTrip.endDate)}`
                  }
                </div>
              </div>
              <span className={`trip-section-badge ${ongoingTrip ? 'ongoing' : 'upcoming'}`}>
                {ongoingTrip ? '여행 중' : `D-${nextTripDays}`}
              </span>
            </div>
            {ongoingTrip && todayItems.length > 0 && (
              <div className="trip-today-schedule">
                {todayItems.map((item, i) => (
                  <div key={i} className="trip-sched-item">
                    {item.time && <span className="trip-sched-time">{item.time}</span>}
                    <span className="trip-sched-title">{item.title}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="trip-empty-state">
            <HiPaperAirplane className="trip-empty-icon" />
            <span className="trip-empty-text">다음 여행은 어디로~?</span>
          </div>
        )}
      </div>

      {/* 다음 일정 */}
      {nextEvent && (
        <div
          className="home-card home-next-event"
          onClick={() => navigate(`/calendar?date=${nextEvent.start.split('T')[0]}`)}
        >
          <div className="card-label">
            <HiCalendarDays className="card-label-icon" />
            다음 일정
          </div>
          <div className="next-event-content">
            <div className="event-type-dot" style={{ background: eventTypeColor(nextEvent) }} />
            <div className="next-event-info">
              <div className="next-event-title">{nextEvent.title}</div>
              <div className="next-event-date">{formatEventDate(nextEvent.start)}</div>
            </div>
            <span className="card-arrow">›</span>
          </div>
        </div>
      )}

      {/* 디데이 */}
      {ddayEvents.length > 0 && (
        <div className="home-card home-dday-section">
          <div className="card-label">
            <HiSparkles className="card-label-icon" />
            디데이
          </div>
          <div className="dday-list">
            {ddayEvents.slice(0, 3).map((e) => {
              const daysLeft = differenceInCalendarDays(parseISO(e.start), today);
              return (
                <div
                  key={e.id}
                  className="trip-section-row clickable"
                  onClick={() => navigate(`/calendar?date=${e.start.split('T')[0]}`)}
                >
                  <div className="trip-section-info">
                    <div className="trip-section-title">{e.title}</div>
                    <div className="trip-section-sub">{formatEventDate(e.start)}</div>
                  </div>
                  <span className="trip-section-badge upcoming">
                    {daysLeft > 0 ? `D-${daysLeft}` : '오늘'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 그날의 우리 (1~3년 전 오늘) */}
      {yearAgoEvents.length > 0 && (
        <div className="home-card home-year-ago">
          <div className="card-label">
            <HiPhoto className="card-label-icon" />
            그날의 우리
          </div>
          {yearAgoEvents.map((e, i) => (
            <div
              key={i}
              className="year-ago-item clickable"
              onClick={() => navigate(`/calendar?date=${e.start.split('T')[0]}`)}
            >
              <div className="event-type-dot" style={{ background: eventTypeColor(e) }} />
              <div className="year-ago-info">
                <div className="year-ago-title">{e.title}</div>
                <div className="year-ago-date">{formatYearAgoDate(e.start)}</div>
              </div>
              <span className="year-ago-badge">{e.yearsAgo}년 전</span>
            </div>
          ))}
        </div>
      )}

      {/* 버킷리스트 진행률 + 돌림판 */}
      {bucketStats.total > 0 && (
        <div className="home-bucket-section">
          <div className="home-card home-bucket-preview" onClick={() => navigate('/bucket', { replace: true })}>
            <div className="card-label">
              <HiCheckCircle className="card-label-icon" />
              버킷리스트 진행률
            </div>
            <div className="bucket-preview-row">
              <div className="bucket-preview-bar-wrap">
                <div
                  className="bucket-preview-bar-fill"
                  style={{ width: `${Math.round((bucketStats.completed / bucketStats.total) * 100)}%` }}
                />
              </div>
              <span className="bucket-preview-stat">
                {bucketStats.completed}/{bucketStats.total} 완료
              </span>
            </div>
          </div>
          <div className="home-card home-wheel-button" onClick={() => setIsWheelModalOpen(true)}>
            <div className="card-label">
              <span className="wheel-icon">🎡</span>
              돌림판
            </div>
            <div className="wheel-button-hint">
              항목을 선택해보세요
            </div>
          </div>
        </div>
      )}

      {/* 추억 갤러리 바로가기 */}
      <Link to="/memories" className="home-card home-memory-link">
        <div className="card-label">
          <HiPhoto className="card-label-icon" />
          추억 갤러리
        </div>
        <div className="memory-link-content">
          <span className="memory-link-text">우리의 소중한 순간들</span>
          <span className="card-arrow">›</span>
        </div>
      </Link>

      {/* 봉인 편지함 바로가기 */}
      <Link to="/letters" className="home-card home-memory-link">
        <div className="card-label">
          <HiLockClosed className="card-label-icon" />
          봉인 편지함
        </div>
        {lockedForMe.length > 0 ? (
          <div className="trip-section-row">
            <div className="trip-section-info">
              <div className="trip-section-title">
                봉인된 편지 <span className="sealed-accent-text">{lockedForMe.length}</span>통
              </div>
              <div className="trip-section-sub">
                {nextUnlockMsg ? (
                  <>
                    가장 빠른 편지{' '}
                    <span className="sealed-accent-text">
                      {format(nextUnlockMsg.unlockAt.toDate(), 'M월 d일 (E) HH:mm', { locale: ko })}
                    </span>{' '}
                    공개
                  </>
                ) : (
                  '작성자가 직접 공개할 때까지 봉인'
                )}
              </div>
            </div>
            {nextUnlockMsg && (
              <span className="trip-section-badge sealed">
                {nextUnlockDays > 0 ? `D-${nextUnlockDays}` : '오늘'}
              </span>
            )}
          </div>
        ) : (
          <div className="memory-link-content">
            <span className="memory-link-text">
              {sealedMessages.length > 0 ? `${sealedMessages.length}통의 편지` : '파트너에게 편지를 남겨보세요'}
            </span>
            <span className="card-arrow">›</span>
          </div>
        )}
      </Link>

      {/* 돌림판 모달 */}
      <WheelModal
        isOpen={isWheelModalOpen}
        onClose={() => setIsWheelModalOpen(false)}
        bucketList={bucketList}
        customCategories={customCategories}
      />
    </div>
  );
};

export default Home;
