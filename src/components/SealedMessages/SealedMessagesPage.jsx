// src/components/SealedMessages/SealedMessagesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { HiLockClosed, HiLockOpen, HiPlus, HiEnvelope, HiArrowLeft } from 'react-icons/hi2';
import { useAuthContext } from '../../contexts/AuthContext';
import { subscribeSealedMessages } from '../../services/sealedMessageService';
import SealedMessageComposeModal from './SealedMessageComposeModal';
import SealedMessageDetailModal from './SealedMessageDetailModal';
import EmptyState from '../common/EmptyState';
import './SealedMessagesPage.css';

const formatCreatedLabel = (msg) => {
  if (!msg.createdAt) return '작성 중...';
  return `${format(msg.createdAt.toDate(), 'yyyy.M.d', { locale: ko })} 작성`;
};

const formatUnlockLabel = (msg) => {
  if (msg.isUnlocked) {
    return msg.unlockedAt
      ? `${format(msg.unlockedAt.toDate(), 'yyyy.M.d', { locale: ko })} 공개됨`
      : '공개됨';
  }
  if (msg.unlockAt) {
    return `${format(msg.unlockAt.toDate(), 'yyyy.M.d HH:mm', { locale: ko })}에 열려요`;
  }
  return '작성자가 직접 공개할 때까지 봉인';
};

const SealedMessagesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, coupleId, coupleDoc, getMemberName } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // 모달 열림 상태를 useState 대신 쿼리에서 파생 — 손수 만든 pushState/popstate 훅
  // (useModalBackButton) 없이 React Router가 히스토리를 전담하게 함(캘린더와 같은 이유).
  const [searchParams] = useSearchParams();
  const showCompose = searchParams.get('modal') === 'compose';
  const selectedId = searchParams.get('letter');
  const selected = selectedId ? messages.find((m) => m.id === selectedId) || null : null;

  // location.key === 'default'면 이 세션에서 첫 진입(딥링크/새로고침)이라 navigate(-1)이
  // 앱 밖으로 나갈 수 있어 대신 /letters로 보냄 — 캘린더 closeModal과 동일한 패턴.
  const closeModal = () => {
    if (location.key === 'default') {
      navigate('/letters', { replace: true });
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!coupleId) return;
    const unsubscribe = subscribeSealedMessages(coupleId, (data) => {
      setMessages(data);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [coupleId]);

  const canOpen = (msg) => msg.isUnlocked || msg.authorUid === user?.uid;

  // 커플 색상 설정(boyfriend/girlfriend)을 그대로 재사용 — 캘린더/이벤트와 동일한 색으로
  // 작성자를 구분해서 앱 전체에서 같은 사람 = 같은 색이 되도록 함
  const authorRole = (authorUid) => (authorUid === coupleDoc?.members?.[0] ? 'boyfriend' : 'girlfriend');
  const authorColor = (authorUid) => `var(--color-${authorRole(authorUid)})`;
  // 파스텔 배경 위 흰 글씨는 대비가 부족할 수 있어, useColorSync가 미리 계산해둔 대비색 변수를 사용
  const authorFontColor = (authorUid) => `var(--color-${authorRole(authorUid)}-font)`;
  // 본인 것은 이름 대신 항상 '나'로 표시 — 굳이 자기 닉네임을 다시 확인할 필요는 없음
  const authorLabel = (msg) =>
    msg.authorUid === user?.uid ? '나' : getMemberName(authorRole(msg.authorUid));

  // 봉인 중인 편지: 늦게 열리는 편지가 위로(무기한 봉인은 가장 위) / 공개된 편지: 전부 아래로
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? 1 : -1;
      if (!a.isUnlocked) {
        if (!a.unlockAt && !b.unlockAt) return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        if (!a.unlockAt) return -1;
        if (!b.unlockAt) return 1;
        return b.unlockAt.toMillis() - a.unlockAt.toMillis();
      }
      return (b.unlockedAt?.toMillis() || 0) - (a.unlockedAt?.toMillis() || 0);
    });
  }, [messages]);

  return (
    <div className="sm-page">
      <div className="sm-page-header">
        <div className="sm-page-title-group">
          <button className="sm-back-btn" onClick={() => navigate('/')}>
            <HiArrowLeft />
          </button>
          <p className="sm-page-title">봉인 편지함</p>
        </div>
        <button className="sm-write-btn" onClick={() => navigate('/letters?modal=compose', { state: { modal: true } })}>
          <HiPlus /> 편지 쓰기
        </button>
      </div>

      {isLoading ? null : messages.length === 0 ? (
        <EmptyState
          icon={<HiEnvelope size={56} color="#b4aee8" />}
          title="아직 봉인된 편지가 없어요"
          text="파트너에게 편지를 써서 봉인해보세요"
        />
      ) : (
        <div className="sm-list">
          {sortedMessages.map((msg) => {
            const openable = canOpen(msg);
            return (
              <div
                key={msg.id}
                className={`sm-item ${openable ? '' : 'sm-item--locked'}`}
                style={{ borderLeftColor: authorColor(msg.authorUid) }}
                onClick={() => openable && navigate(`/letters?letter=${msg.id}`, { state: { modal: true } })}
              >
                {msg.isUnlocked ? (
                  <HiLockOpen className="sm-item-icon sm-item-icon--unlocked" />
                ) : (
                  <HiLockClosed className="sm-item-icon" />
                )}
                <div className="sm-item-info">
                  <div className="sm-item-title-row">
                    <span
                      className="sm-item-author-badge"
                      style={{
                        background: authorColor(msg.authorUid),
                        color: authorFontColor(msg.authorUid),
                      }}
                    >
                      {authorLabel(msg)}
                    </span>
                    <div className="sm-item-title">{msg.title}</div>
                  </div>
                  <div className="sm-item-meta">
                    {formatCreatedLabel(msg)}
                    {' · '}
                    {formatUnlockLabel(msg)}
                  </div>
                </div>
                {openable && <span className="sm-item-arrow">›</span>}
              </div>
            );
          })}
        </div>
      )}

      {showCompose && (
        <SealedMessageComposeModal onClose={closeModal} />
      )}
      {selected && (
        <SealedMessageDetailModal message={selected} onClose={closeModal} />
      )}
    </div>
  );
};

export default SealedMessagesPage;
