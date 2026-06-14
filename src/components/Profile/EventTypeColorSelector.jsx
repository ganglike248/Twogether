import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_COLOR_PALETTE, getContrastColor } from '../../services/colorService';
import './EventTypeColorSelector.css';

const EventTypeColorSelector = ({ label, currentColor, onChange }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor || '#ffffff');
  const previewRef = useRef(null);
  const pickerRef = useRef(null);

  // 클릭 외부 닫기
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target) && previewRef.current && !previewRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const handlePaletteSelect = (color) => {
    onChange(color);
    setShowColorPicker(false);
  };

  const handleCustomColorChange = (e) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  const textColor = getContrastColor(currentColor);

  return (
    <div className="event-type-color-selector">
      <label className="color-selector-label">{label}</label>

      <div className="color-selector-wrapper">
        {/* 현재 색상 미리보기 */}
        <div
          ref={previewRef}
          className="color-preview"
          style={{
            backgroundColor: currentColor || '#ffffff',
            borderColor: currentColor || '#cccccc',
          }}
          onClick={() => setShowColorPicker(!showColorPicker)}
        >
          <span
            className="color-preview-text"
            style={{ color: textColor }}
          >
            {currentColor}
          </span>
        </div>

        {/* 색상 선택 토글 */}
        {showColorPicker && (
          <div ref={pickerRef} className="color-picker-container">
            {/* 기본 팔레트 */}
            <div className="color-palette">
              {DEFAULT_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-palette-item${currentColor === color ? ' active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handlePaletteSelect(color)}
                  title={color}
                />
              ))}
            </div>

            {/* 커스텀 컬러 피커 */}
            <div className="color-custom-picker">
              <label className="color-custom-label">커스텀 색상</label>
              <div className="color-custom-input-wrapper">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="color-custom-input"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                      setCustomColor(val);
                      onChange(val);
                    }
                  }}
                  placeholder="#000000"
                  className="color-custom-text"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventTypeColorSelector;
