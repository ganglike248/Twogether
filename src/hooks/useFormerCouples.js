// src/hooks/useFormerCouples.js
// 연결이 해제돼 30일 동안 보관 중인 이전 커플 목록 — 커플 연결 화면(취소·기록 저장 카드), 데이터 백업 화면,
// 회원 탈퇴 화면에서 씀. 서버 콜러블이라 실시간 구독이 아니고, 해제/취소/새 연결 뒤엔 reload()로 다시 불러옴.
import { useCallback, useEffect, useState } from 'react';
import { listFormerCouples } from '../services/coupleLifecycleService';

const useFormerCouples = (enabled = true) => {
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    try {
      setCouples(await listFormerCouples());
    } catch (error) {
      // 목록을 못 불러와도 화면의 다른 기능은 그대로 써야 하므로 조용히 빈 목록
      console.error('이전 커플 목록 조회 실패:', error);
      setCouples([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    reload();
  }, [enabled, reload]);

  return { couples, loading, reload };
};

export default useFormerCouples;
