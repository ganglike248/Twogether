// src/components/BucketList/BucketDetailSheet.jsx
// 카드 상세 — 보기(종류·카테고리·공감·계획·기록, [언제 할까?]/[했어요]) ↔ 수정(제목·메모·종류·카테고리), 삭제 확인.
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { MdEvent, MdCheck, MdFavorite, MdFavoriteBorder, MdClose, MdSettings } from 'react-icons/md';
import BucketSheet from './BucketSheet';
import ConfirmModal from '../common/ConfirmModal';
import AutoGrowTextarea from '../common/AutoGrowTextarea';
import { KindChip, CategoryChip, BothLikedChip } from './BucketChips';
import { DEFAULT_CATEGORIES, getCategoryColor, getCategoryTextColor, getCategoryDisplayName, isKnownCategory } from '../../services/categoryColorService';
import { KIND_LABEL, KIND_DESC, isRepeat, isAchieved, likeUids, sortedHistory, doneCountOf } from '../../services/bucket/bucketLogic';
import { formatMonthDay } from '../../utils/dateFormat';
import { useNameByUid } from '../../hooks/useNameByUid';

const BucketEditForm = ({ bucket, customCategories, onCancel, onSave, onManageCategories }) => {
  const [form, setForm] = useState({
    title: bucket.title || '',
    content: bucket.content || '',
    kind: isRepeat(bucket) ? 'repeat' : 'once',
    category: isKnownCategory(bucket.category, customCategories) ? bucket.category : null,
  });
  const [busy, setBusy] = useState(false);
  const categories = Object.keys({ ...DEFAULT_CATEGORIES, ...customCategories }).sort();

  const save = async () => {
    if (!form.title.trim()) { toast.warning('제목을 입력해주세요.'); return; }
    setBusy(true);
    const ok = await onSave(form);
    if (!ok) setBusy(false);
  };

  return (
    <>
      <h2 className="bk-sheet-t">수정하기</h2>
      <label className="bk-label" htmlFor="bk-edit-title">제목</label>
      <input id="bk-edit-title" className="bk-input" value={form.title} maxLength={60} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <label className="bk-label" htmlFor="bk-edit-content">메모 (선택)</label>
      <AutoGrowTextarea id="bk-edit-content" className="bk-input bk-textarea" value={form.content} placeholder="예: 맵기 2단계가 딱이야" onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
      <p className="bk-label">종류</p>
      <div className="bk-dates" role="radiogroup" aria-label="종류">
        <button type="button" role="radio" aria-checked={form.kind === 'once'} className={form.kind === 'once' ? 'on' : ''} onClick={() => setForm(f => ({ ...f, kind: 'once' }))}>{KIND_LABEL.once}</button>
        <button type="button" role="radio" aria-checked={form.kind === 'repeat'} className={form.kind === 'repeat' ? 'on' : ''} onClick={() => setForm(f => ({ ...f, kind: 'repeat' }))}>{KIND_LABEL.repeat}</button>
      </div>
      <p className="bk-kind-desc">{KIND_DESC[form.kind]}</p>
      <div className="bk-label-row">
        <p className="bk-label">카테고리 (선택)</p>
        <button type="button" className="bk-text-btn" onClick={onManageCategories}><MdSettings aria-hidden="true" />관리</button>
      </div>
      <div className="bk-cats" role="radiogroup" aria-label="카테고리">
        <button type="button" role="radio" aria-checked={!form.category} className={`bk-cat${!form.category ? ' on' : ''}`} onClick={() => setForm(f => ({ ...f, category: null }))}>없음</button>
        {categories.map(c => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={form.category === c}
            className={`bk-cat${form.category === c ? ' on' : ''}`}
            style={{ '--bk-cat': getCategoryColor(c, customCategories), '--bk-cat-text': getCategoryTextColor(c, customCategories) }}
            onClick={() => setForm(f => ({ ...f, category: c }))}
          >
            {getCategoryDisplayName(c, customCategories)}
          </button>
        ))}
      </div>
      <div className="bk-acts">
        <button type="button" className="bk-btn" onClick={onCancel}>취소</button>
        <button type="button" className="bk-btn primary" onClick={save} disabled={busy}>저장</button>
      </div>
    </>
  );
};

