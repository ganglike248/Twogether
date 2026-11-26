// src/components/common/OfflineBanner.jsx
// 연결 상태 표시(AUDIT E-1·E-4) — 오프라인이면 화면 위에 작은 띠, 다시 연결되면 잠깐 알림.
// 저장이 대기열로 넘어가면(offlineWrite.settleWrite) "연결되면 저장돼요" 토스트 — 같은 문구는 한 번만 뜨게 toastId 고정.
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MdCloudOff } from 'react-icons/md';
import { QUEUED_WRITE_EVENT } from '../../services/offlineWrite';
import './OfflineBanner.css';

const OfflineBanner = () => {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      toast.info('다시 연결됐어요. 기다리던 저장도 올라가요.', { toastId: 'back-online', autoClose: 2500 });
    };
    const onQueued = (e) => {
      const slow = e.detail?.reason === 'slow';
      toast.info(slow ? '연결이 느려요. 연결되면 자동으로 저장돼요.' : '오프라인이라 연결되면 자동으로 저장돼요.', { toastId: 'queued-write', autoClose: 3000 });
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    window.addEventListener(QUEUED_WRITE_EVENT, onQueued);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      window.removeEventListener(QUEUED_WRITE_EVENT, onQueued);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <MdCloudOff aria-hidden="true" />
      오프라인이에요 · 볼 수는 있고, 저장은 연결되면 올라가요
    </div>
  );
};

export default OfflineBanner;
