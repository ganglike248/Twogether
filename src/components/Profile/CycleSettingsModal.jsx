// src/components/Profile/CycleSettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import './CycleSettingsModal.css';

export const CYCLE_COLOR_PALETTE = [
  { label: '핑크',     value: '#ffd6e0', text: '#b5445a' },
  { label: '붉은 핑크', value: '#ffc0c0', text: '#993030' },
  { label: '라벤더',   value: '#e8d5f5', text: '#6a30a0' },
  { label: '민트',     value: '#c8f5e8', text: '#1f7555' },
  { label: '피치',     value: '#ffd9b3', text: '#a05010' },
  { label: '연노랑',   value: '#fff3b0', text: '#7a6010' },
];

export const CYCLE_ICON_OPTIONS = ['🩸', '💧', '🌸', '🌷'];

const DEFAULT_SETTINGS = {
  enabled: false,
  cycleLength: 28,
  periodLength: 5,
  icon: '🌸',
  label: '생리',
  color: '#ffd6e0',
  showFertile: false,
  showOvulation: false,
};

const CycleSettingsModal = ({ isOpen, onClose }) => {
  const { coupleDoc, coupleId } = useAuthContext();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (coupleDoc?.cycleSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...coupleDoc.cycleSettings });
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [coupleDoc, isOpen]);

  if (!isOpen) return null;

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'couples', coupleId), {
        cycleSettings: {
          ...settings,
          cycleLength: Number(settings.cycleLength) || 28,
          periodLength: Number(settings.periodLength) || 5,
        },
      });
      onClose();
    } catch (err) {
      console.error('[CycleSettingsModal] 저장 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm-container" onClick={e => e.stopPropagation()}>

        <div className="csm-header">
          <h2 className="csm-title">생리주기 설정</h2>
          <button className="csm-close" onClick={onClose}>×</button>
        </div>

        <div className="csm-content">

          {/* 켜기/끄기 */}
          <div className="csm-section">
            <div className="csm-toggle-row">
              <div className="csm-toggle-info">
                <div className="csm-toggle-title">생리주기 사용</div>
                <div className="csm-toggle-desc">켜면 캘린더에 생리 기록 기능이 활성화됩니다</div>
              </div>
              <label className="csm-toggle">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => update('enabled', e.target.checked)}
                />
                <span className="csm-toggle-slider" />
              </label>
            </div>
          </div>

          {settings.enabled && (
            <>
              {/* 주기 설정 */}
              <div className="csm-section">
                <div className="csm-section-title">주기 설정</div>
                <div className="csm-two-col">
                  <div className="csm-field">
                    <label className="csm-label">평균 주기</label>
                    <div className="csm-number-input">
                      <input
                        type="number"
                        value={settings.cycleLength}
                        onChange={e => update('cycleLength', e.target.value)}
                        min={14}
                        max={45}
                      />
                      <span className="csm-unit">일</span>
                    </div>
                    <span className="csm-hint">보통 21~35일</span>
                  </div>
                  <div className="csm-field">
                    <label className="csm-label">기본 기간</label>
                    <div className="csm-number-input">
                      <input
                        type="number"
                        value={settings.periodLength}
                        onChange={e => update('periodLength', e.target.value)}
                        min={2}
                        max={10}
                      />
                      <span className="csm-unit">일</span>
                    </div>
                    <span className="csm-hint">보통 3~7일</span>
                  </div>
                </div>
              </div>

              {/* 표시 설정 */}
              <div className="csm-section">
                <div className="csm-section-title">캘린더 표시 설정</div>

                <div className="csm-field">
                  <label className="csm-label">아이콘</label>
                  <input
                    type="text"
                    className="csm-text-input"
                    value={settings.icon}
                    onChange={e => update('icon', e.target.value)}
                    placeholder="🌸"
                    maxLength={2}
                  />
                </div>

                <div className="csm-field">
                  <label className="csm-label">배경색</label>
                  <div className="csm-color-palette">
                    {CYCLE_COLOR_PALETTE.map(({ label, value }) => (
                      <button
                        key={value}
                        type="button"
                        className={`csm-color-btn${settings.color === value ? ' selected' : ''}`}
                        style={{ backgroundColor: value }}
                        onClick={() => update('color', value)}
                        title={label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 추가 표시 */}
              <div className="csm-section">
                <div className="csm-section-title">추가 표시</div>

                <div className="csm-toggle-row">
                  <div className="csm-toggle-info">
                    <div className="csm-toggle-title">가임기 표시</div>
                    <div className="csm-toggle-desc">가장 최근 생리 기준 가임기를 캘린더에 표시합니다</div>
                  </div>
                  <label className="csm-toggle">
                    <input
                      type="checkbox"
                      checked={settings.showFertile}
                      onChange={e => update('showFertile', e.target.checked)}
                    />
                    <span className="csm-toggle-slider" />
                  </label>
                </div>

                <div className="csm-toggle-row csm-toggle-row--bordered">
                  <div className="csm-toggle-info">
                    <div className="csm-toggle-title">배란일 표시</div>
                    <div className="csm-toggle-desc">가장 최근 생리 기준 배란일을 캘린더에 표시합니다</div>
                  </div>
                  <label className="csm-toggle">
                    <input
                      type="checkbox"
                      checked={settings.showOvulation}
                      onChange={e => update('showOvulation', e.target.checked)}
                    />
                    <span className="csm-toggle-slider" />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="csm-footer">
          <button type="button" className="csm-btn-cancel" onClick={onClose}>취소</button>
          <button type="button" className="csm-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CycleSettingsModal;
