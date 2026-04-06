// 숫자에 천단위 콤마 추가
export const addCommas = (num) => {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 콤마 제거하여 숫자로 변환
export const removeCommas = (str) => {
    if (!str) return '';
    return str.toString().replace(/,/g, '');
};

// input용 숫자 포맷팅
export const formatInputNumber = (value) => {
    const numericValue = removeCommas(value);
    if (numericValue === '' || isNaN(numericValue)) return value;
    return addCommas(numericValue);
};
