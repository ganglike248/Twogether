// src/components/Auth/CoupleSetupPage.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { HiHeart } from 'react-icons/hi2';
import { createCouple, joinCouple, signOut } from '../../services/authService';
import { useAuthContext } from '../../contexts/AuthContext';
import NotificationPrimingModal from '../common/NotificationPrimingModal';
import ConfirmModal from '../common/ConfirmModal';
import FormerCouplesPanel from '../Account/FormerCouplesPanel';
import CoupleEndedNoticeModal from '../Account/CoupleEndedNoticeModal';
import useFormerCouples from '../../hooks/useFormerCouples';
import NicknameStep from './NicknameStep';
import CoupleChoiceStep from './CoupleChoiceStep';
import InviteStep from './InviteStep';
import JoinStep from './JoinStep';
import './AuthFlow.css';
import '../Account/account.css';
import './CoupleSetupPage.css';

const CoupleSetupPage = () => {
  const { user, userDoc, coupleDoc, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  // 단계는 URL(?step=invite|join)로 — 안드로이드 뒤로가기가 이전 단계로 돌아가도록(로그인 흐름과 같은 방식)
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get('step');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  // 연결 해제 후 30일 보관 중인 이전 커플 — 취소/기록 저장 카드, 새 커플 시작 전 경고에 씀
  const { couples: formerCouples, loading: formerLoading, reload: reloadFormer } = useFormerCouples(!!user);
  const [nicknameDone, setNicknameDone] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'create' | 'join' — 경고 확인 대기

  // 새로고침 복구: coupleDoc이 1명이면 초대 코드를 state에 복원하여 파트너 연결 감지 유지
  useEffect(() => {
    if (!generatedCode && coupleDoc?.members?.length === 1 && coupleDoc?.inviteCode) {
      setGeneratedCode(coupleDoc.inviteCode);
    }
  }, [coupleDoc?.members?.length, coupleDoc?.inviteCode, generatedCode]);

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

  // 이미 커플 연결 완료된 사용자 → 홈으로
  if (!authLoading && user && coupleDoc?.members?.length >= 2 && !generatedCode) return <Navigate to="/" replace />;

  // 첫 실행 닉네임 단계 — 닉네임을 확정한 적 없고 아직 커플을 만들지 않은 사용자에게 한 번(이름 미리 채워짐).
  // 예전 커플 기록 여부(listFormerCouples, 서버 호출이라 몇 초 걸림)는 일부러 조건에서 뺌 — 그걸 기다리는 동안
  // 선택 화면이 먼저 보였다가 닉네임 화면으로 바뀌는 깜빡임이 있었음. 연결 해제 후 다시 오는 사람도 한 번 보는 정도는 무해.
  // ?step=nickname은 선택 화면의 뒤로 버튼으로 닉네임을 다시 고치는 경우.
  const editingNickname = stepParam === 'nickname';
  const needsNickname = editingNickname
    || (!nicknameDone && userDoc && !userDoc.nicknameConfirmed && !coupleDoc && !generatedCode);
  if (needsNickname && userDoc) {
    // 여기서 return하므로 아래쪽 goChoice는 아직 선언 전 — 직접 이동
    const backToChoice = () => setSearchParams(generatedCode ? { step: 'choice' } : {}, { replace: true });
    return (
      <NicknameStep
        initialName={userDoc.displayName || ''}
        onBack={editingNickname ? backToChoice : undefined}
        onDone={() => { setNicknameDone(true); if (editingNickname) backToChoice(); }}
      />
    );
  }

  // 단계를 따로 지정하지 않았을 때: 이미 초대 코드를 만들어 둔 상태(새로고침·재방문 포함)면 초대 화면, 아니면 선택 화면.
  // 코드를 만든 뒤에도 뒤로 가서 "코드를 받았어요"를 고를 수 있음(상대가 먼저 코드를 만든 경우) —
  // 그때 내 혼자 커플은 서버 joinCoupleWithInviteCode가 정리함(v1.0.6 교차 합류 처리).
  const step = ['invite', 'join', 'choice'].includes(stepParam) ? stepParam : (generatedCode ? 'invite' : 'choice');
  const goStep = (next) => { setError(''); setSearchParams({ step: next }); };
  const goChoice = () => { setError(''); setSearchParams(generatedCode ? { step: 'choice' } : {}, { replace: true }); };

  const doCreateCouple = async () => {
    setError('');
    setFormLoading(true);
    try {
      const { inviteCode: code } = await createCouple(user.uid, anniversaryDate);
      setGeneratedCode(code);
      reloadFormer();
    } catch {
      setError('커플 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setFormLoading(false);
    }
  };

  const doJoinCouple = async () => {
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

  // 보관 중인 이전 커플이 있으면 새로 연결하기 전에 한 번 알려줌(해제한 사람은 취소 기회를 잃게 됨)
  const handleCreateCouple = (e) => {
    e.preventDefault();
    if (!anniversaryDate) { setError('연애 시작일을 입력해주세요.'); return; }
    if (formerCouples.length > 0) { setPendingAction('create'); return; }
    doCreateCouple();
  };

  const handleJoinCouple = (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) { setError('초대 코드를 입력해주세요.'); return; }
    if (formerCouples.length > 0) { setPendingAction('join'); return; }
    doJoinCouple();
  };

  const confirmPendingAction = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'create') doCreateCouple();
    else if (action === 'join') doJoinCouple();
  };

  const anyCancelable = formerCouples.some((c) => c.canCancel);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const modals = (
    <>
      <NotificationPrimingModal />
      <CoupleEndedNoticeModal formerCouples={formerCouples} loading={formerLoading} />
      <ConfirmModal
        isOpen={!!pendingAction}
        title={pendingAction === 'join' ? '새 커플과 연결할까요?' : '새 커플을 시작할까요?'}
        message={anyCancelable
          ? '보관 중인 이전 기록이 있어요. 새로 연결하면 연결 해제를 취소할 수 없게 돼요.\n이전 기록은 남은 기간 동안 설정 → 데이터 백업에서 파일로 저장할 수 있어요.'
          : '보관 중인 이전 기록은 남은 기간 동안 설정 → 데이터 백업에서 파일로 저장할 수 있어요.'}
        confirmText="계속하기"
        danger={false}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );

  // 연결 완료 화면은 ③단계에서 새 디자인(다이어리 첫 장 + D+N)으로 교체 예정 — 지금은 기존 화면 유지
  if (connected) {
    return (
      <div className="couple-setup-page">
        <div className="couple-setup-container">
          <div className="couple-connected">
            <HiHeart className="couple-connected-heart" />
            <p className="couple-connected-title">커플 연결 완료!</p>
            <p className="couple-connected-desc">두 사람이 정상적으로 연결되었어요.<br />잠시 후 앱이 시작됩니다.</p>
            <div className="couple-connected-spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {step === 'invite' ? (
        <InviteStep
          code={generatedCode}
          myName={userDoc?.displayName}
          anniversaryDate={anniversaryDate}
          onDateChange={setAnniversaryDate}
          onCreate={handleCreateCouple}
          loading={formLoading}
          error={error}
          onBack={goChoice}
        />
      ) : step === 'join' ? (
        <JoinStep
          code={inviteCode}
          onCodeChange={setInviteCode}
          onSubmit={handleJoinCouple}
          loading={formLoading}
          error={error}
          onBack={goChoice}
        />
      ) : (
        <CoupleChoiceStep
          onBack={() => goStep('nickname')}
          onInvite={() => goStep('invite')}
          onJoin={() => goStep('join')}
          onLogout={handleLogout}
          onDeleteAccount={() => navigate('/delete-account')}
          formerPanel={formerCouples.length > 0
            ? <FormerCouplesPanel couples={formerCouples} onChanged={reloadFormer} />
            : null}
        />
      )}
      {modals}
    </>
  );
};

export default CoupleSetupPage;
