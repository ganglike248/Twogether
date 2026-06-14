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
  const [selectedKey, setSelectedKey] = useState(myRole || 'personal');
  const [customInput, setCustomInput] = useState('');
  const [saving, setSaving] = useState(false);
  const colorInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setEventTypeColors(
      userDoc?.eventTypeColors
        ? { ...DEFAULT_EVENT_TYPE_COLORS, ...userDoc.eventTypeColors }
        : { ...DEFAULT_EVENT_TYPE_COLORS }
    );
    setSelectedKey(myRole || 'personal');
    setCustomInput('');
  }, [userDoc, isOpen, myRole]);

  if (!isOpen) return null;

  const currentColor = eventTypeColors[selectedKey] || '#ffffff';

  const typeOptions = [
    ...(myRole ? [{ key: myRole, label: '내 일정' }] : []),
    { key: 'personal', label: '개인 일정' },
  ];

  const handleTabChange = (key) => {
    setSelectedKey(key);
    setCustomInput('');
  };

  const handleColorSelect = (color) => {
    setEventTypeColors({ ...eventTypeColors, [selectedKey]: color });
    setCustomInput('');
  };

  const handleCustomColorChange = (raw) => {
    let val = raw.toUpperCase();
    if (!val.startsWith('#')) val = '#' + val;
    val = val.slice(0, 7);
    setCustomInput(val);
    if (/^#[0-9A-F]{6}$/.test(val)) {
      setEventTypeColors({ ...eventTypeColors, [selectedKey]: val });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { eventTypeColors });
      toast.success('색상 설정이 저장되었습니다!');
      onClose();
    } catch (error) {
      toast.error(`저장 중 오류가 발생했습니다.\n${error?.message || String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="csm-overlay">
      <div className="csm-container">
        <div className="csm-header">
          <h2 className="csm-title">이벤트 색상 설정</h2>
          <button className="csm-close" onClick={onClose}>×</button>
        </div>

        <div className="csm-content">
          {/* 타입 선택 탭 */}
          <div className="csm-type-selector">
            {typeOptions.map(({ key, label }) => (
              <button
                key={key}
                className={`csm-type-btn${selectedKey === key ? ' active' : ''}`}
                style={selectedKey === key ? {
                  borderColor: eventTypeColors[key],
                  backgroundColor: `${eventTypeColors[key]}22`,
                } : {}}
                onClick={() => handleTabChange(key)}
              >
                <span
                  className="csm-type-dot"
                  style={{ backgroundColor: eventTypeColors[key] }}
                />
                {label}
              </button>
            ))}
          </div>

          {/* 현재 색상 미리보기 */}
          <div className="csm-preview-row">
            <div className="csm-preview-box" style={{ backgroundColor: currentColor }} />
            <span className="csm-preview-hex">{currentColor.toUpperCase()}</span>
          </div>

          {/* 팔레트 */}
          <div className="csm-palette">
            {DEFAULT_COLOR_PALETTE.map((color) => (
              <button
                key={color}
                className={`csm-color-btn${currentColor === color ? ' selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              />
            ))}
          </div>

          {/* 커스텀 색상 */}
          <div className="csm-custom-row">
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="csm-color-input-hidden"
            />
            <button
              className="csm-color-icon-btn"
              onClick={() => colorInputRef.current?.click()}
              style={{ color: currentColor, borderColor: currentColor }}
              title="색상 직접 선택"
            >
              <MdColorLens size={24} />
            </button>
            <input
              type="text"
              className="csm-color-text"
              value={customInput || currentColor}
              placeholder="#000000"
              maxLength="7"
              onChange={(e) => handleCustomColorChange(e.target.value)}
            />
            <span className="csm-custom-hint">직접 입력</span>
          </div>
        </div>

        <div className="csm-footer">
          <button type="button" onClick={onClose} className="csm-btn-cancel" disabled={saving}>
            취소
          </button>
          <button type="button" onClick={handleSave} className="csm-btn-save" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventTypeColorSettingsModal;
