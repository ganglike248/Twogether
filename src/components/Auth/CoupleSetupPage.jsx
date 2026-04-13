// src/components/Auth/CoupleSetupPage.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HiHeart, HiClipboardDocument, HiCheck } from 'react-icons/hi2';
import { createCouple, joinCouple, signOut } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import './CoupleSetupPage.css';

const CoupleSetupPage = () => {
  const { user, coupleDoc, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  // creator: 파트너가 합류하면(members가 2명이 되면) 연결 완료 감지
  useEffect(() => {
    if (!generatedCode) return;
    if (coupleDoc?.members?.length >= 2) {
      setConnected(true);
    }
  }, [coupleDoc?.members?.length, generatedCode]);

  // 연결 완료 후 2초 뒤 홈으로 이동
  useEffect(() => {
    if (!connected) return;
    const timer = setTimeout(() => navigate('/', { replace: true, state: { showTutorial: true } }), 2000);
    return () => clearTimeout(timer);
  }, [connected, navigate]);

  // 로그아웃 후 또는 미로그인 상태 → 로그인 페이지
  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError('');
    setGeneratedCode('');
  };

  const handleCreateCouple = async (e) => {
    e.preventDefault();
    if (!anniversaryDate) { setError('연애 시작일을 입력해주세요.'); return; }
    setError('');
    setFormLoading(true);
    try {
      const { inviteCode: code } = await createCouple(user.uid, anniversaryDate);
      setGeneratedCode(code);
    } catch (err) {
      setError('커플 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleJoinCouple = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError('초대 코드를 입력해주세요.'); return; }
    setError('');
    setFormLoading(true);
    try {
      await joinCouple(user.uid, inviteCode.trim());
      setConnected(true);
    } catch (err) {
      setError(err.message || '초대 코드가 유효하지 않습니다.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="couple-setup-page">
      <div className="couple-setup-container">
        <div className="couple-setup-logo">
          <HiHeart className="couple-setup-heart" />
          <h1 className="couple-setup-title">우리두리</h1>
          <p className="couple-setup-subtitle">커플 연결을 시작해요</p>
        </div>

        {connected ? (
          <div className="couple-connected">
            <HiHeart className="couple-connected-heart" />
            <p className="couple-connected-title">커플 연결 완료!</p>
            <p className="couple-connected-desc">두 사람이 정상적으로 연결되었어요 💕<br />잠시 후 앱이 시작됩니다.</p>
            <div className="couple-connected-spinner" />
          </div>
        ) : (
          <>
            <div className="couple-setup-tabs">
              <button
                className={`couple-tab${tab === 'create' ? ' active' : ''}`}
                onClick={() => handleTabChange('create')}
              >
                새 커플 시작
              </button>
              <button
                className={`couple-tab${tab === 'join' ? ' active' : ''}`}
                onClick={() => handleTabChange('join')}
              >
                초대 코드 입력
              </button>
            </div>

            {tab === 'create' ? (
              <div className="couple-setup-content">
                {!generatedCode ? (
                  <form className="couple-setup-form" onSubmit={handleCreateCouple}>
                    <div className="couple-setup-field">
                      <label>연애 시작일</label>
                      <input
                        type="date"
                        value={anniversaryDate}
                        onChange={e => setAnniversaryDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <span className="couple-setup-hint">우리가 처음 만난 날을 입력해주세요</span>
                    </div>
                    {error && <p className="couple-setup-error">{error}</p>}
                    <button type="submit" className="couple-setup-btn" disabled={formLoading}>
                      {formLoading ? '생성 중...' : '초대 코드 생성'}
                    </button>
                  </form>
                ) : (
                  <div className="couple-code-result">
                    <p className="code-result-label">초대 코드가 생성됐어요!</p>
                    <div className="code-display">
                      <span className="code-text">{generatedCode}</span>
                      <button className="code-copy-btn" onClick={handleCopy}>
                        {copied ? <HiCheck /> : <HiClipboardDocument />}
                      </button>
                    </div>
                    <p className="code-result-desc">
                      이 코드를 상대방에게 전달하세요.<br />
                      상대방이 코드를 입력하면 커플 연결이 완료돼요.
                    </p>
                    <p className="code-result-waiting">⏳ 상대방의 연결을 기다리는 중...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="couple-setup-content">
                <form className="couple-setup-form" onSubmit={handleJoinCouple}>
                  <div className="couple-setup-field">
                    <label>초대 코드</label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="6자리 코드를 입력해주세요"
                      maxLength={6}
                      style={{ letterSpacing: '0.2em', textAlign: 'center', fontSize: '1.2rem' }}
                    />
                    <span className="couple-setup-hint">상대방이 생성한 6자리 코드를 입력하세요</span>
                  </div>
                  {error && <p className="couple-setup-error">{error}</p>}
                  <button type="submit" className="couple-setup-btn" disabled={formLoading}>
                    {formLoading ? '연결 중...' : '커플 연결하기'}
                  </button>
                </form>
              </div>
            )}

            <button className="couple-setup-logout" onClick={signOut}>
              로그아웃
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CoupleSetupPage;
