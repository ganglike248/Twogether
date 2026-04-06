// src/components/Migration/MigrationPage.jsx
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { runMigration } from '../../services/migrationService';
import { signOut } from '../../services/authService';
import { HiHeart, HiCheckCircle, HiExclamationCircle } from 'react-icons/hi2';
import './MigrationPage.css';

const COLLECTION_LABELS = {
  events: '캘린더 일정',
  trips: '여행 계획',
  tripSchedules: '여행 일정',
  travelTimes: '이동 시간',
  bucketlists: '버킷리스트',
};

const MigrationPage = () => {
  const { coupleId } = useAuthContext();
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'done' | 'error'
  const [progress, setProgress] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  const handleMigrate = async () => {
    setStatus('running');
    setProgress({});
    setErrorMsg('');

    try {
      await runMigration(coupleId, (colName, done, total) => {
        setProgress(prev => ({ ...prev, [colName]: { done, total } }));
      });

      // migrationDone 플래그 설정
      await updateDoc(doc(db, 'couples', coupleId), { migrationDone: true });
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.message || '마이그레이션 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  const handleSkip = async () => {
    try {
      await updateDoc(doc(db, 'couples', coupleId), { migrationDone: true });
    } catch {
      // 무시
    }
  };

  return (
    <div className="migration-page">
      <div className="migration-container">
        <div className="migration-logo">
          <HiHeart className="migration-heart" />
          <h1 className="migration-title">우리두리</h1>
        </div>

        <h2 className="migration-heading">데이터 이전</h2>
        <p className="migration-desc">
          기존 앱의 데이터(일정, 여행, 버킷리스트 등)를<br />
          새 계정으로 옮겨올 수 있습니다.<br />
          <strong>두 사람 중 한 명만 실행</strong>하면 됩니다.
        </p>

        {status === 'idle' && (
          <div className="migration-actions">
            <button className="migration-btn" onClick={handleMigrate}>
              데이터 이전 시작
            </button>
            <button className="migration-skip-btn" onClick={handleSkip}>
              기존 데이터 없음 (새로 시작)
            </button>
          </div>
        )}

        {(status === 'running' || status === 'done') && (
          <div className="migration-progress-list">
            {Object.entries(COLLECTION_LABELS).map(([key, label]) => {
              const p = progress[key];
              const isDone = status === 'done' || (p && p.total !== null && p.done === p.total);
              const isStarted = p !== undefined;
              return (
                <div key={key} className={`migration-progress-item ${isDone ? 'done' : isStarted ? 'active' : 'pending'}`}>
                  <span className="migration-progress-label">{label}</span>
                  <span className="migration-progress-status">
                    {isDone ? (
                      <HiCheckCircle className="migration-check" />
                    ) : isStarted ? (
                      <span className="migration-spinner" />
                    ) : (
                      <span className="migration-dot" />
                    )}
                  </span>
                  {isStarted && p.total !== null && (
                    <span className="migration-progress-count">{p.done}/{p.total}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {status === 'done' && (
          <div className="migration-success">
            <HiCheckCircle className="migration-success-icon" />
            <p className="migration-success-text">데이터 이전이 완료됐습니다! 💕</p>
            <p className="migration-success-sub">잠시 후 앱이 자동으로 시작됩니다.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="migration-error-box">
            <HiExclamationCircle className="migration-error-icon" />
            <p className="migration-error-msg">{errorMsg}</p>
            <button className="migration-btn" onClick={handleMigrate}>다시 시도</button>
          </div>
        )}

        <button className="migration-logout" onClick={signOut}>로그아웃</button>
      </div>
    </div>
  );
};

export default MigrationPage;
