// src/hooks/useRecordSave.js
// "우리 기록" 파일 저장 버튼 공용 훅 — 연결 중인 커플(saveCurrent)과 해제된 이전 커플(saveFormer) 두 경로.
// 생성기(마스코트 이미지 포함 ~30KB)는 버튼을 누를 때만 불러와서 화면 첫 로딩에 영향이 없게 함.
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { db, functionsInstance } from '../firebase';
import { useAuthContext } from '../contexts/AuthContext';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

const notifyResult = (result) => {
  if (result?.cancelled) return; // 앱 공유 창을 그냥 닫은 경우
  toast.success('기록 파일을 저장했어요');
};

const useRecordSave = () => {
  const { user, userDoc, partnerDoc, coupleDoc, coupleId } = useAuthContext();
  const [saving, setSaving] = useState(null); // null | 'current' | coupleId(이전 커플)

  const saveCurrent = useCallback(async () => {
    if (!coupleId || saving) return;
    setSaving('current');
    try {
      const { exportCurrentRecord } = await import('../services/record/recordExport');
      const members = coupleDoc?.members || [];
      const memberNames = {
        [user.uid]: userDoc?.displayName || '',
        ...(partnerDoc ? { [partnerDoc.id]: partnerDoc.displayName || '' } : {}),
      };
      notifyResult(await exportCurrentRecord({ db, coupleId, uid: user.uid, members, memberNames }));
    } catch (error) {
      console.error('기록 파일 저장 실패:', error);
      toast.error(getFriendlyErrorMessage(error, '기록 파일을 만들지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setSaving(null);
    }
  }, [coupleId, saving, coupleDoc?.members, user?.uid, userDoc?.displayName, partnerDoc]);

  const saveFormer = useCallback(async (formerCoupleId) => {
    if (!formerCoupleId || saving) return;
    setSaving(formerCoupleId);
    try {
      const { exportFormerRecord } = await import('../services/record/recordExport');
      notifyResult(await exportFormerRecord({ functionsInstance, coupleId: formerCoupleId, uid: user.uid }));
    } catch (error) {
      console.error('이전 커플 기록 저장 실패:', error);
      toast.error(getFriendlyErrorMessage(error, '기록 파일을 만들지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setSaving(null);
    }
  }, [saving, user?.uid]);

  return { saving, saveCurrent, saveFormer };
};

export default useRecordSave;
