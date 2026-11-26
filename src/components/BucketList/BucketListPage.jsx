// src/components/BucketList/BucketListPage.jsx
// '하고 싶은 것' 보드(v1.2 개편) — 한 줄 추가 → [뭐 할까? 골라줘]·추천 → 카드(한 번 해볼 것/또 할 것) → [언제 할까?]=일정 → [했어요]=기록.
// 시트는 URL(?modal=detail|done|date|plan|categoryManager|wheel&id=)에서 파생. 계산은 services/bucket/bucketLogic.js,
// 쓰기는 services/bucket/bucketService.js(offlineWrite). 예전 문서(kind 없음)는 '한 번 해볼 것'.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { doc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { MdCasino, MdSettings } from 'react-icons/md';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import useAnalytics from '../../hooks/useAnalytics';
import { safeUpdateDoc } from '../../services/offlineWrite';
import { getLocalDateStr } from '../../utils/dataUtils';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import { getCategoryDisplayName, isKnownCategory } from '../../services/categoryColorService';
import { isActive, isAchieved, isRepeat, rankSuggestions, createdDateStr, KIND_LABEL, KIND_DESC } from '../../services/bucket/bucketLogic';
import * as svc from '../../services/bucket/bucketService';
import { useBucketData } from './useBucketData';
import BucketQuickAdd from './BucketQuickAdd';
import BucketSuggestCard from './BucketSuggestCard';
import BucketCard from './BucketCard';
import BucketCheckCard from './BucketCheckCard';
import BucketAchieved from './BucketAchieved';
import BucketDetailSheet from './BucketDetailSheet';
import BucketDoneSheet from './BucketDoneSheet';
import BucketPlanSheet from './BucketPlanSheet';
import CategoryManagerModal from './CategoryManagerModal';
import WheelModal from '../Wheel/WheelModal';
import EmptyState from '../common/EmptyState';
import { BucketListSkeleton } from './BucketListSkeleton';
import './BucketBoard.css';

const KINDS = [
  { key: 'all', label: '전체' },
  { key: 'once', label: KIND_LABEL.once },
  { key: 'repeat', label: KIND_LABEL.repeat },
  { key: 'done', label: '이룬 것' }, // 맨 아래 접힌 구역 대신 필터 탭으로(찾기 쉽게)
];

const byPlannedThenNewest = (a, b) => {
  if (a.plannedDate && b.plannedDate) return a.plannedDate < b.plannedDate ? -1 : 1;
  if (a.plannedDate) return -1;
  if (b.plannedDate) return 1;
  return createdDateStr(b).localeCompare(createdDateStr(a)) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
};

