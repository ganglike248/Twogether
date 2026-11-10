// src/components/common/MenuPage.jsx
// 메뉴 화면(프로필·커플 정보·설정과 그 하위 화면) 공통 머리말. 설정 화면 디자인(v1.0.26)을 기준으로 통일 —
// 화면 루트에 `menu-page` 클래스를 같이 달면 MenuPage.css가 카드·섹션 제목·여백을 맞춰줌.
import React from 'react';
import { HiArrowLeft } from 'react-icons/hi2';
import './MenuPage.css';

export const MenuPageHeader = ({ title, onBack, backLabel = '뒤로' }) => (
  <div className="menu-header">
    {onBack && (
      <button type="button" className="menu-back-btn" onClick={onBack} aria-label={backLabel}>
        <HiArrowLeft />
      </button>
    )}
    <h1 className="menu-title">{title}</h1>
  </div>
);

export default MenuPageHeader;
