// src/App.jsx
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Layout from './components/common/Layout';
import ScrollToTop from './components/common/ScrollToTop';
import PWAUpdatePrompt from './components/common/PWAUpdatePrompt';
import NotFoundPage from './components/common/NotFoundPage';

// 페이지 컴포넌트 lazy loading — 방문 시점에만 해당 청크 로드
const LoginPage = lazy(() => import('./components/Auth/LoginPage'));
const CoupleSetupPage = lazy(() => import('./components/Auth/CoupleSetupPage'));
const Home = lazy(() => import('./components/Home/Home'));
const Calendar = lazy(() => import('./components/Calendar/Calendar'));
const MemoryList = lazy(() => import('./components/Memory/MemoryList'));
const BucketListPage = lazy(() => import('./components/BucketList/BucketListPage'));
const TravelPlanPage = lazy(() => import('./components/Travel/TravelPlanPage'));
const ProfilePage = lazy(() => import('./components/Profile/ProfilePage'));
const CoupleInfoPage = lazy(() => import('./components/CoupleInfo/CoupleInfoPage'));
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage'));
const HomeImageSettingsPage = lazy(() => import('./components/HomeImageSettings/HomeImageSettingsPage'));
const PrivacyPage = lazy(() => import('./components/Privacy/PrivacyPage'));

import './App.css';

// 페이지 전환 중 표시할 로딩 UI (index.html preloader와 동일한 스타일)
const PageLoader = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fdf5f7 0%, #fff0f5 100%)',
  }}>
    <div style={{
      width: 40,
      height: 40,
      border: '3px solid #ffb6c1',
      borderTopColor: '#ff6b6b',
      borderRadius: '50%',
      animation: 'preloader-spin 0.8s linear infinite',
    }} />
  </div>
);

const RootLayout = () => (
  <ErrorBoundary>
    <AuthProvider>
      <ScrollToTop />
      <ToastContainer position="bottom-right" />
      <PWAUpdatePrompt />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AuthProvider>
  </ErrorBoundary>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage />, key: 'login' },
      { path: '/couple-setup', element: <CoupleSetupPage />, key: 'couple-setup' },
      { path: '/privacy', element: <PrivacyPage />, key: 'privacy' },
      {
        path: '/',
        element: <ProtectedRoute key="home"><Layout><Home /></Layout></ProtectedRoute>,
        key: 'home',
      },
      {
        path: '/calendar',
        element: <ProtectedRoute key="calendar"><Layout><Calendar /></Layout></ProtectedRoute>,
        key: 'calendar',
      },
      {
        path: '/memories',
        element: <ProtectedRoute key="memories"><Layout><MemoryList /></Layout></ProtectedRoute>,
        key: 'memories',
      },
      {
        path: '/bucket',
        element: <ProtectedRoute key="bucket"><Layout><BucketListPage /></Layout></ProtectedRoute>,
        key: 'bucket',
      },
      {
        path: '/travel',
        element: <ProtectedRoute key="travel"><Layout><TravelPlanPage /></Layout></ProtectedRoute>,
        key: 'travel',
      },
      {
        path: '/travel/:tripId',
        element: <ProtectedRoute key="travel-detail"><Layout><TravelPlanPage /></Layout></ProtectedRoute>,
        key: 'travel-detail',
      },
      {
        path: '/profile',
        element: <ProtectedRoute key="profile"><Layout><ProfilePage /></Layout></ProtectedRoute>,
        key: 'profile',
      },
      {
        path: '/couple-info',
        element: <ProtectedRoute key="couple-info"><Layout><CoupleInfoPage /></Layout></ProtectedRoute>,
        key: 'couple-info',
      },
      {
        path: '/settings',
        element: <ProtectedRoute key="settings"><Layout><SettingsPage /></Layout></ProtectedRoute>,
        key: 'settings',
      },
      {
        path: '/home-image-settings',
        element: <ProtectedRoute key="home-image-settings"><Layout><HomeImageSettingsPage /></Layout></ProtectedRoute>,
        key: 'home-image-settings',
      },
      { path: '*', element: <NotFoundPage />, key: 'not-found' },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
