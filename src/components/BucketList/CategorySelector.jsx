import React from 'react';
import { getCategoryColor, getCategoryDisplayName, DEFAULT_CATEGORIES } from '../../services/categoryColorService';
import './category-selector.css';

function CategorySelector({ value, onChange, name = 'category', customCategories = {} }) {
  const allCategories = { ...DEFAULT_CATEGORIES, ...customCategories };
  const categoryNames = Object.keys(allCategories).sort();

  return (
    <div className="bucket-category-selector">
      <label className="bucket-selector-label">카테고리</label>
      <div className="bucket-category-options">
        {categoryNames.map((categoryKey) => {
          const color = getCategoryColor(categoryKey, customCategories);
          const displayName = getCategoryDisplayName(categoryKey);
          return (
            <div className="bucket-category-option" key={categoryKey}>
              <input
                type="radio"
                id={`${name}-${categoryKey}`}
                name={name}
                value={categoryKey}
                checked={value === categoryKey}
                onChange={() => onChange(categoryKey)}
              />
              <label
                htmlFor={`${name}-${categoryKey}`}
                className="bucket-category-label"
                style={{ '--category-color': color }}
              >
                <span
                  className="bucket-cat-color-dot"
                  style={{ backgroundColor: color }}
                />
                <span className="bucket-cat-text">{displayName}</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategorySelector;
