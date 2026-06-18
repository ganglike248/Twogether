// src/components/common/Skeleton.jsx
import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width = '100%', height = '16px', className = '', borderRadius = '8px' }) => (
  <div
    className={`skeleton-loader ${className}`}
    style={{
      width,
      height,
      borderRadius,
    }}
  />
);

export default Skeleton;
