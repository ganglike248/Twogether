import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { MdSettings, MdDelete, MdAdd } from 'react-icons/md';
import BaseModal from './BaseModal';
import { CATEGORY_COLORS, DEFAULT_CATEGORIES, getCategoryDisplayName } from '../../services/categoryColorService';
import './category-manager-modal.css';

function CategoryManagerModal({ isOpen, onClose, customCategories = {}, onSave }) {
  const [isAddMode, setIsAddMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0].hex);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editColor, setEditColor] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
  const isDefaultCategory = (key) => key in DEFAULT_CATEGORIES;

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('카테고리명을 입력해주세요.');
      return;
    }

    if (newCategoryName in allCategories) {
      toast.error('이미 존재하는 카테고리명입니다.');
      return;
    }

    const updatedCategories = {
      ...customCategories,
      [newCategoryName]: { color: newCategoryColor }
    };

    await onSave(updatedCategories);
    setNewCategoryName('');
    setNewCategoryColor(CATEGORY_COLORS[0].hex);
    setIsAddMode(false);
  };

  const handleSaveEdit = async () => {
    if (!editColor) return;

    const updatedCategories = {
      ...customCategories,
      [editingCategory]: { color: editColor }
    };

    await onSave(updatedCategories);
    setEditingCategory(null);
    setEditColor('');
  };

  const handleDeleteCategory = (categoryKey) => {
    setCategoryToDelete(categoryKey);
    setShowDeleteModal(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const updatedCategories = { ...customCategories };
    delete updatedCategories[categoryToDelete];
    await onSave(updatedCategories);
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const handleCloseModal = () => {
    setIsAddMode(false);
    setNewCategoryName('');
    setNewCategoryColor(CATEGORY_COLORS[0].hex);
    setEditingCategory(null);
    setEditColor('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="카테고리 관리"
      icon={MdSettings}
      className="category-manager-modal"
    >
      <div className="category-manager-list">
        {Object.entries(allCategories).map(([categoryKey, categoryData]) => {
          const displayName = getCategoryDisplayName(categoryKey, customCategories);
          return (
            <div key={categoryKey} className="category-manager-item">
              {editingCategory === categoryKey ? (
                <div className="category-edit-form">
                  <input
                    type="text"
                    value={displayName}
                    disabled
                    className="category-name-input disabled"
                  />
                  <div className="category-color-picker">
                    {CATEGORY_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.hex}
                        className={`color-option ${editColor === colorOption.hex ? 'selected' : ''}`}
                        style={{ backgroundColor: colorOption.hex }}
                        onClick={() => setEditColor(colorOption.hex)}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                  <div className="category-edit-actions">
                    <button
                      className="btn-save"
                      onClick={handleSaveEdit}
                      disabled={!editColor}
                    >
                      저장
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => setEditingCategory(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="category-color-circle"
                    style={{ backgroundColor: categoryData.color }}
                  />
                  <span className="category-name">{displayName}</span>
                  <button
                    className="btn-edit"
                    onClick={() => {
                      setEditingCategory(categoryKey);
                      setEditColor(categoryData.color);
                    }}
                  >
                    색상변경
                  </button>
                  {!isDefaultCategory(categoryKey) && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteCategory(categoryKey)}
                    >
                      <MdDelete />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {isAddMode ? (
        <div className="category-add-form">
          <input
            type="text"
            placeholder="새 카테고리명"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="category-name-input"
            autoFocus
          />
          <div className="category-color-picker">
            {CATEGORY_COLORS.map((colorOption) => (
              <button
                key={colorOption.hex}
                className={`color-option ${newCategoryColor === colorOption.hex ? 'selected' : ''}`}
                style={{ backgroundColor: colorOption.hex }}
                onClick={() => setNewCategoryColor(colorOption.hex)}
                title={colorOption.name}
              />
            ))}
          </div>
          <div className="category-add-actions">
            <button
              className="btn-add"
              onClick={handleAddCategory}
            >
              추가
            </button>
            <button
              className="btn-cancel"
              onClick={() => setIsAddMode(false)}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn-add-category"
          onClick={() => setIsAddMode(true)}
        >
          <MdAdd /> 새 카테고리 추가
        </button>
      )}

      {/* 카테고리 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="category-delete-modal-overlay" onClick={() => { setShowDeleteModal(false); setCategoryToDelete(null); }}>
          <div className="category-delete-modal" onClick={e => e.stopPropagation()}>
            <p className="category-delete-modal-title">카테고리 삭제</p>
            <p className="category-delete-modal-msg">
              '{getCategoryDisplayName(categoryToDelete, customCategories)}'을(를) 삭제하시겠습니까?
            </p>
            <div className="category-delete-modal-actions">
              <button
                className="category-delete-modal-btn cancel"
                onClick={() => { setShowDeleteModal(false); setCategoryToDelete(null); }}
              >
                취소
              </button>
              <button
                className="category-delete-modal-btn delete"
                onClick={confirmDeleteCategory}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
}

export default CategoryManagerModal;
