// src/App.jsx
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import CoupleSetupPage from './components/Auth/CoupleSetupPage';
import Layout from './components/common/Layout';
import ScrollToTop from './components/common/ScrollToTop';
import PWAUpdatePrompt from './components/common/PWAUpdatePrompt';
import Home from './components/Home/Home';
import Calendar from './components/Calendar/Calendar';
import MemoryList from './components/Memory/MemoryList';
import BucketListPage from './components/BucketList/BucketListPage';
import TravelPlanPage from './components/Travel/TravelPlanPage';
import ProfilePage from './components/Profile/ProfilePage';
import CoupleInfoPage from './components/CoupleInfo/CoupleInfoPage';
import SettingsPage from './components/Settings/SettingsPage';
import HomeImageSettingsPage from './components/HomeImageSettings/HomeImageSettingsPage';

import './App.css';

// AuthProvider와 공통 컴포넌트를 라우터 내부에 배치해야 useNavigate 등이 동작함
const RootLayout = () => (
  <AuthProvider>
    <ScrollToTop />
    <ToastContainer position="bottom-right" />
    <PWAUpdatePrompt />
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage />, key: 'login' },
      { path: '/couple-setup', element: <CoupleSetupPage />, key: 'couple-setup' },
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
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
