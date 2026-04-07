// src/components/Auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, userDoc, coupleDoc, loading } = useAuthContext();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg, #fdf5f7 0%, #fff0f5 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, border: '3px solid #ffb6c1',
            borderTopColor: '#ff6b6b', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#b5838d', fontSize: '0.9rem' }}>불러오는 중...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!userDoc?.coupleId) return <Navigate to="/couple-setup" replace />;

  if (coupleDoc && !coupleDoc.migrationDone) {
    console.log('[ProtectedRoute] migrationDone=false → /migration 유지');
    return <Navigate to="/migration" replace />;
  }

  return children;
};

export default ProtectedRoute;
