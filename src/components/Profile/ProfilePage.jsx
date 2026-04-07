// src/components/Profile/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { HiArrowLeft, HiUser, HiHeart, HiCalendarDays, HiEnvelope } from 'react-icons/hi2';
import { db, auth } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, userDoc, coupleDoc, coupleId } = useAuthContext();

  const [displayName, setDisplayName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [partnerDoc, setPartnerDoc] = useState(null);

  useEffect(() => {
    if (userDoc) setDisplayName(userDoc.displayName || '');
  }, [userDoc]);

  useEffect(() => {
    if (coupleDoc) setAnniversaryDate(coupleDoc.anniversaryDate || '');
  }, [coupleDoc]);

  // 상대방 정보 조회
  useEffect(() => {
    if (!coupleDoc?.members || !user) return;
    const partnerUid = coupleDoc.members.find(uid => uid !== user.uid);
    if (!partnerUid) { setPartnerDoc(null); return; }

    getDoc(doc(db, 'users', partnerUid))
      .then(snap => {
        setPartnerDoc(snap.exists() ? snap.data() : null);
      })
      .catch(() => {
        setPartnerDoc(null);
      });
  }, [coupleDoc?.members, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      if (coupleId && anniversaryDate) {
        await updateDoc(doc(db, 'couples', coupleId), { anniversaryDate });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = coupleDoc?.members?.length === 2;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="profile-back" onClick={() => navigate(-1)}>
          <HiArrowLeft />
        </button>
        <h1 className="profile-title">프로필 설정</h1>
      </div>

      <form className="profile-form" onSubmit={handleSave}>

        {/* 내 정보 */}
        <p className="profile-section-label">내 정보</p>
        <div className="profile-section">
          <div className="profile-field">
            <label className="profile-label">
              <HiUser className="profile-label-icon" />
              닉네임
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={20}
              placeholder="닉네임을 입력하세요"
              required
            />
          </div>
          <div className="profile-field">
            <label className="profile-label">
              <HiEnvelope className="profile-label-icon" />
              이메일
            </label>
            <input
              type="text"
              value={userDoc?.email || ''}
              disabled
              className="profile-disabled"
            />
          </div>
        </div>

        {/* 상대방 정보 */}
        <p className="profile-section-label">상대방</p>
        <div className="profile-section">
          {isConnected && partnerDoc ? (
            <>
              <div className="profile-field">
                <label className="profile-label">
                  <HiUser className="profile-label-icon" />
                  닉네임
                </label>
                <input
                  type="text"
                  value={partnerDoc.displayName || ''}
                  disabled
                  className="profile-disabled"
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">
                  <HiEnvelope className="profile-label-icon" />
                  이메일
                </label>
                <input
                  type="text"
                  value={partnerDoc.email || ''}
                  disabled
                  className="profile-disabled"
                />
              </div>
            </>
          ) : (
            <div className="profile-field profile-waiting">
              <span className="profile-waiting-text">⏳ 상대방의 연결을 기다리는 중...</span>
              {coupleDoc?.inviteCode && (
                <span className="profile-invite-code">{coupleDoc.inviteCode}</span>
              )}
            </div>
          )}
        </div>

        {/* 커플 정보 */}
        <p className="profile-section-label">커플 정보</p>
        <div className="profile-section">
          <div className="profile-field">
            <label className="profile-label">
              <HiHeart className="profile-label-icon" />
              연애 시작일
            </label>
            <input
              type="date"
              value={anniversaryDate}
              onChange={e => setAnniversaryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <span className="profile-hint">변경하면 D+day와 기념일이 다시 계산됩니다</span>
          </div>
          {coupleDoc?.inviteCode && isConnected && (
            <div className="profile-field">
              <label className="profile-label">
                <HiHeart className="profile-label-icon" />
                초대 코드
              </label>
              <input
                type="text"
                value={coupleDoc.inviteCode}
                disabled
                className="profile-disabled profile-code"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`profile-save-btn${saved ? ' saved' : ''}`}
          disabled={loading}
        >
          {loading ? '저장 중...' : saved ? '저장됐어요 ✓' : '저장'}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
