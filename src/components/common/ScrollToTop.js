import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logPageView } from '../../services/analyticsService';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        logPageView(`Page: ${pathname}`, pathname);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
