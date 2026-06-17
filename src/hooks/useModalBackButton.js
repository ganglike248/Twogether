import { useEffect, useRef } from 'react';

const modalHandlers = [];
let syntheticBack = false;
let listenerAdded = false;

function handleGlobalPopState() {
  if (syntheticBack) {
    syntheticBack = false;
    if (modalHandlers.length === 0) {
      window.removeEventListener('popstate', handleGlobalPopState);
      listenerAdded = false;
    }
    return;
  }

  if (modalHandlers.length > 0) {
    const handler = modalHandlers[modalHandlers.length - 1];
    modalHandlers.pop();
    handler();
    if (modalHandlers.length === 0) {
      window.removeEventListener('popstate', handleGlobalPopState);
      listenerAdded = false;
    }
  }
}

export function useModalBackButton(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handler = () => onCloseRef.current();

    if (!listenerAdded) {
      window.addEventListener('popstate', handleGlobalPopState);
      listenerAdded = true;
    }
    modalHandlers.push(handler);
    window.history.pushState({ modal: true }, '');

    return () => {
      const idx = modalHandlers.lastIndexOf(handler);
      if (idx !== -1) {
        modalHandlers.splice(idx, 1);
        if (window.history.state?.modal) {
          // 아직 modal 히스토리 항목에 있음 → 정상적으로 pop
          syntheticBack = true;
          window.history.back();
        } else {
          // navigate(replace)로 modal 항목이 이미 교체됨 → back() 불필요
          if (modalHandlers.length === 0 && listenerAdded) {
            window.removeEventListener('popstate', handleGlobalPopState);
            listenerAdded = false;
          }
        }
      }
    };
  }, [isOpen]);
}
