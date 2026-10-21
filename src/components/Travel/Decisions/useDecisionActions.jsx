// src/components/Travel/Decisions/useDecisionActions.jsx
// 선택 사항 탭의 후보/주제 동작 + 그에 딸린 확인·편집 모달을 한곳에서 관리.
// 카드와 후보 상세 시트가 같은 동작을 쓰므로 탭 최상단에서 한 번만 만들어 내려줌.
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  addOption,
  addScore,
  createDecision,
  decideOption,
  deleteDecision,
  deleteOption,
  toggleFavorite,
  undecideDecision,
  updateDecision,
  updateOption,
} from '../../../services/travelDecisionService';
import ConfirmModal from '../../common/ConfirmModal';
import OptionFormSheet from './OptionFormSheet';
import DecisionModal from './DecisionModal';

const useDecisionActions = ({ trip, userId, onOptionDeleted }) => {
  const [confirm, setConfirm] = useState(null); // { type: 'decide'|'deleteOption'|'deleteTopic', decision, option }
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
    undecide: (decision) => run(
      () => undecideDecision(trip.id, decision.id),
      '확정이 취소되었습니다.',
      '취소 중 오류가 발생했습니다.',
    ),
    requestDecide: (decision, option) => setConfirm({ type: 'decide', decision, option }),
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
    if (type === 'decide') {
      await run(() => decideOption(trip.id, decision.id, option.id, userId), '확정되었습니다!', '확정 중 오류가 발생했습니다.');
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
    decide: { title: '후보 확정', message: '이 후보로 확정하시겠습니까?', confirmText: '확정', danger: false },
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