function BucketListPage() {
  const { coupleId, user } = useAuthContext();
  const uid = user?.uid;
  const { logEvent } = useAnalytics();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const modal = searchParams.get('modal');
  const modalId = searchParams.get('id');
  const { bucketList, customCategories, isLoading } = useBucketData(coupleId);
  const [kindFilter, setKindFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const addInputRef = useRef(null);
  const todayStr = getLocalDateStr();

  const openModal = useCallback((type, id, { replace = false } = {}) => {
    navigate(`/bucket?modal=${type}${id ? `&id=${id}` : ''}`, { replace, state: { modal: true } });
  }, [navigate]);

  // 첫 진입(딥링크·새로고침)이면 뒤로 가기 대신 /bucket으로(앱 밖으로 나가지 않게)
  const closeModal = useCallback(() => {
    if (location.key === 'default') navigate('/bucket', { replace: true });
    else navigate(-1);
  }, [location.key, navigate]);

  const byId = useMemo(() => new Map(bucketList.map(b => [b.id, b])), [bucketList]);
  const current = modalId ? byId.get(modalId) || null : null;

  const active = useMemo(() => bucketList.filter(isActive), [bucketList]);
  const achieved = useMemo(
    () => bucketList.filter(isAchieved).sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || ''))),
    [bucketList],
  );
  const suggestions = useMemo(() => rankSuggestions(bucketList), [bucketList]);
  const isDoneTab = kindFilter === 'done';
  const pool = isDoneTab ? achieved : active;
  const usedCats = useMemo(
    () => [...new Set(pool.map(b => b.category).filter(c => isKnownCategory(c, customCategories)))].sort(),
    [pool, customCategories],
  );
  const counts = useMemo(() => ({
    all: active.length,
    once: active.filter(b => !isRepeat(b)).length,
    repeat: active.filter(isRepeat).length,
    done: achieved.length,
  }), [active, achieved]);
  const visible = useMemo(() => (isDoneTab ? achieved : active
    .filter(b => kindFilter === 'all' || (kindFilter === 'repeat') === isRepeat(b))
    .sort(byPlannedThenNewest))
    .filter(b => catFilter === 'all' || b.category === catFilter), [isDoneTab, achieved, active, kindFilter, catFilter]);

  // ── 쓰기(성공하면 true) ─────────────────────────────
  const run = async (fn, okMsg, failMsg = '잠시 후 다시 시도해주세요.') => {
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (err) {
      console.error('[bucket]', err);
      toast.error(getFriendlyErrorMessage(err, failMsg));
      return false;
    }
  };

  const handleAdd = ({ title, kind }) => run(async () => {
    const category = catFilter !== 'all' ? catFilter : null;
    await svc.addBucket({ title, kind, category }, uid, coupleId);
    logEvent('bucket_created', { kind, category: category || 'none' });
    if (kindFilter !== 'all' && kindFilter !== kind) setKindFilter('all');
  }, kind === 'repeat' ? '자주 할 것에 담았어요!' : '하고 싶은 것에 담았어요!');

  const handleDone = async (b, { date, note }) => {
    const ok = await run(async () => {
      await svc.markBucketDone(b, { date, note, uid });
      logEvent('bucket_done', { kind: isRepeat(b) ? 'repeat' : 'once', hasNote: !!note.trim() });
    }, isRepeat(b) ? '기록했어요! 다음에 또 해요' : '이뤘어요! 축하해요');
    if (ok) closeModal();
    return ok;
  };

  const handleChangeDate = async (b, { date }) => {
    const ok = await run(() => svc.changeBucketCompletedDate(b, date), '날짜를 고쳤어요');
    if (ok) closeModal();
    return ok;
  };

  const handlePlan = async (b, date) => {
    const ok = await run(async () => {
      await svc.planBucket(b, date, uid, coupleId);
      logEvent('bucket_planned', { kind: isRepeat(b) ? 'repeat' : 'once' });
    }, '캘린더에 일정을 만들었어요');
    if (ok) closeModal();
    return ok;
  };

  const handleSave = (b, form) => run(async () => {
    await svc.editBucket(b.id, form);
    if (form.kind !== (isRepeat(b) ? 'repeat' : 'once')) await svc.changeBucketKind(b, form.kind);
  }, '수정했어요');

  const handleDelete = async (b) => {
    const ok = await run(async () => {
      if (b.plannedEventId && b.plannedDate >= todayStr) await svc.unplanBucket(b, uid, coupleId);
      await svc.deleteBucket(b.id);
    }, '삭제했어요');
    if (ok) closeModal();
  };

  const handleSaveCategories = (updated) => run(
    () => safeUpdateDoc(doc(db, 'couples', coupleId), { customCategories: updated }),
    '카테고리가 저장됐어요.',
  );

  // 돌림판 결과에서 바로 [언제 할까?]·[오늘 했어요] — 돌림판 자리를 시트로 바꿈(닫으면 보드로)
  const wheelPlan = (id) => openModal('plan', id, { replace: true });
  const wheelDone = (id) => openModal('done', id, { replace: true });

  const showDetail = (modal === 'detail' || (modal === 'categoryManager' && modalId)) ? current : null;

  return (
    <div className="bk-page">
      <header className="bk-hd">
        <h1 className="bk-title">하고 싶은 것</h1>
        <p className="bk-sub">둘이 같이 해보고 싶은 것들</p>
      </header>

      <BucketQuickAdd onAdd={handleAdd} inputRef={addInputRef} />

      {isLoading ? (
        <BucketListSkeleton />
      ) : (
        <>
          <BucketCheckCard bucketList={bucketList} />

          {active.length >= 2 && (
            <button type="button" className="bk-pick" onClick={() => openModal('wheel')}>
              <MdCasino aria-hidden="true" />뭐 할까? 골라줘
            </button>
          )}

          <BucketSuggestCard
            suggestions={suggestions}
            todayStr={todayStr}
            customCategories={customCategories}
            onOpen={(b) => openModal('detail', b.id)}
            onPlan={(b) => openModal('plan', b.id)}
            onDone={(b) => openModal('done', b.id)}
          />

          {bucketList.length > 0 && (
            <div className="bk-filters">
              <div className="bk-seg" role="tablist" aria-label="종류">
                {KINDS.map(k => (
                  <button key={k.key} type="button" role="tab" aria-selected={kindFilter === k.key} className={kindFilter === k.key ? 'on' : ''} onClick={() => { setKindFilter(k.key); setCatFilter('all'); }}>
                    {k.label} <span>{counts[k.key]}</span>
                  </button>
                ))}
              </div>
              <p className="bk-kind-desc">{KIND_DESC[kindFilter]}</p>
              <div className="bk-cats scroll">
                <button type="button" className="bk-cat-manage" onClick={() => openModal('categoryManager')} aria-label="카테고리 관리"><MdSettings /></button>
                <button type="button" className={`bk-cat${catFilter === 'all' ? ' on' : ''}`} onClick={() => setCatFilter('all')}>모든 카테고리</button>
                {usedCats.map(c => (
                  <button key={c} type="button" className={`bk-cat${catFilter === c ? ' on' : ''}`} onClick={() => setCatFilter(c)}>
                    {getCategoryDisplayName(c, customCategories)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isDoneTab ? (
            visible.length > 0
              ? <BucketAchieved items={visible} onOpen={(b) => openModal('detail', b.id)} />
              : <p className="bk-empty">{achieved.length ? '조건에 맞는 항목이 없어요' : "아직 이룬 게 없어요. 해보고 싶은 것을 하고 [했어요]를 눌러 보세요"}</p>
          ) : visible.length > 0 ? (
            <div className="bk-grid">
              {visible.map(b => (
                <BucketCard key={b.id} bucket={b} uid={uid} todayStr={todayStr} customCategories={customCategories} onOpen={(x) => openModal('detail', x.id)} />
              ))}
            </div>
          ) : active.length > 0 ? (
            <p className="bk-empty">조건에 맞는 항목이 없어요</p>
          ) : (
            <EmptyState
              title={achieved.length ? '다 이뤘어요!' : '아직 담은 게 없어요'}
              text="먹고 싶은 것, 가고 싶은 곳, 해보고 싶은 것을 위에 한 줄로 적어 보세요"
              button={{ text: '적으러 가기', onClick: () => addInputRef.current?.focus() }}
            />
          )}

        </>
      )}

      <BucketDetailSheet
        bucket={showDetail}
        uid={uid}
        todayStr={todayStr}
        customCategories={customCategories}
        onClose={closeModal}
        onPlan={(b) => openModal('plan', b.id)}
        onDone={(b) => openModal('done', b.id)}
        onChangeDate={(b) => openModal('date', b.id)}
        onManageCategories={() => openModal('categoryManager', showDetail?.id)}
        onLike={(b, on) => run(() => svc.setBucketLike(b.id, uid, on))}
        onUnplan={(b) => run(() => svc.unplanBucket(b, uid, coupleId), '계획을 취소했어요')}
        onUncomplete={(b) => run(() => svc.uncompleteBucket(b), "다시 '하고 싶은 것'으로 옮겼어요")}
        onRemoveHistory={(b, at) => run(() => svc.removeBucketHistory(b, at), '기록을 지웠어요')}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <BucketDoneSheet
        bucket={modal === 'done' && current && isActive(current) ? current : modal === 'date' && current && isAchieved(current) ? current : null}
        mode={modal === 'date' ? 'date' : 'done'}
        todayStr={todayStr}
        onClose={closeModal}
        onSubmit={modal === 'date' ? handleChangeDate : handleDone}
      />
      <BucketPlanSheet
        bucket={modal === 'plan' && current && isActive(current) ? current : null}
        todayStr={todayStr}
        onClose={closeModal}
        onSubmit={handlePlan}
      />
      <CategoryManagerModal
        isOpen={modal === 'categoryManager'}
        onClose={closeModal}
        customCategories={customCategories}
        onSave={handleSaveCategories}
      />
      <WheelModal
        isOpen={modal === 'wheel'}
        onClose={closeModal}
        bucketList={bucketList}
        customCategories={customCategories}
        onPlan={wheelPlan}
        onDone={wheelDone}
      />
    </div>
  );
}

export default BucketListPage;
