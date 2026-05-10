import React from 'react';
import { Link } from 'react-router-dom';
import './EmptyState.css';

const EmptyState = ({
  icon = '📋',
  title = '데이터가 없습니다',
  text = '',
  button = null,
  children = null,
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">{icon}</div>
      <h2 className="empty-state-title">{title}</h2>
      {text && <p className="empty-state-text">{text}</p>}

      {button && (
        button.link ? (
          <Link to={button.link} className="empty-state-button">
            {button.text}
          </Link>
        ) : (
          <button onClick={button.onClick} className="empty-state-button">
            {button.text}
          </button>
        )
      )}

      {children}
    </div>
  );
};

export default EmptyState;
