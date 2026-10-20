// src/components/Travel/Checklist/TravelChecklistTab.jsx
// 여행 체크리스트 탭 — 진행률 링 카드 → 남은 준비(항목별 카드, 중요도순) → 준비 완료(한 카드, 접힘)
import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useTravelChecklist } from '../../../hooks/useTravelChecklist';
import {
  createChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  calculateProgress,
} from '../../../services/travelChecklistService';
import ChecklistItem, { CompletedChecklistRow } from './ChecklistItem';
import ProgressRing from './ProgressRing';
import { getMembers } from '../Decisions/optionScoreUtils';
import ChecklistModal from './ChecklistModal';
import ConfirmModal from '../../common/ConfirmModal';
import { MdChecklist } from 'react-icons/md';
import { toast } from 'react-toastify';
import './TravelChecklistTab.css';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const COMPLETED_PREVIEW = 2; // 준비 완료는 처음엔 2개만 보이고 "N개 더 보기"로 펼침

const TravelChecklistTab = forwardRef(({ trip }, ref) => {
  const { user, coupleDoc, getMemberName } = useAuthContext();
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const { checklist, loading } = useTravelChecklist(trip.id);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

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

  // FAB 메서드 노출
  useImperativeHandle(ref, () => ({
    showChecklistModal: () => {
      setEditingItem(null);
      setShowModal(true);
    }
  }), []);

  const handleDelete = (itemId) => {
    setItemToDelete(itemId);
  };

  const confirmDeleteItem = async () => {
    const itemId = itemToDelete;
    setItemToDelete(null);
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

  return (
    <div className="travel-checklist-tab">
      {items.length === 0 ? (
        <div className="tct-empty">
          <div className="tct-empty-icon"><MdChecklist /></div>
          <p className="tct-empty-title">아직 준비 항목이 없어요</p>
          <p className="tct-empty-text">＋ 버튼으로 챙길 것들을 추가해보세요.</p>
        </div>
      ) : (
        <ChecklistContent
          items={items}
          progress={progress}
          members={getMembers(coupleDoc, getMemberName)}
          showAllCompleted={showAllCompleted}
          onToggleShowAll={() => setShowAllCompleted(v => !v)}
          onToggle={handleToggle}
          onEdit={handleEditItem}
          onDelete={handleDelete}
        />
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

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="항목 삭제"
        message="이 항목을 삭제하시겠습니까?"
        confirmText="삭제"
        onConfirm={confirmDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
});

TravelChecklistTab.displayName = 'TravelChecklistTab';

const ChecklistContent = ({ items, progress, members, showAllCompleted, onToggleShowAll, onToggle, onEdit, onDelete }) => {
  const { remaining, completed } = useMemo(() => {
    const indexed = items.map((item, index) => ({ item, index }));
    return {
      // 남은 준비: 중요도 높은 순, 같으면 추가한 순서
      remaining: indexed
        .filter(({ item }) => !item.completed)
        .sort((a, b) =>
          (PRIORITY_ORDER[a.item.priority] ?? 1) - (PRIORITY_ORDER[b.item.priority] ?? 1) || a.index - b.index)
        .map(({ item }) => item),
      // 준비 완료: 최근에 완료한 순
      completed: indexed
        .filter(({ item }) => item.completed)
        .sort((a, b) => (b.item.completedAt || 0) - (a.item.completedAt || 0))
        .map(({ item }) => item),
    };
  }, [items]);

  const highRemaining = remaining.filter(item => item.priority === 'high').length;
  const summarySub = remaining.length === 0
    ? '모든 준비를 마쳤어요!'
    : highRemaining > 0
      ? `중요한 준비 ${highRemaining}개가 남았어요`
      : `남은 준비 ${remaining.length}개`;

  const memberName = (uid) => members.find(m => m.uid === uid)?.name;
  const visibleCompleted = showAllCompleted ? completed : completed.slice(0, COMPLETED_PREVIEW);
  const hiddenCount = completed.length - COMPLETED_PREVIEW;

  return (
    <>
      <div className="tct-summary">
        <ProgressRing percent={progress} />
        <div className="tct-summary-text">
          <span className="tct-summary-title">{items.length}개 중 {completed.length}개 준비 완료</span>
          <span className="tct-summary-sub">{summarySub}</span>
        </div>
      </div>

      {remaining.length > 0 && (
        <>
          <span className="tct-label">남은 준비 {remaining.length}</span>
          <div className="tct-remaining">
            {remaining.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={() => onToggle(item.id)}
                onEdit={onEdit}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <span className="tct-label done">준비 완료 {completed.length}</span>
          <div className="tct-completed">
            {visibleCompleted.map(item => (
              <CompletedChecklistRow
                key={item.id}
                item={item}
                completerName={memberName(item.completedBy)}
                onToggle={() => onToggle(item.id)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
            {hiddenCount > 0 && (
              <button className="tct-more" onClick={onToggleShowAll}>
                {showAllCompleted ? '접기 ▴' : `${hiddenCount}개 더 보기 ▾`}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default TravelChecklistTab;
