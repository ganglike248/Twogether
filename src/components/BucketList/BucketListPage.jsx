// src/components/BucketList/BucketListPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { MdCheckCircle, MdRadioButtonUnchecked, MdAutoAwesome, MdCalendarToday, MdEdit, MdAdd, MdSettings } from 'react-icons/md';
import { Virtuoso } from 'react-virtuoso';
import '../BucketList/BucketListPage.css';
import './bucket-modal.css';
import BaseModal from './BaseModal';
import CategorySelector from './CategorySelector';
import CategoryManagerModal from './CategoryManagerModal';
import { DEFAULT_CATEGORIES, getCategoryColor, getCategoryDisplayName } from '../../services/categoryColorService';

const BucketItem = React.memo(({
  item,
  isCompleted,
  customCategories,
  onOpenEditModal,
  onOpenDateModal,
  onEditUncheck,
  formatBucketDate
}) => {
  const categoryColor = getCategoryColor(item.category, customCategories);
  const categoryDisplay = getCategoryDisplayName(item.category, customCategories);

  return (
    <div
      className={`bucket-item ${isCompleted ? 'completed' : ''}`}
      onClick={() => onOpenEditModal(item)}
      style={{ borderLeftColor: categoryColor }}
    >
      <label className="bucket-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => isCompleted ? onEditUncheck(item.id) : onOpenDateModal(item.id)}
        />
        {isCompleted ? (
          <MdCheckCircle className="checkbox-icon" style={{ color: categoryColor }} />
        ) : (
          <MdRadioButtonUnchecked className="checkbox-icon" style={{ color: categoryColor }} />
        )}
      </label>
      <span className="bucket-title-text">{item.title}</span>
      <span className="bucket-category-tag" style={{ backgroundColor: categoryColor }}>
        {categoryDisplay}
      </span>
      {isCompleted && item.completedAt && (
        <span className="bucket-completed-date">{formatBucketDate(item.completedAt)} 완료</span>
      )}
      {!isCompleted && item.createdAt && (
        <span className="bucket-created-date">{formatBucketDate(item.createdAt)} 생성</span>
      )}
    </div>
  );
});

BucketItem.displayName = 'BucketItem';

function BucketListPage() {
  const { coupleId } = useAuthContext();
  const [bucketList, setBucketList] = useState([]);
  const [customCategories, setCustomCategories] = useState({});
  const [filterCategory, setFilterCategory] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'all', label: '전체' }]);
  const [activeTab, setActiveTab] = useState('pending');

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

  // bucketList 실시간 구독
  useEffect(() => {
    if (!coupleId) return;

    const constraints = [where('coupleId', '==', coupleId)];
    if (filterCategory !== 'all') {
      constraints.push(where('category', '==', filterCategory));
    }

    const q = query(collection(db, 'bucketlists'), ...constraints);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBucketList(data);
    });
    return () => unsubscribe();
  }, [coupleId, filterCategory]);

  const handleOpenAddModal = () => {
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
      toast.error(`카테고리 저장에 실패했습니다.\n${error?.message || String(error)}`);
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
    await addDoc(collection(db, 'bucketlists'), newItem);
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
    closeModal();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'bucketlists', id));
  };

  const closeModal = () => {
    setModalState({ type: null, data: null });
    setCompletionDate('');
    setSelectedItemId(null);
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
    await updateDoc(doc(db, 'bucketlists', editForm.id), {
      title: editForm.title,
      content: editForm.content,
      category: editForm.category,
    });
    closeModal();
  };

  const handleEditComplete = () => {
    setSelectedItemId(editForm.id);
    setModalState({ type: 'date', data: 'from-edit' });
  };

  const handleEditUncheck = async (id = editForm.id) => {
    if (!window.confirm('완료를 취소하시겠습니까?')) return;
    await updateDoc(doc(db, 'bucketlists', id), { completed: false, completedAt: null });
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

  const pendingList = useMemo(() => {
    return bucketList
      .filter(item => !item.completed)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [bucketList]);

  const completedList = useMemo(() => {
    return bucketList
      .filter(item => item.completed)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  }, [bucketList]);

  const activeList = activeTab === 'pending' ? pendingList : completedList;

  const { completedCount, totalCount, completionPercentage } = useMemo(() => {
    const completed = bucketList.filter(item => item.completed).length;
    const total = bucketList.length;
    return {
      completedCount: completed,
      totalCount: total,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [bucketList]);

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

      <div className="bucket-tab-bar">
        <button
          className={`bucket-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          예정 <span className="bucket-tab-count">{pendingList.length}</span>
        </button>
        <button
          className={`bucket-tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          완료 <span className="bucket-tab-count">{completedList.length}</span>
        </button>
      </div>

      <div className="bucket-list">
        <div className="bucket-toolbar">
          <div className="category-tabs">
            {categoryOptions.map(opt => {
              const categoryColor = opt.value === 'all'
                ? '#FFD700'
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
        {activeList.length === 0 ? (
          <div className="bucket-empty">리스트가 없습니다.</div>
        ) : (
          <Virtuoso
            style={{ flex: 1 }}
            data={activeList}
            itemContent={(_, item) => (
              <BucketItem
                item={item}
                isCompleted={activeTab === 'completed'}
                customCategories={customCategories}
                onOpenEditModal={handleOpenEditModal}
                onOpenDateModal={handleOpenDateModal}
                onEditUncheck={handleEditUncheck}
                formatBucketDate={formatBucketDate}
              />
            )}
          />
        )}
      </div>

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
