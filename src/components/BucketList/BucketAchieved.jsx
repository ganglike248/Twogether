// src/components/BucketList/BucketAchieved.jsx — '이룬 것' 탭 목록(날짜·한 줄, 누르면 상세)
import React from 'react';
import { MdCheck } from 'react-icons/md';
import { pressable } from '../../utils/pressable';
import { formatMonthDay } from '../../utils/dateFormat';
import { sortedHistory } from '../../services/bucket/bucketLogic';

const BucketAchieved = ({ items, onOpen }) => (
  <ul className="bk-ach-list">
    {items.map(b => {
      const note = sortedHistory(b).find(h => h.note)?.note;
      return (
        <li key={b.id} className="bk-ach-row" {...pressable(() => onOpen(b))}>
          <span className="bk-ach-check" aria-hidden="true"><MdCheck /></span>
          <span className="bk-ach-tx">
            <b>{b.title}</b>
            <span>{b.completedAt ? formatMonthDay(b.completedAt) : ''}{note ? ` · "${note}"` : ''}</span>
          </span>
        </li>
      );
    })}
  </ul>
);

export default BucketAchieved;
