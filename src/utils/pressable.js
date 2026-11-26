// src/utils/pressable.js
// 누를 수 있는 div·카드를 키보드·화면 읽기 프로그램에서도 버튼으로(AUDIT A-1).
// <div {...pressable(() => navigate('/x'))}> — role="button", 탭으로 이동, Enter·Space로 실행.
// 카드 안에 진짜 버튼이 있으면 그 버튼의 키 입력은 가로채지 않음(e.target === e.currentTarget일 때만).
export const pressable = (onActivate) => ({
  role: 'button',
  tabIndex: 0,
  onClick: onActivate,
  onKeyDown: (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(e);
    }
  },
});
