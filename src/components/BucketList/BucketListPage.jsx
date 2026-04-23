// src/components/BucketList/BucketListPage.jsx
import React, { useEffect, useState } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { MdCheckCircle, MdRadioButtonUnchecked, MdAutoAwesome, MdCalendarToday, MdEdit, MdAdd, MdSettings } from 'react-icons/md';
import '../BucketList/BucketListPage.css';
import './bucket-modal.css';
import BaseModal from './BaseModal';
import CategorySelector from './CategorySelector';
import CategoryManagerModal from './CategoryManagerModal';
import { DEFAULT_CATEGORIES, getCategoryColor, getCategoryDisplayName } from '../../services/categoryColorService';

function BucketListPage() {
  const { coupleId } = useAuthContext();
  const [bucketList, setBucketList] = useState([]);
  const [customCategories, setCustomCategories] = useState({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'all', label: '전체' }]);

  // 모달 상태 통합 관리
  const [modalState, setModalState] = useState({ type: null, data: null });

  // 모달 타입별 폼 데이터
  const [addForm, setAddForm] = useState({ title: '', content: '', category: 'food' });
  const [editForm, setEditForm] = useState({ id: '', title: '', content: '', category: 'food', completed: false, completedAt: null });
  const [completionDate, setCompletionDate] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);

  // customCategories 로드 및 categoryOptions 업데이트
  useEffect(() => {
    if (!coupleId) return;
    const loadCategories = async () => {
      try {
        const coupleDocRef = doc(db, 'couples', coupleId);
        const coupleDocSnap = await getDoc(coupleDocRef);
        const loadedCustomCategories = coupleDocSnap.data()?.customCategories || {};
        setCustomCategories(loadedCustomCategories);

        // categoryOptions 업데이트
        const allCategories = { ...DEFAULT_CATEGORIES, ...loadedCustomCategories };
        const options = [
          { value: 'all', label: '전체' },
          ...Object.keys(allCategories).sort().map(key => ({
            value: key,
            label: getCategoryDisplayName(key)
          }))
        ];
        setCategoryOptions(options);
      } catch (error) {
        console.error('카테고리 로드 실패:', error);
      }
    };
    loadCategories();
  }, [coupleId]);

  // bucketList 로드
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
  }, [coupleId, filterCategory]);

  const handleOpenAddModal = () => {
    // 첫 카테고리를 기본값으로 설정 (기본값: food 또는 첫 번째 카테고리)
    const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
    const firstCategory = Object.keys(allCategories).sort()[0] || 'food';
    setAddForm(f => ({ ...f, category: firstCategory }));
    setModalState({ type: 'add', data: null });
  };

  const handleOpenCategoryManager = () => {
    setModalState({ type: 'categoryManager', data: null });
  };

  const handleSaveCategories = async (updatedCategories) => {
    try {
      const coupleDocRef = doc(db, 'couples', coupleId);
      await updateDoc(coupleDocRef, { customCategories: updatedCategories });
      setCustomCategories(updatedCategories);

      // categoryOptions 업데이트
      const allCategories = { ...DEFAULT_CATEGORIES, ...updatedCategories };
      const options = [
        { value: 'all', label: '전체' },
        ...Object.keys(allCategories).sort().map(key => ({
          value: key,
          label: getCategoryDisplayName(key)
        }))
      ];
      setCategoryOptions(options);
    } catch (error) {
      console.error('카테고리 저장 실패:', error);
      alert('카테고리 저장에 실패했습니다.');
    }
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) return;
    const newItem = {
      title: addForm.title,
      content: addForm.content,
      category: addForm.category,
      coupleId,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'bucketlists'), newItem);
    setBucketList(list => [...list, { ...newItem, id: docRef.id }]);
    setAddForm({ title: '', content: '', category: 'food' });
    closeModal();
  };

  const handleOpenDateModal = (id) => {
    setSelectedItemId(id);
    setModalState({ type: 'date', data: null });
  };

  const handleCompleteWithDate = async () => {
    if (!selectedItemId || !completionDate) return;
    await updateDoc(doc(db, 'bucketlists', selectedItemId), {
      completed: true,
      completedAt: completionDate
    });
    setBucketList(list =>
      list.map(item =>
        item.id === selectedItemId
          ? { ...item, completed: true, completedAt: completionDate }
          : item
      )
    );
    closeModal();
  };

  const handleUncheck = async (id) => {
    if (!window.confirm('완료를 취소하시겠습니까?')) return;
    await updateDoc(doc(db, 'bucketlists', id), { completed: false, completedAt: null });
    setBucketList(list =>
      list.map(item => item.id === id ? { ...item, completed: false, completedAt: null } : item)
    );
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'bucketlists', id));
    setBucketList(list => list.filter(item => item.id !== id));
  };

  const closeModal = () => {
    setModalState({ type: null, data: null });
    setCompletionDate('');
    setSelectedItemId(null);
    // 카테고리 추가 후 폼 초기화
    const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
    const firstCategory = Object.keys(allCategories).sort()[0] || 'food';
    setAddForm(f => ({ ...f, category: firstCategory }));
  };

  const handleOpenEditModal = (item) => {
    setEditForm({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      completed: item.completed,
      completedAt: item.completedAt
    });
    setModalState({ type: 'edit', data: item });
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
    closeModal();
  };

  const handleEditComplete = () => {
    setSelectedItemId(editForm.id);
    setModalState({ type: 'date', data: 'from-edit' });
  };

  const handleEditUncheck = async (id = editForm.id) => {
    if (!window.confirm('완료를 취소하시겠습니까?')) return;
    await updateDoc(doc(db, 'bucketlists', id), { completed: false, completedAt: null });
    setBucketList(list =>
      list.map(item => item.id === id ? { ...item, completed: false, completedAt: null } : item)
    );
    if (modalState.type === 'edit') {
      closeModal();
    }
  };

  const handleEditDelete = () => {
    if (!window.confirm('정말 삭제할까요?')) return;
    handleDelete(editForm.id);
    closeModal();
  };

  const formatBucketDate = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'yy.MM.dd');
  };

  const completedCount = bucketList.filter(item => item.completed).length;
  const totalCount = bucketList.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bucket-container">
      <div className="bucket-achievement">
        <div className="achievement-left">
          <p className="achievement-label">달성률</p>
          <p className="achievement-percentage">{completionPercentage}%</p>
          <div className="achievement-bar">
            <div className="achievement-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
        <div className="achievement-right">
          <p className="achievement-count">{completedCount} / {totalCount}</p>
          <p className="achievement-subtitle">달성 완료</p>
        </div>
      </div>

      <div className="bucket-add-wrapper">
        <button className="bucket-add-top" onClick={handleOpenAddModal}>
          <MdAdd className="add-icon" /> 새로운 버킷 추가
        </button>
      </div>

      <ul className="bucket-list">
        <div className="bucket-toolbar">
          <div className="category-tabs">
            {categoryOptions.map(opt => {
              const categoryColor = opt.value === 'all'
                ? '#FFD700' // 전체는 노란색
                : getCategoryColor(opt.value, customCategories);
              return (
                <button
                  key={opt.value}
                  className={`cat-tab ${filterCategory === opt.value ? 'active' : ''}`}
                  onClick={() => setFilterCategory(opt.value)}
                  style={{ backgroundColor: categoryColor }}
                >
                  {opt.label}
                </button>
              );
            })}
            <button
              className="cat-tab-manage"
              onClick={handleOpenCategoryManager}
              title="카테고리 관리"
            >
              <MdSettings />
            </button>
          </div>
        </div>
        {bucketList.length === 0 ? (
          <li className="bucket-empty">리스트가 없습니다.</li>
        ) : (
          <>
            {(() => {
              const pending = bucketList.filter(item => !item.completed).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              const completed = bucketList.filter(item => item.completed).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
              return (
                <>
                  {pending.length > 0 && (
                    <>
                      <li className="bucket-section-title">예정</li>
                      {pending.map(item => {
                        const categoryColor = getCategoryColor(item.category, customCategories);
                        const categoryDisplay = getCategoryDisplayName(item.category);
                        return (
                          <li
                            className="bucket-item"
                            key={item.id}
                            onClick={() => handleOpenEditModal(item)}
                            style={{ borderLeftColor: categoryColor }}
                          >
                            <label className="bucket-checkbox" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleOpenDateModal(item.id)}
                              />
                              <MdRadioButtonUnchecked
                                className="checkbox-icon"
                                style={{ color: categoryColor }}
                              />
                            </label>
                            <span className="bucket-title-text">{item.title}</span>
                            <span
                              className="bucket-category-tag"
                              style={{ backgroundColor: categoryColor }}
                            >
                              {categoryDisplay}
                            </span>
                            {item.createdAt && (
                              <span className="bucket-created-date">{formatBucketDate(item.createdAt)}</span>
                            )}
                          </li>
                        );
                      })}
                    </>
                  )}
                  {completed.length > 0 && (
                    <>
                      <li className="bucket-section-title">완료</li>
                      {completed.map(item => {
                        const categoryColor = getCategoryColor(item.category, customCategories);
                        const categoryDisplay = getCategoryDisplayName(item.category);
                        return (
                          <li
                            className="bucket-item completed"
                            key={item.id}
                            onClick={() => handleOpenEditModal(item)}
                            style={{ borderLeftColor: categoryColor }}
                          >
                            <label className="bucket-checkbox" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => handleEditUncheck(item.id)}
                              />
                              <MdCheckCircle
                                className="checkbox-icon"
                                style={{ color: categoryColor }}
                              />
                            </label>
                            <span className="bucket-title-text">{item.title}</span>
                            <span
                              className="bucket-category-tag"
                              style={{ backgroundColor: categoryColor }}
                            >
                              {categoryDisplay}
                            </span>
                            {item.completedAt && (
                              <span className="bucket-completed-date">{formatBucketDate(item.completedAt)} 완료</span>
                            )}
                          </li>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}
      </ul>

      {/* 추가 모달 */}
      <BaseModal
        isOpen={modalState.type === 'add'}
        onClose={closeModal}
        title="새로운 버킷 추가"
        icon={MdAutoAwesome}
      >
        <input
          className="bucket-modal-input"
          placeholder="제목"
          value={addForm.title}
          onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="bucket-modal-textarea"
          placeholder="내용 (선택사항)"
          value={addForm.content}
          onChange={e => setAddForm(f => ({ ...f, content: e.target.value }))}
        />
        <CategorySelector
          value={addForm.category}
          onChange={(cat) => setAddForm(f => ({ ...f, category: cat }))}
          name="add-category"
          customCategories={customCategories}
        />
        <div className="bucket-modal-actions">
          <div className="bucket-modal-actions-primary">
            <button
              className="bucket-modal-btn bucket-modal-btn-primary"
              onClick={handleAdd}
            >
              추가하기
            </button>
            <button
              className="bucket-modal-btn bucket-modal-btn-cancel"
              onClick={closeModal}
            >
              취소
            </button>
          </div>
        </div>
      </BaseModal>

      {/* 날짜 선택 모달 */}
      <BaseModal
        isOpen={modalState.type === 'date'}
        onClose={closeModal}
        title="완료 날짜"
        icon={MdCalendarToday}
      >
        <input
          className="bucket-modal-input"
          type="date"
          value={completionDate}
          onChange={e => setCompletionDate(e.target.value)}
        />
        <div className="bucket-modal-actions">
          <div className="bucket-modal-actions-primary">
            <button
              className="bucket-modal-btn bucket-modal-btn-complete"
              disabled={!completionDate}
              onClick={handleCompleteWithDate}
            >
              완료
            </button>
            <button
              className="bucket-modal-btn bucket-modal-btn-cancel"
              onClick={closeModal}
            >
              취소
            </button>
          </div>
        </div>
      </BaseModal>

      {/* 카테고리 관리 모달 */}
      <CategoryManagerModal
        isOpen={modalState.type === 'categoryManager'}
        onClose={closeModal}
        customCategories={customCategories}
        onSave={handleSaveCategories}
      />

      {/* 편집 모달 */}
      <BaseModal
        isOpen={modalState.type === 'edit'}
        onClose={closeModal}
        title="버킷 상세"
        icon={MdEdit}
      >
        <label className="bucket-selector-label">제목</label>
        <input
          className="bucket-modal-input"
          placeholder="제목"
          value={editForm.title}
          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
        />
        <label className="bucket-selector-label">내용</label>
        <textarea
          className="bucket-modal-textarea"
          placeholder="내용"
          value={editForm.content}
          onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
        />
        <CategorySelector
          value={editForm.category}
          onChange={(cat) => setEditForm(f => ({ ...f, category: cat }))}
          name="edit-category"
          customCategories={customCategories}
        />
        {editForm.completedAt && (
          <div className="bucket-modal-completed-badge">
            <span className="bucket-modal-completed-badge-icon">✓</span>
            <span className="bucket-modal-completed-badge-text">
              {formatBucketDate(editForm.completedAt)} 완료
            </span>
          </div>
        )}
        <div className="bucket-modal-actions">
          <div className="bucket-modal-actions-primary">
            {!editForm.completed && (
              <button
                className="bucket-modal-btn bucket-modal-btn-complete"
                onClick={handleEditComplete}
              >
                완료
              </button>
            )}
            {editForm.completed && (
              <button
                className="bucket-modal-btn bucket-modal-btn-incomplete"
                onClick={() => handleEditUncheck(editForm.id)}
              >
                미완료
              </button>
            )}
            <button
              className="bucket-modal-btn bucket-modal-btn-delete"
              onClick={handleEditDelete}
            >
              삭제
            </button>
          </div>
          <div className="bucket-modal-actions-secondary">
            <button
              className="bucket-modal-btn bucket-modal-btn-save"
              onClick={handleEditSave}
            >
              저장
            </button>
            <button
              className="bucket-modal-btn bucket-modal-btn-cancel"
              onClick={closeModal}
            >
              닫기
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
}

export default BucketListPage;
