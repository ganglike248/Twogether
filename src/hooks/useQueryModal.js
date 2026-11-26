// src/hooks/useQueryModal.js
// 모달 열림을 주소(?modal=…&키=값)에서 파생하는 공통 도우미 — 안드로이드 뒤로가기·브라우저 뒤로가 모달만 닫게(앱 모달 규칙).
// 여행 상세의 탭 위치(?tab=)는 모달을 여닫아도 유지함(안 그러면 모달 뒤 화면이 일정 탭으로 바뀜).
//  open(type, { d: 'id' })      새 기록으로 열기(뒤로가기로 닫힘)
//  open(type, params, { replace: true })  지금 모달 자리를 바꿈(연달아 뜨는 모달 — 닫으면 그 전 화면으로)
//  close()                       뒤로(첫 진입이면 모달 없는 같은 화면으로 replace — 앱 밖으로 안 나가게)
import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const KEEP = ['tab'];

export const useQueryModal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const baseParams = useCallback(() => {
    const p = new URLSearchParams();
    KEEP.forEach(k => { const v = searchParams.get(k); if (v) p.set(k, v); });
    return p;
  }, [searchParams]);

  const open = useCallback((type, params = {}, { replace = false } = {}) => {
    const p = baseParams();
    p.set('modal', type);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
    navigate(`${location.pathname}?${p.toString()}`, { replace, state: { modal: true } });
  }, [navigate, location.pathname, baseParams]);

  const close = useCallback(() => {
    if (location.key === 'default') {
      const q = baseParams().toString();
      navigate(`${location.pathname}${q ? `?${q}` : ''}`, { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, location.key, location.pathname, baseParams]);

  return { modal: searchParams.get('modal'), get: (k) => searchParams.get(k), open, close };
};
