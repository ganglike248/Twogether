// src/components/Travel/TravelChecklistTab.jsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useTravelChecklist } from '../../hooks/useTravelChecklist';
import {
  createChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  calculateProgress,
} from '../../services/travelChecklistService';
import ChecklistItem from './ChecklistItem';
import ChecklistModal from './ChecklistModal';
import { MdCheckCircle } from 'react-icons/md';
import { toast } from 'react-toastify';
import './TravelChecklistTab.css';

const TravelChecklistTab = ({ trip }) => {
  const { user } = useAuthContext();
  const { checklist, loading } = useTravelChecklist(trip.id);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // 처음 로드 시 체크리스트 생성
  useEffect(() => {
    const initChecklist = async () => {
      if (loading) return;
      if (checklist) {
        setInitialized(true);
        return;
      }

      // 체크리스트가 없으면 생성
      try {
        await createChecklist(trip.id, trip.coupleId);
        setInitialized(true);
      } catch (error) {
        console.error('Error creating checklist:', error);
        toast.error('체크리스트 생성 중 오류가 발생했습니다.');
      }
    };

    initChecklist();
  }, [loading, checklist, trip.id, trip.coupleId]);

  const handleAddItem = async (itemData) => {
    try {
      if (itemData.itemId) {
        // 수정 모드
        await updateChecklistItem(trip.id, itemData.itemId, itemData);
        toast.success('항목이 수정되었습니다.');
      } else {
        // 추가 모드
        await addChecklistItem(trip.id, itemData);
        toast.success('항목이 추가되었습니다.');
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('항목 저장 중 오류가 발생했습니다.');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleToggle = async (itemId) => {
    try {
      await toggleChecklistItem(trip.id, itemId, user?.uid);
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    try {
      await deleteChecklistItem(trip.id, itemId);
      toast.success('항목이 삭제되었습니다.');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('항목 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading || !initialized) {
    return (
      <div className="tct-loading">
        <div className="tct-spinner" />
        <p>로딩 중...</p>
      </div>
    );
  }

  const items = checklist?.items || [];
  const progress = calculateProgress(items);
  const completedCount = items.filter(item => item.completed).length;

  return (
    <div className="travel-checklist-tab">
      {/* 진행률 */}
      <div className="tct-progress-section">
        <div className="tct-progress-header">
          <span className="tct-progress-label">준비 진행도</span>
          <span className="tct-progress-percent">{progress}%</span>
        </div>
        <div className="tct-progress-bar">
          <div
            className="tct-progress-fill"
            style={{
              width: `${progress}%`,
              background: progress === 100
                ? 'linear-gradient(90deg, #4caf50, #45a049)'
                : 'linear-gradient(90deg, #ffb6c1, #ff9bac)',
            }}
          />
        </div>
        <div className="tct-progress-text">
          <span>{completedCount} / {items.length}개 완료</span>
        </div>
      </div>

      {/* 버튼 */}
      <div className="tct-actions">
        <button className="tct-add-btn" onClick={() => setShowModal(true)}>
          + 항목 추가
        </button>
      </div>

      {/* 항목 리스트 */}
      {items.length === 0 ? (
        <div className="tct-empty">
          <div className="tct-empty-icon">
            <MdCheckCircle size={40} />
          </div>
          <p className="tct-empty-title">모든 준비가 완료되었습니다!</p>
          <p className="tct-empty-text">필요한 항목을 추가해보세요.</p>
        </div>
      ) : (
        <div className="tct-items-list">
          {items.map(item => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggle={() => handleToggle(item.id)}
              onEdit={handleEditItem}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* 모달 */}
      {showModal && (
        <ChecklistModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={handleAddItem}
          editingItem={editingItem}
        />
      )}
    </div>
  );
};

export default TravelChecklistTab;
