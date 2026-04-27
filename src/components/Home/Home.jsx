// src/components/Home/Home.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  differenceInCalendarDays, differenceInMonths, addMonths,
  isSameMonth, parseISO, startOfDay, format, subYears, addDays
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  HiCalendarDays, HiPhoto, HiMapPin, HiPaperAirplane, HiSparkles, HiCheckCircle, HiHeart
} from 'react-icons/hi2';
import useCalendar from '../../hooks/useCalendar';
import { useTrips, useTripSchedules } from '../../hooks/useTrip';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { convertToDate } from '../../utils/dataUtils';
import TutorialSlides from '../Onboarding/TutorialSlides';
import WheelModal from '../Wheel/WheelModal';
import './Home.css';

const Home = () => {
  const { coupleId, coupleDoc } = useAuthContext();
  const anniversaryDate = coupleDoc?.anniversaryDate || null;
  const location = useLocation();

  const [dday, setDday] = useState(0);
  const [bucketStats, setBucketStats] = useState({ total: 0, completed: 0 });
  const [bucketList, setBucketList] = useState([]);
  const [customCategories, setCustomCategories] = useState({});
  const [showTutorial, setShowTutorial] = useState(
    () => !!location.state?.showTutorial
  );
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const { events } = useCalendar(coupleId);
  const { trips } = useTrips(coupleId);
  const navigate = useNavigate();

  // 프로필 또는 커플 연결 후 튜토리얼 표시
  useEffect(() => {
    if (location.state?.showTutorial) {
      setShowTutorial(true);
    }
  }, [location.state?.showTutorial]);

  const heroImageUrl = coupleDoc?.heroImageUrl || null;

  useEffect(() => {
    if (!anniversaryDate) return;
    const startDate = new Date(anniversaryDate);
    const today = new Date();
    const dayDifference = differenceInCalendarDays(today, startDate) + 1;
    setDday(dayDifference);
  }, [anniversaryDate]);

  // 버킷리스트 구독
  useEffect(() => {
    if (!coupleId) return;
    const q = query(collection(db, 'bucketlists'), where('coupleId', '==', coupleId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBucketList(all);
      setBucketStats({ total: all.length, completed: all.filter(d => d.completed).length });
    });
    return () => unsubscribe();
  }, [coupleId]);

  // 커스텀 카테고리 구독
  useEffect(() => {
    if (!coupleId) return;
    const coupleDocRef = doc(db, 'couples', coupleId);
    const unsubscribe = onSnapshot(coupleDocRef, (coupleDocSnap) => {
      try {
        const loadedCustomCategories = coupleDocSnap.data()?.customCategories || {};
        setCustomCategories(loadedCustomCategories);
      } catch (error) {
        console.error('카테고리 로드 실패:', error);
      }
    });
    return () => unsubscribe();
  }, [coupleId]);

  const today = new Date();
  const isSpecialDay = dday % 100 === 0 && dday > 0;

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
  const todayItems = todayScheduleData?.schedules?.slice(0, 3) || [];

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

  // 1년 전 오늘 ±3일 이벤트
  const oneYearAgo = subYears(today, 1);
  const yearAgoEvents = events.filter(e => {
    try {
      const d = parseISO(e.start);
      return Math.abs(differenceInCalendarDays(d, oneYearAgo)) <= 3;
    } catch { return false; }
  });

  // 다음 100일 기념일
  const nextMilestone = Math.ceil(dday / 100) * 100;
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
    const type = event?.extendedProps?.eventType;
    if (type === 'couple') return '#ff6b6b';
    if (type === 'boyfriend') return '#81bbf5';
    if (type === 'girlfriend') return '#6ec49a';
    return '#adb5bd';
  };

  return (
    <div className="home-container">
      {showTutorial && (
        <TutorialSlides onClose={() => setShowTutorial(false)} />
      )}

      {/* 히어로: 사진(좌) + 기념일/이번달/연애기간(우) */}
      <div className="home-hero-split">
        <div className="hero-photo-col">
          {heroImageUrl ? (
            <>
              <img src={heroImageUrl} alt="우리" className="hero-img" />
              <div className="hero-overlay" />
              <div className="hero-text">
                <div className="hero-dday">❤+{dday}</div>
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
                <span className="stat-value">D-{daysToMilestone}</span>
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
            <span className="trip-empty-icon">✈️</span>
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

      {/* 1년 전 오늘 */}
      {yearAgoEvents.length > 0 && (
        <div className="home-card home-year-ago">
          <div className="card-label">
            <HiPhoto className="card-label-icon" />
            1년 전 오늘
          </div>
          {yearAgoEvents.slice(0, 2).map((e, i) => (
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
              <span className="card-arrow">›</span>
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

      {/* 100일 기념 마일스톤 */}
      {isSpecialDay && (
        <motion.div
          className="home-milestone"
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            type: 'spring',
            stiffness: 120,
            damping: 15,
          }}
        >
          <div className="milestone-badge">D+{dday}</div>
        </motion.div>
      )}

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
