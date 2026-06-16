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
        syntheticBack = true;
        window.history.back();
      }
    };
  }, [isOpen]);
}
