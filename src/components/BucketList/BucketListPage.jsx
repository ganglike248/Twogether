// src/components/BucketList/BucketListPage.jsx
import React, { useEffect, useState } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import '../BucketList/BucketListPage.css';

const CATEGORY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'food', label: '음식' },
  { value: 'place', label: '여행' },
  { value: 'date', label: '데이트' },
];

function BucketListPage() {
  const { coupleId } = useAuthContext();
  const [bucketList, setBucketList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'food' });
  const [tempDate, setTempDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', title: '', content: '', category: 'food' });

  useEffect(() => {
    if (!coupleId) return;
    const fetchData = async () => {
      let q = query(collection(db, 'bucketlists'), where('coupleId', '==', coupleId));
      if (filterCategory !== 'all') {
        q = query(
          collection(db, 'bucketlists'),
          where('coupleId', '==', coupleId),
          where('category', '==', filterCategory)
        );
      }
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBucketList(data);
    };
    fetchData();
  }, [coupleId, filterCategory, showCompleted]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    const newItem = {
      title: form.title,
      content: form.content,
      category: form.category,
      coupleId,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'bucketlists'), newItem);
    setBucketList(list => [...list, { ...newItem, id: docRef.id }]);
    setForm({ title: '', content: '', category: 'food' });
    setShowAddModal(false);
  };

  const handleCheck = (id) => {
    setSelectedId(id);
    setShowDateModal(true);
  };

  const handleComplete = async () => {
    const item = bucketList.find(i => i.id === selectedId);
    if (!item) return;
    await updateDoc(doc(db, 'bucketlists', selectedId), { completed: true, completedAt: tempDate });
    setBucketList(list =>
      list.map(item =>
        item.id === selectedId ? { ...item, completed: true, completedAt: tempDate } : item
      )
    );
    setShowDateModal(false);
    setTempDate('');
    setSelectedId(null);
  };

  const handleUncheck = async (id) => {
    if (!window.confirm('완료를 취소하시겠습니까?')) return;
    await updateDoc(doc(db, 'bucketlists', id), { completed: false, completedAt: null });
    setBucketList(list =>
      list.map(item => item.id === id ? { ...item, completed: false, completedAt: null } : item)
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제할까요?')) return;
    await deleteDoc(doc(db, 'bucketlists', id));
    setBucketList(list => list.filter(item => item.id !== id));
  };

  const handleEditOpen = (item) => {
    setEditForm({ id: item.id, title: item.title, content: item.content, category: item.category });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) return;
    if (!window.confirm('수정 내용을 저장할까요?')) return;
    await updateDoc(doc(db, 'bucketlists', editForm.id), {
      title: editForm.title,
      content: editForm.content,
      category: editForm.category,
    });
    setBucketList(list =>
      list.map(item =>
        item.id === editForm.id
          ? { ...item, title: editForm.title, content: editForm.content, category: editForm.category }
          : item
      )
    );
    setShowEditModal(false);
  };

  const formatBucketDate = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'yy.MM.dd');
  };

  const filteredList = bucketList.filter(item => showCompleted ? item.completed : !item.completed);

  return (
    <div className="bucket-container">
      <div className="bucket-header">
        <h1 className="bucket-title">버킷리스트</h1>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          <span className="add-icon">＋</span> 추가
        </button>
      </div>
      <div className="bucket-toolbar">
        <div className="category-tabs">
          {CATEGORY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`cat-tab${filterCategory === opt.value ? ' active' : ''}`}
              onClick={() => setFilterCategory(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bucket-toggle">
        <button className={`toggle-btn${!showCompleted ? ' active' : ''}`} onClick={() => setShowCompleted(false)}>미완료</button>
        <button className={`toggle-btn${showCompleted ? ' active' : ''}`} onClick={() => setShowCompleted(true)}>완료</button>
      </div>
      <ul className="bucket-list">
        {filteredList.length === 0 && <li className="bucket-empty">리스트가 없습니다.</li>}
        {filteredList.map(item => (
          <li className={`bucket-item ${item.category}`} key={item.id}>
            <label className="bucket-checkbox">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => item.completed ? handleUncheck(item.id) : handleCheck(item.id)}
              />
              <span className="checkbox-custom"></span>
            </label>
            <span className="bucket-category-dot"></span>
            <span className="bucket-title-text">{item.title}</span>
            <span className="bucket-date">
              {item.completed && item.completedAt ? `(${formatBucketDate(item.completedAt)})` : ''}
            </span>
            <button className="bucket-edit-btn" onClick={() => handleEditOpen(item)}>✏️</button>
            <button className="bucket-delete-btn" onClick={() => handleDelete(item.id)}>🗑️</button>
          </li>
        ))}
      </ul>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>새 버킷리스트 추가</h2>
            <input className="modal-input" placeholder="제목" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="modal-textarea" placeholder="내용" value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            <div className="radio-group bucket-category-radio-group">
              {['food', 'place', 'date'].map((cat, i) => (
                <div className="radio-option" key={cat}>
                  <input type="radio" id={cat} name="bucket-category" value={cat}
                    checked={form.category === cat} onChange={() => setForm(f => ({ ...f, category: cat }))} />
                  <label htmlFor={cat} className={`radio-label bucket-${cat}`}>
                    {['음식', '여행', '데이트'][i]}
                  </label>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="modal-btn" onClick={handleAdd}>추가</button>
              <button className="modal-btn cancel" onClick={() => setShowAddModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {showDateModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>완료 날짜 선택</h2>
            <input className="modal-input" type="date" value={tempDate}
              onChange={e => setTempDate(e.target.value)} />
            <div className="modal-actions">
              <button className="modal-btn" disabled={!tempDate} onClick={handleComplete}>확인</button>
              <button className="modal-btn cancel" onClick={() => setShowDateModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>버킷리스트 수정</h2>
            <input className="modal-input" placeholder="제목" value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            <textarea className="modal-textarea" placeholder="내용" value={editForm.content}
              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))} />
            <div className="radio-group bucket-category-radio-group">
              {['food', 'place', 'date'].map((cat, i) => (
                <div className="radio-option" key={cat}>
                  <input type="radio" id={`edit-${cat}`} name="edit-bucket-category" value={cat}
                    checked={editForm.category === cat} onChange={() => setEditForm(f => ({ ...f, category: cat }))} />
                  <label htmlFor={`edit-${cat}`} className={`radio-label bucket-${cat}`}>
                    {['음식', '여행', '데이트'][i]}
                  </label>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="modal-btn" onClick={handleEditSave}>저장</button>
              <button className="modal-btn cancel" onClick={() => setShowEditModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BucketListPage;
