import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdErrorOutline } from 'react-icons/md';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <MdErrorOutline size={80} color="#e74c3c" style={{ marginBottom: '24px' }} />
      <h1 style={{
        color: '#2c3e50',
        fontSize: '32px',
        fontWeight: 'bold',
        marginBottom: '12px',
      }}>
        404
      </h1>
      <h2 style={{
        color: '#2c3e50',
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '12px',
      }}>
        페이지를 찾을 수 없어요
      </h2>
      <p style={{
        color: '#7f8c8d',
        fontSize: '14px',
        marginBottom: '32px',
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        요청하신 페이지가 존재하지 않습니다. 홈페이지로 돌아가주세요.
      </p>

      <button
        onClick={() => navigate('/')}
        style={{
          padding: '12px 32px',
          fontSize: '16px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}

export default NotFoundPage;
