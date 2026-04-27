import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { MdClose, MdAdd } from 'react-icons/md';
import './WheelModal.css';

const WheelModal = ({ isOpen, onClose, bucketList, customCategories }) => {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'bucket'
  const [directItems, setDirectItems] = useState([]);
  const [directInput, setDirectInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef(null);

  // 카테고리별 필터링된 버킷 아이템
  const filteredBucketItems = selectedCategory === 'all'
    ? bucketList
    : bucketList.filter(item => item.category === selectedCategory);

  // 현재 탭의 아이템들
  const currentItems = activeTab === 'direct' ? directItems : filteredBucketItems;

  const getCategoryColor = (category) => {
    const colors = {
      food: '#FF6B9D',
      travel: '#FFA502',
      culture: '#613D9E',
      hobby: '#FF006E',
      sport: '#00B4D8',
      learning: '#90E0EF',
      shopping: '#FFB703',
      other: '#999999'
    };
    return colors[category] || '#999999';
  };

  const handleAddDirectItem = () => {
    if (!directInput.trim()) {
      toast.warning('내용을 입력해주세요');
      return;
    }
    const newItem = {
      id: `local_${Date.now()}`,
      title: directInput.trim(),
      isLocal: true
    };
    setDirectItems([...directItems, newItem]);
    setDirectInput('');
    toast.success('항목이 추가되었습니다');
  };

  const handleRemoveDirectItem = (id) => {
    setDirectItems(directItems.filter(item => item.id !== id));
  };

  const handleSpin = () => {
    if (currentItems.length === 0) {
      toast.warning('선택할 항목이 없습니다');
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    setSpinResult(null);

    // 최소 5 바퀴 + 무작위 회전
    const minRotation = 5 * 360;
    const randomRotation = Math.random() * 360;
    const totalRotation = minRotation + randomRotation;
    const newRotation = rotation + totalRotation;

    // 결과 항목 결정
    const itemsPerSlot = 360 / currentItems.length;
    const resultIndex = Math.floor((360 - (totalRotation % 360)) / itemsPerSlot) % currentItems.length;
    const selectedItem = currentItems[resultIndex];

    setRotation(newRotation);

    // 애니메이션 완료 후 결과 표시
    setTimeout(() => {
      setSpinResult(selectedItem);
      setIsSpinning(false);
    }, 2500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddDirectItem();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wheel-modal-overlay" onClick={onClose}>
      <div className="wheel-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="wheel-modal-header">
          <h2>돌림판</h2>
          <button className="wheel-modal-close" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        {/* 탭 */}
        <div className="wheel-modal-tabs">
          <button
            className={`wheel-tab ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('direct');
              setSpinResult(null);
            }}
          >
            직접 추가
          </button>
          <button
            className={`wheel-tab ${activeTab === 'bucket' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('bucket');
              setSpinResult(null);
            }}
          >
            버킷리스트 선택
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="wheel-modal-body">
          {/* 직접 추가 탭 */}
          {activeTab === 'direct' && (
            <div className="wheel-tab-content">
              <div className="wheel-input-group">
                <input
                  type="text"
                  placeholder="항목을 입력하세요"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="wheel-input"
                />
                <button className="wheel-add-btn" onClick={handleAddDirectItem}>
                  <MdAdd />
                </button>
              </div>

              {directItems.length > 0 && (
                <div className="wheel-items-list">
                  {directItems.map((item) => (
                    <div key={item.id} className="wheel-item">
                      <span>{item.title}</span>
                      <button
                        className="wheel-item-remove"
                        onClick={() => handleRemoveDirectItem(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 버킷리스트 선택 탭 */}
          {activeTab === 'bucket' && (
            <div className="wheel-tab-content">
              <div className="wheel-category-filter">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="wheel-category-select"
                >
                  <option value="all">전체 카테고리</option>
                  {Array.from(new Set(bucketList.map(item => item.category))).sort().map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {filteredBucketItems.length > 0 && (
                <div className="wheel-items-list">
                  {filteredBucketItems.map((item) => (
                    <div
                      key={item.id}
                      className="wheel-item"
                      style={{
                        borderLeftColor: getCategoryColor(item.category),
                        borderLeftWidth: '4px'
                      }}
                    >
                      <span>{item.title}</span>
                      <span className="wheel-item-category">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {filteredBucketItems.length === 0 && (
                <div className="wheel-empty-state">
                  <p>선택할 항목이 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 돌림판 섹션 */}
        <div className="wheel-spinner-section">
          <div className="wheel-container">
            <motion.div
              ref={wheelRef}
              className="wheel"
              animate={{ rotate: rotation }}
              transition={{
                duration: 2.5,
                ease: 'easeOut'
              }}
            >
              {currentItems.length > 0 ? (
                currentItems.map((item, index) => {
                  const angle = (360 / currentItems.length) * index;
                  const isHighlighted = spinResult?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`wheel-segment ${isHighlighted ? 'highlighted' : ''}`}
                      style={{
                        transform: `rotate(${angle}deg)`,
                        backgroundColor: activeTab === 'bucket' ? getCategoryColor(item.category) : '#FF6B9D'
                      }}
                    >
                      <div className="wheel-segment-text">
                        {item.title}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="wheel-empty">
                  <span>항목 없음</span>
                </div>
              )}
            </motion.div>

            {/* 가운데 포인터 */}
            <div className="wheel-pointer" />
          </div>

          {/* 스핀 버튼 */}
          <button
            className={`wheel-spin-btn ${isSpinning ? 'spinning' : ''} ${currentItems.length === 0 ? 'disabled' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning || currentItems.length === 0}
          >
            {isSpinning ? '돌리는 중...' : '돌리기'}
          </button>

          {/* 결과 표시 */}
          {spinResult && (
            <motion.div
              className="wheel-result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="result-label">선택된 항목</div>
              <div
                className="result-item"
                style={{
                  backgroundColor: activeTab === 'bucket' ? getCategoryColor(spinResult.category) : '#FF6B9D',
                  color: '#fff'
                }}
              >
                {spinResult.title}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WheelModal;
