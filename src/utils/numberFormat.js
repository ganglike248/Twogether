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

// 순수 숫자(콤마 포함) 문자열이면 콤마만 제거해서 반환, 그 외(기존 자유 텍스트 등)는 그대로 반환.
// 가격처럼 "숫자만 입력 강제"를 나중에 추가한 필드에, 이미 저장된 자유 텍스트 값을 건드리지
// 않으면서 새로 입력된 숫자 값만 정리해서 저장하기 위해 씀.
export const normalizeIfPureNumber = (value) => {
    const trimmed = (value || '').toString().trim();
    if (!trimmed) return '';
    return /^[\d,]+$/.test(trimmed) ? removeCommas(trimmed) : trimmed;
};

// 가격 표시용: 순수 숫자 값이면 콤마 포맷 + "원" 접미사를 붙여서 반환, 자유 텍스트로 저장된
// 기존 값(예: "₩150,000/박", "협의")은 손대지 않고 그대로 반환.
export const formatPriceDisplay = (value) => {
    const trimmed = (value || '').toString().trim();
    if (!trimmed) return '';
    return /^[\d,]+$/.test(trimmed) ? `${addCommas(removeCommas(trimmed))}원` : trimmed;
};
