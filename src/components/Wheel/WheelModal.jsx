import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { MdClose, MdAdd } from 'react-icons/md';
import { getCategoryColor, getCategoryDisplayName } from '../../services/categoryColorService';
import './WheelModal.css';

const WheelModal = ({ isOpen, onClose, bucketList, customCategories }) => {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'bucket'
  const [directItems, setDirectItems] = useState([]);
  const [directInput, setDirectInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBucketItems, setSelectedBucketItems] = useState([]); // 선택된 버킷리스트 아이템
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [slotOffset, setSlotOffset] = useState(0);
  const slotRef = useRef(null);

  // 카테고리별 필터링된 버킷 아이템
  const filteredBucketItems = selectedCategory === 'all'
    ? bucketList
    : bucketList.filter(item => item.category === selectedCategory);

  // 현재 탭의 아이템들
  const currentItems = activeTab === 'direct' ? directItems : selectedBucketItems;

  // 탭 전환 시 슬롯 초기화
  useEffect(() => {
    setSlotOffset(0);
    setSpinResult(null);
  }, [activeTab]);

  // currentItems 변경 시 슬롯 초기화
  useEffect(() => {
    if (!isSpinning) {
      setSlotOffset(0);
      setSpinResult(null);
    }
  }, [currentItems.length, isSpinning]);


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

  const handleToggleBucketItem = (item) => {
    const isSelected = selectedBucketItems.some(selectedItem => selectedItem.id === item.id);
    if (isSelected) {
      setSelectedBucketItems(selectedBucketItems.filter(selectedItem => selectedItem.id !== item.id));
    } else {
      setSelectedBucketItems([...selectedBucketItems, item]);
    }
  };

  const handleRemoveBucketItem = (id) => {
    setSelectedBucketItems(selectedBucketItems.filter(item => item.id !== id));
  };

  const handleSpin = () => {
    if (currentItems.length === 0) {
      toast.warning('선택할 항목이 없습니다');
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    setSpinResult(null);

    // 무작위 결과 항목 선택
    const resultIndex = Math.floor(Math.random() * currentItems.length);
    const selectedItem = currentItems[resultIndex];

    // 최소 3바퀴 + 결과 위치까지 스크롤
    const itemHeight = 60; // CSS와 동일하게 설정
    const rotations = 3;
    // 초기 오프셋(한 세트) + 회전(3바퀴) + 결과 위치
    const totalItemCount = currentItems.length + (rotations * currentItems.length) + resultIndex;
    const finalOffset = totalItemCount * itemHeight;

    setSlotOffset(finalOffset);

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
              setSelectedBucketItems(bucketList); // 모든 버킷리스트 아이템 선택
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
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    setSelectedCategory(newCategory);
                    // 선택한 카테고리의 모든 아이템을 기본으로 선택
                    if (newCategory === 'all') {
                      setSelectedBucketItems(bucketList);
                    } else {
                      setSelectedBucketItems(bucketList.filter(item => item.category === newCategory));
                    }
                  }}
                  className="wheel-category-select"
                >
                  <option value="all">전체 카테고리</option>
                  {Array.from(new Set(bucketList.map(item => item.category))).sort().map(cat => (
                    <option key={cat} value={cat}>
                      {getCategoryDisplayName(cat, customCategories)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 버킷리스트 항목 (선택 가능) */}
              {filteredBucketItems.length > 0 && (
                <div className="wheel-items-list">
                  {filteredBucketItems.map((item) => {
                    const isSelected = selectedBucketItems.some(selected => selected.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`wheel-item wheel-bucket-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleBucketItem(item)}
                        style={{
                          backgroundColor: isSelected ? getCategoryColor(item.category, customCategories) : '#f5f5f5',
                          color: isSelected ? '#fff' : '#333',
                          cursor: 'pointer'
                        }}
                      >
                        <span className="wheel-item-title">{item.title}</span>
                        {isSelected && (
                          <button
                            className="wheel-item-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBucketItem(item.id);
                            }}
                            style={{ color: isSelected ? '#fff' : '#999' }}
                          >
                            ✕
                          </button>
                        )}
                        <span
                          className="wheel-item-category"
                          style={{
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
                            color: isSelected ? '#fff' : '#666'
                          }}
                        >
                          {getCategoryDisplayName(item.category, customCategories)}
                        </span>
                      </div>
                    );
                  })}
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

        {/* 슬롯머신 섹션 */}
        <div className="slot-machine-section">
          <div className="slot-machine-container">
            {currentItems.length > 0 ? (
              <motion.div
                ref={slotRef}
                className="slot-tape"
                initial={{ y: -currentItems.length * 60 }}
                animate={{ y: -slotOffset }}
                transition={{
                  duration: slotOffset === 0 ? 0 : 2.5,
                  ease: 'easeOut'
                }}
              >
                {/* 5번 반복해서 무한 루프 효과 */}
                {[...Array(5)].map((_, cycle) =>
                  currentItems.map((item, idx) => (
                    <div
                      key={`${cycle}-${item.id}`}
                      className="slot-item"
                      style={{
                        backgroundColor: activeTab === 'bucket' ? getCategoryColor(item.category, customCategories) : '#FF6B9D',
                        color: '#fff'
                      }}
                    >
                      <span className="slot-item-text">{item.title}</span>
                      {activeTab === 'bucket' && (
                        <span className="slot-item-category">
                          {getCategoryDisplayName(item.category, customCategories)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <div className="slot-tape">
                <div className="slot-item" style={{ backgroundColor: '#f5f5f5', color: '#999' }}>
                  항목이 없습니다
                </div>
              </div>
            )}
            {/* 선택 표시 포인터 */}
            <div className="slot-pointer" />
          </div>

          {/* 스핀 버튼 */}
          <button
            className={`slot-spin-btn ${isSpinning ? 'spinning' : ''} ${currentItems.length === 0 ? 'disabled' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning || currentItems.length === 0}
          >
            {isSpinning ? '돌리는 중...' : '돌리기'}
          </button>

          {/* 결과 표시 */}
          {spinResult && (
            <motion.div
              className="slot-result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="result-label">🎉 선택된 항목</div>
              <div
                className="result-item"
                style={{
                  backgroundColor: activeTab === 'bucket' ? getCategoryColor(spinResult.category, customCategories) : '#FF6B9D',
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
