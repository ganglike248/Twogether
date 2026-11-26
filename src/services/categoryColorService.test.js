import { describe, it, expect } from 'vitest';
import { toPastelCategoryColor, getCategoryColor, getCategoryTextColor, getCategoryTextColorFor } from './categoryColorService';

describe('categoryColorService — 부드러운 팔레트', () => {
  it('예전 원색·중간 톤 저장값은 새 색으로', () => {
    expect(toPastelCategoryColor('#FF6B6B')).toBe('#FFDCD8');
    expect(toPastelCategoryColor('#FFA94D')).toBe('#FFE3C7');
    expect(toPastelCategoryColor('#123456')).toBe('#123456');
  });
  it('글자색은 배경과 짝', () => {
    expect(getCategoryColor('food', { food: { color: '#6CC57C', label: '음식' } })).toBe('#D5EFDA');
    expect(getCategoryTextColor('food', { food: { color: '#6CC57C', label: '음식' } })).toBe('#2E7844');
    expect(getCategoryTextColor('place', {})).toBe('#2F5E9C');
    expect(getCategoryTextColorFor('#336699')).toMatch(/^hsl\(210 /);
  });
});
