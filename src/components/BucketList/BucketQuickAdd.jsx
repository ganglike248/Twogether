// src/components/BucketList/BucketQuickAdd.jsx
// 맨 위 한 줄 추가 — 제목 + 종류(해보기 / 자주)만, 아래에 고른 종류 설명. 카테고리·메모는 카드 상세에서(필수 아님).
import React, { useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { KIND_SHORT, KIND_LABEL, KIND_DESC } from '../../services/bucket/bucketLogic';

const BucketQuickAdd = ({ onAdd, inputRef }) => {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('once');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const ok = await onAdd({ title, kind });
    setBusy(false);
    if (ok) setTitle('');
  };

  return (
    <div className="bk-add-wrap">
      <form className="bk-add" onSubmit={submit}>
        <input
          ref={inputRef}
          className="bk-add-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="하고 싶은 걸 한 줄로 적어요"
          maxLength={60}
          enterKeyHint="done"
          aria-label="하고 싶은 것"
        />
        <div className="bk-kind" role="radiogroup" aria-label="종류">
          <button type="button" role="radio" aria-checked={kind === 'once'} className={kind === 'once' ? 'on' : ''} onClick={() => setKind('once')}>{KIND_SHORT.once}</button>
          <button type="button" role="radio" aria-checked={kind === 'repeat'} className={kind === 'repeat' ? 'on' : ''} onClick={() => setKind('repeat')}>{KIND_SHORT.repeat}</button>
        </div>
        <button type="submit" className="bk-add-btn" aria-label="추가" disabled={!title.trim() || busy}><MdAdd /></button>
      </form>
      <p className="bk-kind-desc"><b>{KIND_LABEL[kind]}</b> · {KIND_DESC[kind]}</p>
    </div>
  );
};

export default BucketQuickAdd;
