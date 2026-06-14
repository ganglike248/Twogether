import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';
import { MdColorLens } from 'react-icons/md';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { DEFAULT_EVENT_TYPE_COLORS, DEFAULT_COLOR_PALETTE } from '../../services/colorService';
import './EventTypeColorSettingsModal.css';

const EventTypeColorSettingsModal = ({ isOpen, onClose }) => {
  const { user, userDoc, myRole } = useAuthContext();
  const [eventTypeColors, setEventTypeColors] = useState({ ...DEFAULT_EVENT_TYPE_COLORS });
  const [customColors, setCustomColors] = useState({});
  const [selectedSource, setSelectedSource] = useState({}); // 'palette' | 'custom'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (userDoc?.eventTypeColors) {
      setEventTypeColors({ ...DEFAULT_EVENT_TYPE_COLORS, ...userDoc.eventTypeColors });
    } else {
      setEventTypeColors(DEFAULT_EVENT_TYPE_COLORS);
    }
    setCustomColors({});
    // 기본 상태: 팔레트에 포커스
    const initialSource = {};
    if (myRole) initialSource[myRole] = 'palette';
    initialSource['personal'] = 'palette';
    setSelectedSource(initialSource);
  }, [userDoc, isOpen, myRole]);

  if (!isOpen) return null;

  const handleColorSelect = (key, color) => {
    setEventTypeColors({ ...eventTypeColors, [key]: color });
    setSelectedSource({ ...selectedSource, [key]: 'palette' });
    // 커스텀 입력 제거
    const newCustom = { ...customColors };
    delete newCustom[key];
    setCustomColors(newCustom);
  };

  const handleCustomColorChange = (key, color) => {
    setCustomColors({ ...customColors, [key]: color });
    setEventTypeColors({ ...eventTypeColors, [key]: color });
    setSelectedSource({ ...selectedSource, [key]: 'custom' });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { eventTypeColors });
      toast.success('색상 설정이 저장되었습니다!');
      onClose();
    } catch (error) {
      console.error('Error saving event color settings:', error);
      toast.error(`저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const ColorSection = ({ label, colorKey }) => {
    const isCustomSelected = selectedSource[colorKey] === 'custom';
    const isPaletteSelected = selectedSource[colorKey] === 'palette';
    const colorInputRef = useRef(null);

    return (
      <div className="csm-section">
        <div className="csm-label">{label}</div>

        <div className="color-section-layout">
          {/* 현재 색상 (왼쪽) */}
          <div className="current-color-display">
            <div
              className="current-color-box"
              style={{ backgroundColor: eventTypeColors[colorKey] || '#ffffff' }}
            />
            <div className="current-color-text">
              {eventTypeColors[colorKey] || '#FFFFFF'}
            </div>
          </div>

          {/* 프리셋 색상 (오른쪽) */}
          <div className={`preset-colors${isCustomSelected ? ' disabled' : ''}`} onClick={() => isCustomSelected && handleColorSelect(colorKey, eventTypeColors[colorKey])}>
            {DEFAULT_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                className={`csm-color-btn${eventTypeColors[colorKey] === color && isPaletteSelected ? ' selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorSelect(colorKey, color);
                }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* 커스텀 컬러 섹션 */}
        <div
          className={`csm-custom-section${isPaletteSelected ? ' disabled' : ''}`}
          onClick={() => isPaletteSelected && handleCustomColorChange(colorKey, eventTypeColors[colorKey])}
        >
          <div className="csm-custom-label">색상 직접 선택</div>
          <div className="csm-custom-color">
            {/* 숨겨진 color input */}
            <input
              ref={colorInputRef}
              type="color"
              value={customColors[colorKey] || eventTypeColors[colorKey] || '#ffffff'}
              onChange={(e) => handleCustomColorChange(colorKey, e.target.value)}
              className="csm-color-input-hidden"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 팔레트 아이콘 버튼 */}
            <button
              className="csm-color-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                colorInputRef.current?.click();
              }}
              title="색상 선택"
              style={{
                color: eventTypeColors[colorKey] || '#ffffff',
                borderColor: eventTypeColors[colorKey] || '#cccccc'
              }}
            >
              <MdColorLens size={28} />
            </button>

            {/* 텍스트 입력 */}
            <input
              type="text"
              value={customColors[colorKey] || eventTypeColors[colorKey] || '#ffffff'}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                let formatted = value.startsWith('#') ? value : '#' + value;
                formatted = formatted.slice(0, 7);

                if (/^#[0-9A-F]{6}$/i.test(formatted)) {
                  handleCustomColorChange(colorKey, formatted);
                }
                e.target.value = formatted;
              }}
              className="csm-color-text"
              placeholder="#000000"
              onClick={(e) => e.stopPropagation()}
              maxLength="7"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="csm-overlay">
      <div className="csm-container">
        <div className="csm-header">
          <h2 className="csm-title">이벤트 색상 설정</h2>
          <button className="csm-close" onClick={onClose}>×</button>
        </div>

        <div className="csm-content">
          {myRole && (
            <ColorSection
              label={`내 일정 색상`}
              colorKey={myRole}
            />
          )}

          <ColorSection
            label="개인 일정 색상"
            colorKey="personal"
          />
        </div>

        <div className="csm-footer">
          <button
            type="button"
            onClick={onClose}
            className="csm-btn-cancel"
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="csm-btn-save"
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventTypeColorSettingsModal;
