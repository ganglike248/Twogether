import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { toast } from 'react-toastify';
import { HiLockClosed, HiXMark } from 'react-icons/hi2';
import { auth } from '../../firebase';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      toast.error('현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        toast.error('사용자 정보를 찾을 수 없습니다.');
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      toast.success('비밀번호가 변경됐습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      console.error('[ChangePasswordModal] 비밀번호 변경 실패:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('현재 비밀번호가 잘못됐습니다.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('비밀번호는 최소 6자 이상이어야 합니다.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('보안을 위해 다시 로그인해주세요.');
      } else {
        toast.error(`비밀번호 변경 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="change-password-modal-overlay">
      <div className="change-password-modal">
        <div className="change-password-modal-header">
          <h2 className="change-password-modal-title">
            <HiLockClosed className="change-password-modal-icon" />
            비밀번호 변경
          </h2>
          <button
            type="button"
            className="change-password-modal-close"
            onClick={onClose}
            disabled={loading}
          >
            <HiXMark />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="change-password-modal-form">
          <div className="change-password-modal-body">
            {/* 현재 비밀번호 */}
            <div className="change-password-form-group">
              <label className="change-password-form-label">현재 비밀번호</label>
              <div className="change-password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="change-password-toggle-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={loading}
                >
                  {showCurrentPassword ? '숨김' : '표시'}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 */}
            <div className="change-password-form-group">
              <label className="change-password-form-label">새 비밀번호</label>
              <div className="change-password-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호를 입력하세요"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="change-password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                >
                  {showNewPassword ? '숨김' : '표시'}
                </button>
              </div>
              <p className="change-password-hint">최소 6자 이상</p>
            </div>

            {/* 비밀번호 확인 */}
            <div className="change-password-form-group">
              <label className="change-password-form-label">비밀번호 확인</label>
              <div className="change-password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="change-password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? '숨김' : '표시'}
                </button>
              </div>
            </div>
          </div>

          <div className="change-password-modal-footer">
            <button
              type="button"
              className="change-password-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="change-password-btn-primary"
              disabled={loading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
            >
              {loading ? '변경 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