const DetailBody = ({
  bucket, uid, todayStr, customCategories, onClose,
  onPlan, onDone, onUnplan, onLike, onSave, onDelete, onUncomplete, onChangeDate, onRemoveHistory, onManageCategories,
}) => {
  const nameOf = useNameByUid();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'delete' | 'unplan' | { historyAt }
  const open = true;

  const repeat = isRepeat(bucket);
  const achieved = isAchieved(bucket);
  const likes = likeUids(bucket);
  const mine = likes.includes(uid);
  const partnerLiked = likes.find(k => k !== uid);
  const history = sortedHistory(bucket);
  const creator = bucket.createdBy ? nameOf(bucket.createdBy) : '';

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    if (c === 'delete') await onDelete(bucket);
    else if (c === 'unplan') await onUnplan(bucket);
    else if (c?.historyAt !== undefined) await onRemoveHistory(bucket, c.historyAt);
  };

  return (
    <>
      <BucketSheet open={open} onClose={onClose} label={bucket.title}>
        {editing ? (
          <BucketEditForm
            bucket={bucket}
            customCategories={customCategories}
            onCancel={() => setEditing(false)}
            onManageCategories={onManageCategories}
            onSave={async (form) => { const ok = await onSave(bucket, form); if (ok) setEditing(false); return ok; }}
          />
        ) : (
          <>
            <div className="bk-sheet-headrow">
              <div className="bk-meta">
                <KindChip bucket={bucket} />
                <CategoryChip category={bucket.category} customCategories={customCategories} />
                {likes.length > 1 && <BothLikedChip />}
              </div>
              <button type="button" className="bk-icon-btn" onClick={onClose} aria-label="닫기"><MdClose /></button>
            </div>
            <h2 className="bk-sheet-t">{bucket.title}</h2>
            {bucket.content && <p className="bk-sheet-note">{bucket.content}</p>}
            {creator && <p className="bk-sheet-sub">{creator}님이 담았어요</p>}

            {bucket.plannedDate && !achieved && (
              <div className="bk-plan-row">
                <MdEvent aria-hidden="true" />
                <span>{bucket.plannedDate === todayStr ? '오늘' : formatMonthDay(bucket.plannedDate)}에 하기로 했어요</span>
                <button type="button" className="bk-text-btn" onClick={() => onPlan(bucket)}>바꾸기</button>
                <button type="button" className="bk-text-btn muted" onClick={() => setConfirm('unplan')}>취소</button>
              </div>
            )}

            {achieved && (
              <div className="bk-plan-row done">
                <MdCheck aria-hidden="true" />
                <span>{bucket.completedAt ? `${formatMonthDay(bucket.completedAt)}에 이뤘어요` : '이뤘어요'}</span>
                <button type="button" className="bk-text-btn" onClick={() => onChangeDate(bucket)}>날짜 고치기</button>
                <button type="button" className="bk-text-btn muted" onClick={() => onUncomplete(bucket)}>되돌리기</button>
              </div>
            )}

            {history.length > 0 && (
              <>
                <p className="bk-label">{repeat ? `함께한 기록 · ${doneCountOf(bucket)}번` : '남긴 한 줄'}</p>
                <ul className="bk-hist">
                  {history.map(h => (
                    <li key={`${h.at}_${h.date}`}>
                      <em>{formatMonthDay(h.date)}</em>
                      <span className="bk-hist-note">{h.note ? `"${h.note}"` : (h.by ? `${nameOf(h.by) || ''}` : '')}</span>
                      {repeat && (
                        <button type="button" className="bk-hist-del" onClick={() => setConfirm({ historyAt: h.at })} aria-label={`${formatMonthDay(h.date)} 기록 지우기`}><MdClose /></button>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {!achieved && (
              <div className="bk-acts">
                <button type="button" className="bk-btn" onClick={() => onPlan(bucket)}><MdEvent aria-hidden="true" />{bucket.plannedDate ? '날짜 바꾸기' : '언제 할까?'}</button>
                <button type="button" className="bk-btn primary" onClick={() => onDone(bucket)}><MdCheck aria-hidden="true" />했어요</button>
                <button
                  type="button"
                  className={`bk-heart${mine ? ' on' : ''}`}
                  aria-pressed={mine}
                  aria-label={partnerLiked ? `나도 하고 싶어요 (${nameOf(partnerLiked) || '상대'}님도 하고 싶어해요)` : '나도 하고 싶어요'}
                  onClick={() => onLike(bucket, !mine)}
                >
                  {mine ? <MdFavorite aria-hidden="true" /> : <MdFavoriteBorder aria-hidden="true" />}
                </button>
              </div>
            )}

            <div className="bk-sheet-links">
              <button type="button" className="bk-text-btn" onClick={() => setEditing(true)}>수정</button>
              <button type="button" className="bk-text-btn danger" onClick={() => setConfirm('delete')}>삭제</button>
            </div>
          </>
        )}
      </BucketSheet>
      <ConfirmModal
        isOpen={!!confirm}
        title={confirm === 'delete' ? '삭제할까요?' : confirm === 'unplan' ? '계획을 취소할까요?' : '이 기록을 지울까요?'}
        message={confirm === 'delete' ? `'${bucket.title}'을(를) 지우면 기록도 같이 사라져요.`
          : confirm === 'unplan' ? '캘린더 일정도 같이 지워요. 목록엔 그대로 남아요.'
            : '횟수도 하나 줄어요.'}
        confirmText={confirm === 'unplan' ? '계획 취소' : '지우기'}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

// 다른 항목을 열면 수정 중·확인창 상태를 새로(key)
const BucketDetailSheet = (props) => (props.bucket ? <DetailBody key={props.bucket.id} {...props} /> : null);

export default BucketDetailSheet;
