// src/components/Travel/Decisions/useDecisionActions.jsx
// 선택 사항 탭의 후보/주제 동작 + 그에 딸린 확인·편집 모달을 한곳에서 관리.
// 카드와 후보 상세 시트가 같은 동작을 쓰므로 탭 최상단에서 한 번만 만들어 내려줌.
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  addOption,
  addScore,
  createDecision,
  deleteDecision,
  deleteOption,
  isOptionDecided,
  setOptionDecided,
  toggleFavorite,
  updateDecision,
  updateOption,
} from '../../../services/travelDecisionService';
import ConfirmModal from '../../common/ConfirmModal';
import OptionFormSheet from './OptionFormSheet';
import DecisionModal from './DecisionModal';

// scheduledDaysByOption: { [optionId]: [day...] } — 이미 일정에 들어간 후보는 확정 후 "일정에 추가할까요?"를 건너뜀
const useDecisionActions = ({ trip, userId, onOptionDeleted, scheduledDaysByOption = {}, onAddToSchedule }) => {
  // { type: 'undecide'|'askSchedule'|'deleteOption'|'deleteTopic', decision, option }
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null); // { decision, option }
  const [addingTo, setAddingTo] = useState(null); // decision
  const [topicModal, setTopicModal] = useState(null); // { mode: 'create' } | { mode: 'edit', decision }

  const run = async (task, successMsg, errorMsg) => {
    try {
      await task();
      if (successMsg) toast.success(successMsg);
      return true;
    } catch (error) {
      console.error(errorMsg, error);
      toast.error(errorMsg);
      return false;
    }
  };

  const actions = {
    toggleFavorite: (decision, option) => run(
      () => toggleFavorite(trip.id, decision.id, option.id),
      option.isFavorite ? '즐겨찾기를 해제했습니다.' : '즐겨찾기했습니다.',
      '즐겨찾기 처리 중 오류가 발생했습니다.',
    ),
    saveScore: (decision, option, score, comment) => run(
      () => addScore(trip.id, decision.id, option.id, userId, score, comment),
      `${score}점 평가했습니다!`,
      '점수 저장 중 오류가 발생했습니다.',
    ),
    // 확정은 여러 개 가능하고 되돌릴 수 있어서 확인 없이 바로 — 대신 일정에 아직 없으면 이어서 추가할지 물어봄.
    // 확정 취소만 확인을 거침
    toggleDecided: async (decision, option) => {
      if (isOptionDecided(decision, option)) {
        setConfirm({ type: 'undecide', decision, option });
        return;
      }
      const alreadyScheduled = (scheduledDaysByOption[option.id] || []).length > 0;
      const ok = await run(
        () => setOptionDecided(trip.id, decision.id, option.id, userId, true),
        alreadyScheduled || !onAddToSchedule ? '확정했어요!' : null,
        '확정 중 오류가 발생했습니다.',
      );
      if (ok && !alreadyScheduled && onAddToSchedule) setConfirm({ type: 'askSchedule', decision, option });
    },
    requestDeleteOption: (decision, option) => setConfirm({ type: 'deleteOption', decision, option }),
    requestDeleteTopic: (decision) => setConfirm({ type: 'deleteTopic', decision }),
    editOption: (decision, option) => setEditing({ decision, option }),
    addOption: (decision) => setAddingTo(decision),
    createTopic: () => setTopicModal({ mode: 'create' }),
    editTopic: (decision) => setTopicModal({ mode: 'edit', decision }),
  };

  const handleConfirm = async () => {
    const { type, decision, option } = confirm;
    setConfirm(null);
    if (type === 'undecide') {
      await run(
        () => setOptionDecided(trip.id, decision.id, option.id, userId, false),
        '확정을 취소했어요.',
        '확정 취소 중 오류가 발생했습니다.',
      );
    } else if (type === 'askSchedule') {
      onAddToSchedule(decision, option);
    } else if (type === 'deleteOption') {
      const ok = await run(() => deleteOption(trip.id, decision.id, option.id), '옵션이 삭제되었습니다.', '옵션 삭제 중 오류가 발생했습니다.');
      if (ok) onOptionDeleted?.(option.id);
    } else if (type === 'deleteTopic') {
      await run(() => deleteDecision(trip.id, decision.id), '선택지가 삭제되었습니다.', '선택지 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleAddOption = async (optionData) => {
    const ok = await run(() => addOption(trip.id, addingTo.id, optionData), '옵션이 추가되었습니다.', '옵션 추가 중 오류가 발생했습니다.');
    if (ok) setAddingTo(null);
  };

  const handleUpdateOption = async (updatedData) => {
    const ok = await run(
      () => updateOption(trip.id, editing.decision.id, editing.option.id, updatedData),
      '옵션이 수정되었습니다.',
      '옵션 수정 중 오류가 발생했습니다.',
    );
    if (ok) setEditing(null);
  };

  const handleSaveTopic = async (decisionData) => {
    if (topicModal.mode === 'create') {
      const ok = await run(
        () => createDecision(trip.id, { ...decisionData, coupleId: trip.coupleId }),
        '선택지가 추가되었습니다.',
        '선택지 추가 중 오류가 발생했습니다.',
      );
      if (ok) setTopicModal(null);
    } else {
      const ok = await run(
        () => updateDecision(trip.id, topicModal.decision.id, {
          category: decisionData.category,
          title: decisionData.title,
          description: decisionData.description,
        }),
        '비교 주제가 수정되었습니다.',
        '저장 중 오류가 발생했습니다.',
      );
      if (ok) setTopicModal(null);
    }
  };

  const confirmCopy = {
    undecide: { title: '확정 취소', message: '이 후보의 확정을 취소할까요?', confirmText: '확정 취소', danger: true },
    askSchedule: {
      title: '확정했어요!',
      message: '이 후보를 일정에도 바로 추가할까요?',
      confirmText: '일정에 추가',
      cancelText: '나중에',
      danger: false,
    },
    deleteOption: { title: '옵션 삭제', message: '이 옵션을 삭제하시겠습니까?', confirmText: '삭제', danger: true },
    deleteTopic: { title: '선택지 삭제', message: '이 선택지를 삭제하시겠습니까?', confirmText: '삭제', danger: true },
  };

  const modals = (
    <>
      {addingTo && (
        <OptionFormSheet
          mode="add"
          topicTitle={addingTo.title}
          onClose={() => setAddingTo(null)}
          onSave={handleAddOption}
        />
      )}
      {editing && (
        <OptionFormSheet
          key={editing.option.id}
          mode="edit"
          topicTitle={editing.decision.title}
          option={editing.option}
          onClose={() => setEditing(null)}
          onSave={handleUpdateOption}
        />
      )}
      {topicModal && (
        <DecisionModal
          isOpen
          onClose={() => setTopicModal(null)}
          tripId={trip.id}
          coupleId={trip.coupleId}
          editingDecision={topicModal.mode === 'edit' ? topicModal.decision : null}
          onSave={handleSaveTopic}
        />
      )}
      <ConfirmModal
        isOpen={!!confirm}
        {...(confirm ? confirmCopy[confirm.type] : {})}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );

  return { actions, modals };
};

export default useDecisionActions;
