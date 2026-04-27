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
      { path: '/login', element: <LoginPage /> },
      { path: '/couple-setup', element: <CoupleSetupPage /> },
      {
        path: '/',
        element: <ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>,
      },
      {
        path: '/calendar',
        element: <ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>,
      },
      {
        path: '/memories',
        element: <ProtectedRoute><Layout><MemoryList /></Layout></ProtectedRoute>,
      },
      {
        path: '/bucket',
        element: <ProtectedRoute><Layout><BucketListPage /></Layout></ProtectedRoute>,
      },
      {
        path: '/travel',
        element: <ProtectedRoute><Layout><TravelPlanPage /></Layout></ProtectedRoute>,
      },
      {
        path: '/travel/:tripId',
        element: <ProtectedRoute><Layout><TravelPlanPage /></Layout></ProtectedRoute>,
      },
      {
        path: '/profile',
        element: <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>,
      },
      {
        path: '/couple-info',
        element: <ProtectedRoute><Layout><CoupleInfoPage /></Layout></ProtectedRoute>,
      },
      {
        path: '/settings',
        element: <ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>,
      },
      {
        path: '/home-image-settings',
        element: <ProtectedRoute><Layout><HomeImageSettingsPage /></Layout></ProtectedRoute>,
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
