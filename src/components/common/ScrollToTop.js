import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logPageView } from '../../services/analyticsService';

const ScrollToTop = () => {
    const location = useLocation();
    // 캘린더 모달(DayModal/EventModal/EditLogModal)처럼 실제로는 오버레이일 뿐인 라우트는
    // navigate({ state: { modal: true } })로 열리는데, 이런 전환에서까지 맨 위로 스크롤/
    // 페이지뷰 로깅을 하면 캘린더를 스크롤해둔 채로 모달을 여닫을 때마다 화면이 위로
    // 튕기는 부작용이 생김. "이번 아니면 직전 위치가 모달"인 전환은 건너뜀 — 모달을
    // 닫고 원래 페이지로 돌아올 때(직전 위치가 모달)도 마찬가지로 건너뛰어야 하기 때문.
    const prevWasModalRef = useRef(false);

    useEffect(() => {
        const isModal = !!location.state?.modal;
        if (!isModal && !prevWasModalRef.current) {
            window.scrollTo(0, 0);
            logPageView(`Page: ${location.pathname}`, location.pathname);
        }
        prevWasModalRef.current = isModal;
    }, [location]);

    return null;
};

export default ScrollToTop;
