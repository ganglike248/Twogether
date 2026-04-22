import React from 'react';
import { MdRestaurant, MdPublic, MdFavoriteBorder } from 'react-icons/md';

const CATEGORIES = [
  { value: 'food', label: '음식', icon: MdRestaurant },
  { value: 'place', label: '여행', icon: MdPublic },
  { value: 'date', label: '데이트', icon: MdFavoriteBorder },
];

function CategorySelector({ value, onChange, name = 'category' }) {
  return (
    <div className="bucket-category-selector">
      <label className="bucket-selector-label">카테고리</label>
      <div className="bucket-category-options">
        {CATEGORIES.map((cat) => (
          <div className="bucket-category-option" key={cat.value}>
            <input
              type="radio"
              id={`${name}-${cat.value}`}
              name={name}
              value={cat.value}
              checked={value === cat.value}
              onChange={() => onChange(cat.value)}
            />
            <label htmlFor={`${name}-${cat.value}`} className={`bucket-category-label bucket-cat-${cat.value}`}>
              <cat.icon className="bucket-cat-emoji" />
              <span className="bucket-cat-text">{cat.label}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategorySelector;
