import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { MdClose, MdAdd } from 'react-icons/md';
import { getCategoryColor, getCategoryDisplayName, DEFAULT_CATEGORIES } from '../../services/categoryColorService';
import './WheelModal.css';

const WheelModal = ({ isOpen, onClose, bucketList, customCategories }) => {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'bucket'
  const [directItems, setDirectItems] = useState([]);
  const [directInput, setDirectInput] = useState('');
  const [selectedBucketItems, setSelectedBucketItems] = useState([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [slotOffset, setSlotOffset] = useState(0);
  // 탭별로 필터 상태 독립 관리
  const [tabFilters, setTabFilters] = useState({
    direct: { category: 'all', completed: false },
    bucket: { category: 'all', completed: false }
  });

  // 현재 탭의 필터 상태
  const currentFilter = tabFilters[activeTab];

  // 완료 상태별 필터링된 버킷 아이템
  const statusFilteredBucketList = currentFilter.completed
    ? bucketList.filter(item => item.completed)
    : bucketList.filter(item => !item.completed);

  // 유효한 카테고리만 필터링 (삭제된 카테고리 제외)
  const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
  const isValidCategory = (category) => {
    if (category === 'all') return true;
    return Object.keys(allCategories).includes(category);
  };

  const filteredBucketItems = currentFilter.category === 'all'
    ? statusFilteredBucketList
    : statusFilteredBucketList.filter(
        item => isValidCategory(item.category) && item.category === currentFilter.category
      );

  // 현재 탭의 아이템들
  const currentItems = activeTab === 'direct' ? directItems : selectedBucketItems;

  // 탭 전환 시 슬롯 초기화 (필터는 유지)
  useEffect(() => {
    setSlotOffset(0);
    setSpinResult(null);
  }, [activeTab]);

  // 카테고리 필터 변경 시 선택 항목 동기화 (필터 범위 밖의 항목 제거)
  useEffect(() => {
    const validIds = new Set(filteredBucketItems.map(item => item.id));
    setSelectedBucketItems(prev => prev.filter(item => validIds.has(item.id)));
  }, [filteredBucketItems]);

  // 결과 표시 후 3초 자동 초기화 (명확한 상태 관리)
  useEffect(() => {
    if (spinResult && !isSpinning) {
      const timer = setTimeout(() => {
        // 모든 상태를 순차적으로 초기화
        setSpinResult(null);
        setSlotOffset(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [spinResult, isSpinning]);

  // 탭 전환 시 슬롯 초기화 (activeTab이 변경될 때만)
  useEffect(() => {
    // activeTab 변경되었으므로 슬롯 완전히 초기화
    setSlotOffset(0);
    setSpinResult(null);
  }, [activeTab]);


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

  const handleSelectAllBucketItems = () => {
    setSelectedBucketItems(filteredBucketItems);
    toast.success(`${filteredBucketItems.length}개 항목을 선택했습니다`);
  };

  const handleClearBucketItems = () => {
    setSelectedBucketItems([]);
    toast.info('선택이 취소되었습니다');
  };

  const handleSpin = () => {
    if (!currentItems || currentItems.length === 0) {
      toast.warning('선택할 항목이 없습니다');
      return;
    }

    if (isSpinning) return;

    try {
      // 무작위 결과 항목 선택 (안전한 범위 체크)
      const safeLength = Math.max(1, currentItems.length);
      const resultIndex = Math.floor(Math.random() * safeLength);
      const selectedItem = currentItems[resultIndex];

      if (!selectedItem) {
        toast.error('항목 선택 중 오류가 발생했습니다');
        return;
      }

      // 슬롯머신 정확한 계산
      const itemHeight = 60;
      const itemCount = safeLength;
      const containerHeight = 180;
      const pointerCenter = containerHeight / 2;
      const itemCenter = itemHeight / 2;
      const targetTop = pointerCenter - itemCenter;

      const minSpins = 3;
      const extraSpins = Math.floor(Math.random() * 2);
      const totalSpins = minSpins + extraSpins;

      const finalOffset = (totalSpins * itemCount + resultIndex) * itemHeight - targetTop;

      // 1️⃣ 이전 상태 완전히 초기화
      setSpinResult(null);
      setSlotOffset(0);

      // 2️⃣ 다음 프레임에서 회전 시작 (상태 업데이트 완료 보장)
      requestAnimationFrame(() => {
        setIsSpinning(true);

        // 3️⃣ 또 다음 프레임에서 슬롯 오프셋 설정
        requestAnimationFrame(() => {
          setSlotOffset(finalOffset);
        });
      });

      // 애니메이션 완료 후 결과 표시 (2.5초)
      const spinTimeout = setTimeout(() => {
        setSpinResult(selectedItem);
        setIsSpinning(false);
      }, 2500);

      return () => clearTimeout(spinTimeout);
    } catch (error) {
      console.error('슬롯 회전 중 오류:', error);
      toast.error('슬롯 회전 중 오류가 발생했습니다');
      setIsSpinning(false);
    }
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
                  disabled={isSpinning}
                />
                <button
                  className="wheel-add-btn"
                  onClick={handleAddDirectItem}
                  disabled={isSpinning}
                >
                  <MdAdd />
                </button>
              </div>

              {directItems.length > 0 ? (
                <div className="wheel-items-list">
                  {directItems.map((item) => (
                    <div key={item.id} className="wheel-item">
                      <span>{item.title}</span>
                      <button
                        className="wheel-item-remove"
                        onClick={() => handleRemoveDirectItem(item.id)}
                        disabled={isSpinning}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wheel-empty-state">
                  <p>추가된 항목이 없습니다</p>
                </div>
              )}
            </div>
          )}

          {/* 버킷리스트 선택 탭 */}
          {activeTab === 'bucket' && (
            <div className="wheel-tab-content">
              {/* 완료/미완료 필터 */}
              <div className="wheel-status-filter">
                <button
                  className={`wheel-status-btn ${!currentFilter.completed ? 'active' : ''}`}
                  onClick={() => setTabFilters(prev => ({ ...prev, bucket: { ...prev.bucket, completed: false } }))}
                  disabled={isSpinning}
                >
                  미완료
                </button>
                <button
                  className={`wheel-status-btn ${currentFilter.completed ? 'active' : ''}`}
                  onClick={() => setTabFilters(prev => ({ ...prev, bucket: { ...prev.bucket, completed: true } }))}
                  disabled={isSpinning}
                >
                  완료
                </button>
              </div>

              {/* 카테고리 필터 (탭 형식) */}
              <div className="wheel-category-tabs">
                <button
                  className={`wheel-category-tab ${currentFilter.category === 'all' ? 'active' : ''}`}
                  onClick={() => setTabFilters(prev => ({ ...prev, bucket: { ...prev.bucket, category: 'all' } }))}
                  disabled={isSpinning}
                  style={{ backgroundColor: currentFilter.category === 'all' ? '#FFD700' : '#f0f0f0' }}
                >
                  전체
                </button>
                {Array.from(new Set(statusFilteredBucketList.map(item => item.category))).filter(isValidCategory).sort().map(cat => {
                  const color = getCategoryColor(cat, customCategories);
                  return (
                    <button
                      key={cat}
                      className={`wheel-category-tab ${currentFilter.category === cat ? 'active' : ''}`}
                      onClick={() => setTabFilters(prev => ({ ...prev, bucket: { ...prev.bucket, category: cat } }))}
                      disabled={isSpinning}
                      style={{
                        backgroundColor: currentFilter.category === cat ? color : '#f0f0f0',
                        color: currentFilter.category === cat ? '#fff' : '#333'
                      }}
                    >
                      {getCategoryDisplayName(cat, customCategories)}
                    </button>
                  );
                })}
              </div>

              {/* 선택 버튼 */}
              <div className="wheel-selection-controls">
                <button
                  className="wheel-select-all-btn"
                  onClick={handleSelectAllBucketItems}
                  disabled={isSpinning || filteredBucketItems.length === 0}
                >
                  전체 선택 ({filteredBucketItems.length})
                </button>
                {selectedBucketItems.length > 0 && (
                  <button
                    className="wheel-clear-selection-btn"
                    onClick={handleClearBucketItems}
                    disabled={isSpinning}
                  >
                    선택 취소 ({selectedBucketItems.length}개 선택)
                  </button>
                )}
              </div>

              {/* 버킷리스트 항목 (선택 가능) */}
              {filteredBucketItems.length > 0 && (
                <div className="wheel-items-list">
                  {filteredBucketItems.map((item) => {
                    const isSelected = selectedBucketItems.some(selected => selected.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`wheel-item wheel-bucket-item ${isSelected ? 'selected' : ''} ${isSpinning ? 'disabled' : ''}`}
                        onClick={() => !isSpinning && handleToggleBucketItem(item)}
                        style={{
                          backgroundColor: isSelected ? getCategoryColor(item.category, customCategories) : '#f5f5f5',
                          color: isSelected ? '#fff' : '#333',
                          cursor: isSpinning ? 'not-allowed' : 'pointer',
                          opacity: isSpinning ? 0.6 : 1
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

        {/* 선택 정보 */}
        <div className="slot-selection-info">
          <span className="slot-info-label">
            {activeTab === 'direct' ? `추가된 항목: ${directItems.length}개` : `선택된 항목: ${selectedBucketItems.length}개`}
          </span>
        </div>

        {/* 슬롯머신 섹션 */}
        <div className="slot-machine-section">
          <div className="slot-machine-wrapper">
            {/* 좌측 화살표 */}
            <div className="slot-arrow" />

            <div className="slot-machine-container">
            {currentItems.length > 0 ? (
              <motion.div
                className="slot-tape"
                style={{
                  height: currentItems.length * 5 * 60 + 'px'
                }}
                initial={{ y: 0 }}
                animate={{ y: -slotOffset }}
                transition={{
                  duration: isSpinning ? 2.5 : 0,
                  ease: isSpinning ? 'easeOut' : 'linear'
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
