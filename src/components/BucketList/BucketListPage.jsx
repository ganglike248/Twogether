// src/components/BucketList/BucketListPage.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { MdCheckCircle, MdRadioButtonUnchecked, MdAutoAwesome, MdCalendarToday, MdEdit, MdAdd, MdSettings } from 'react-icons/md';
import '../BucketList/BucketListPage.css';
import './bucket-modal.css';
import BaseModal from './BaseModal';
import CategorySelector from './CategorySelector';
import CategoryManagerModal from './CategoryManagerModal';
import WheelModal from '../Wheel/WheelModal';
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
  const [isWheelModalOpen, setIsWheelModalOpen] = useState(false);
  const [tabFilters, setTabFilters] = useState({ pending: 'all', completed: 'all' });
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태 통합 관리
  const [modalState, setModalState] = useState({ type: null, data: null });

  // 모달 타입별 폼 데이터
  const [addForm, setAddForm] = useState({ title: '', content: '', category: 'food' });
  const [editForm, setEditForm] = useState({ id: '', title: '', content: '', category: 'food', completed: false, completedAt: null });
  const [completionDate, setCompletionDate] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const scrollPositions = useRef({ pending: 0, completed: 0 });

  // customCategories 실시간 구독
  useEffect(() => {
    if (!coupleId) return;
    const coupleDocRef = doc(db, 'couples', coupleId);
    const unsubscribe = onSnapshot(coupleDocRef, (coupleDocSnap) => {
      try {
        const loadedCustomCategories = coupleDocSnap.data()?.customCategories || {};
        setCustomCategories(loadedCustomCategories);

        // categoryOptions 업데이트
        const allCategories = { ...DEFAULT_CATEGORIES, ...loadedCustomCategories };
        const options = [
          { value: 'all', label: '전체' },
          ...Object.keys(allCategories).sort().map(key => ({
            value: key,
            label: getCategoryDisplayName(key, loadedCustomCategories)
          }))
        ];
        setCategoryOptions(options);
      } catch (error) {
        console.error('카테고리 로드 실패:', error);
        toast.error('카테고리를 로드하는 중 오류가 발생했습니다.');
      }
    }, (error) => {
      console.error('카테고리 구독 실패:', error);
      toast.error('카테고리 데이터를 불러올 수 없습니다.');
    });
    return () => unsubscribe();
  }, [coupleId]);

  // bucketList 실시간 구독
  useEffect(() => {
    if (!coupleId) return;

    setIsLoading(true);
    const currentFilter = tabFilters[activeTab];
    const constraints = [where('coupleId', '==', coupleId)];
    if (currentFilter !== 'all') {
      constraints.push(where('category', '==', currentFilter));
    }

    const q = query(collection(db, 'bucketlists'), ...constraints);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBucketList(data);
      setIsLoading(false);
    }, (error) => {
      console.error('버킷리스트 로드 실패:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [coupleId, activeTab, tabFilters]);

  const getFirstCategory = () => {
    const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
    return Object.keys(allCategories).sort()[0] || 'food';
  };

  const isValidCategory = (category) => {
    const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
    return Object.keys(allCategories).includes(category);
  };

  const handleOpenAddModal = () => {
    const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
    const currentFilter = tabFilters[activeTab];
    // 필터된 카테고리가 있으면 그것을 기본값으로, 아니면 첫 번째 카테고리
    const defaultCategory = currentFilter !== 'all' ? currentFilter : getFirstCategory();
    setAddForm(f => ({ ...f, category: defaultCategory }));
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
          label: getCategoryDisplayName(key, updatedCategories)
        }))
      ];
      setCategoryOptions(options);
      toast.success('카테고리가 저장되었습니다.');
    } catch (error) {
      console.error('카테고리 저장 실패:', error);
      toast.error('카테고리 저장에 실패했습니다.');
    }
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) return;
    try {
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
      toast.success('버킷을 추가했습니다!');
      setAddForm({ title: '', content: '', category: getFirstCategory() });
      closeModal();
    } catch (error) {
      console.error('버킷 추가 실패:', error);
      toast.error('버킷 추가 중 오류가 발생했습니다.');
    }
  };

  const handleOpenDateModal = (id) => {
    setSelectedItemId(id);
    setCompletionDate(format(new Date(), 'yyyy-MM-dd')); // 오늘 날짜 기본값
    setModalState({ type: 'date', data: null });
  };

  const handleCompleteWithDate = async () => {
    if (!selectedItemId || !completionDate) return;

    // 날짜 검증: 미래 날짜 방지
    const selectedDateObj = new Date(completionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDateObj.setHours(0, 0, 0, 0);

    if (selectedDateObj > today) {
      toast.warning('미래 날짜는 선택할 수 없습니다');
      return;
    }

    try {
      await updateDoc(doc(db, 'bucketlists', selectedItemId), {
        completed: true,
        completedAt: completionDate
      });
      // 이미 완료된 항목의 날짜 수정인 경우
      if (modalState.data === 'from-edit' && editForm.completed) {
        toast.success('완료 날짜를 수정했습니다!');
      } else {
        toast.success('완료했습니다!');
      }
      closeModal();
    } catch (error) {
      console.error('버킷 완료 실패:', error);
      toast.error('버킷 완료 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'bucketlists', itemToDelete));
      setShowDeleteModal(false);
      setItemToDelete(null);
      if (modalState.type === 'edit') {
        closeModal();
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const closeModal = () => {
    setModalState({ type: null, data: null });
    setCompletionDate('');
    setSelectedItemId(null);
    setAddForm(f => ({ ...f, category: getFirstCategory() }));
  };

  const handleOpenEditModal = (item) => {
    // 카테고리가 유효하지 않으면 첫 번째 카테고리로 변경
    const validCategory = isValidCategory(item.category) ? item.category : getFirstCategory();
    setEditForm({
      id: item.id,
      title: item.title,
      content: item.content,
      category: validCategory,
      completed: item.completed,
      completedAt: item.completedAt
    });
    setModalState({ type: 'edit', data: item });
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) return;
    try {
      await updateDoc(doc(db, 'bucketlists', editForm.id), {
        title: editForm.title,
        content: editForm.content,
        category: editForm.category,
      });
      toast.success('수정했습니다!');
      closeModal();
    } catch (error) {
      console.error('버킷 수정 실패:', error);
      toast.error('버킷 수정 중 오류가 발생했습니다.');
    }
  };

  const handleEditComplete = () => {
    setSelectedItemId(editForm.id);
    setModalState({ type: 'date', data: 'from-edit' });
  };

  const handleEditUncheck = async (id = editForm.id) => {
    try {
      await updateDoc(doc(db, 'bucketlists', id), { completed: false, completedAt: null });
      if (modalState.type === 'edit') {
        closeModal();
      }
    } catch (error) {
      console.error('미완료 변경 실패:', error);
      toast.error('미완료 처리 중 오류가 발생했습니다.');
    }
  };

  const handleEditDelete = () => {
    setItemToDelete(editForm.id);
    setShowDeleteModal(true);
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
  const bucketListRef = useRef(null);

  // 탭 전환 시 스크롤 위치 저장 및 복원
  useEffect(() => {
    const currentElement = bucketListRef.current;
    if (!currentElement) return;

    // 현재 탭 스크롤 위치 저장
    const saveScroll = () => {
      scrollPositions.current[activeTab] = currentElement.scrollTop;
    };

    const handleScroll = () => {
      scrollPositions.current[activeTab] = currentElement.scrollTop;
    };

    currentElement.addEventListener('scroll', handleScroll);

    // 탭 복귀 시 스크롤 위치 복원
    const restoreScroll = () => {
      setTimeout(() => {
        if (currentElement) {
          currentElement.scrollTop = scrollPositions.current[activeTab] || 0;
        }
      }, 0);
    };

    restoreScroll();

    return () => {
      currentElement?.removeEventListener('scroll', handleScroll);
      saveScroll();
    };
  }, [activeTab]);

  const { completedCount, totalCount, completionPercentage } = useMemo(() => {
    const currentFilter = tabFilters[activeTab];
    const filteredBucketList = currentFilter === 'all'
      ? bucketList
      : bucketList.filter(item => item.category === currentFilter);

    const completed = filteredBucketList.filter(item => item.completed).length;
    const total = filteredBucketList.length;
    return {
      completedCount: completed,
      totalCount: total,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [bucketList, activeTab, tabFilters]);

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
        <button className="bucket-wheel-btn" onClick={() => setIsWheelModalOpen(true)} title="돌림판으로 선택">
          🎡
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

      <div className="bucket-list" ref={bucketListRef}>
        <div className="bucket-toolbar">
          <div className="category-tabs">
            {categoryOptions.map(opt => {
              const categoryColor = opt.value === 'all'
                ? '#FFD700'
                : getCategoryColor(opt.value, customCategories);
              const currentFilter = tabFilters[activeTab];
              return (
                <button
                  key={opt.value}
                  className={`cat-tab ${currentFilter === opt.value ? 'active' : ''}`}
                  onClick={() => setTabFilters(prev => ({ ...prev, [activeTab]: opt.value }))}
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
        {isLoading ? (
          <div className="bucket-loading">로딩 중...</div>
        ) : activeList.length === 0 ? (
          <div className="bucket-empty">
            {bucketList.length === 0 ? '리스트가 없습니다.' : '조건에 맞는 항목이 없습니다.'}
          </div>
        ) : (
          activeList.map(item => (
            <BucketItem
              key={item.id}
              item={item}
              isCompleted={activeTab === 'completed'}
              customCategories={customCategories}
              onOpenEditModal={handleOpenEditModal}
              onOpenDateModal={handleOpenDateModal}
              onEditUncheck={handleEditUncheck}
              formatBucketDate={formatBucketDate}
            />
          ))
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
          max={format(new Date(), 'yyyy-MM-dd')}
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

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="bucket-modal-overlay">
          <div className="bucket-modal-box">
            <p className="bucket-modal-title">항목 삭제</p>
            <p className="bucket-modal-msg">정말 삭제하시겠습니까?</p>
            <div className="bucket-modal-actions">
              <button
                className="bucket-modal-btn bucket-modal-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                취소
              </button>
              <button
                className="bucket-modal-btn bucket-modal-btn-delete"
                onClick={confirmDelete}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button
              className="bucket-modal-btn bucket-modal-btn-edit-date"
              onClick={() => {
                setSelectedItemId(editForm.id);
                setCompletionDate(editForm.completedAt);
                setModalState({ type: 'date', data: 'from-edit' });
              }}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', marginLeft: '0.5rem' }}
            >
              수정
            </button>
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

      {/* 돌림판 모달 */}
      <WheelModal
        isOpen={isWheelModalOpen}
        onClose={() => setIsWheelModalOpen(false)}
        bucketList={bucketList}
        customCategories={customCategories}
      />
    </div>
  );
}

export default BucketListPage;
