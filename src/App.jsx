// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './components/Auth/LoginPage';
import CoupleSetupPage from './components/Auth/CoupleSetupPage';
import MigrationPage from './components/Migration/MigrationPage';

import Layout from './components/common/Layout';
import ScrollToTop from './components/common/ScrollToTop';
import Home from './components/Home/Home';
import Calendar from './components/Calendar/Calendar';
import MemoryList from './components/Memory/MemoryList';
import BucketListPage from './components/BucketList/BucketListPage';
import TravelPlanPage from './components/Travel/TravelPlanPage';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 로그인 후, 커플 연결 전 */}
          <Route path="/couple-setup" element={<CoupleSetupPage />} />

          {/* 커플 연결 후, 마이그레이션 페이지 */}
          <Route path="/migration" element={<MigrationPage />} />

          {/* 보호된 라우트 (로그인 + 커플 연결 + 마이그레이션 완료 필요) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Layout>
                  <Calendar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/memories"
            element={
              <ProtectedRoute>
                <Layout>
                  <MemoryList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bucket"
            element={
              <ProtectedRoute>
                <Layout>
                  <BucketListPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/travel"
            element={
              <ProtectedRoute>
                <Layout>
                  <TravelPlanPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/travel/:tripId"
            element={
              <ProtectedRoute>
                <Layout>
                  <TravelPlanPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 없는 경로 → 홈 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="bottom-right" />
      </Router>
    </AuthProvider>
  );
}

export default App;
