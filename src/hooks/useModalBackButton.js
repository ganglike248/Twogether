import { useEffect, useRef } from 'react';

// Module-level LIFO handler stack and global listener — shared across all modal instances.
// Only one popstate listener is ever registered at a time.
const modalHandlers = [];
let syntheticBack = false;

function handleGlobalPopState() {
  if (syntheticBack) {
    // This popstate was triggered by our own history.back() cleanup call — ignore it.
    syntheticBack = false;
    if (modalHandlers.length === 0) {
      window.removeEventListener('popstate', handleGlobalPopState);
    }
    return;
  }

  if (modalHandlers.length > 0) {
    const handler = modalHandlers[modalHandlers.length - 1];
    modalHandlers.pop();
    handler();
    if (modalHandlers.length === 0) {
      window.removeEventListener('popstate', handleGlobalPopState);
    }
  }
}

/**
 * Intercepts the Android/browser back button while a modal is open.
 * - Modal opens  → pushes a dummy history entry so back-navigation hits this hook first.
 * - Back button  → pops the dummy entry and calls onClose instead of navigating away.
 * - Normal close → calls history.back() to remove the dummy entry silently.
 *
 * Stacked modals (e.g. DayModal + EventModal) work correctly:
 * each back press closes only the topmost modal.
 */
export function useModalBackButton(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handler = () => onCloseRef.current();

    if (modalHandlers.length === 0) {
      window.addEventListener('popstate', handleGlobalPopState);
    }
    modalHandlers.push(handler);
    window.history.pushState({ modal: true }, '');

    return () => {
      const idx = modalHandlers.lastIndexOf(handler);
      if (idx !== -1) {
        // Modal was closed by something other than the back button (X, overlay click, etc.)
        // Remove from stack and silently pop the dummy history entry.
        modalHandlers.splice(idx, 1);
        syntheticBack = true;
        window.history.back();
        // The global listener will remove itself once syntheticBack is consumed.
      }
      // If idx === -1: already removed by handleGlobalPopState (back button was used).
    };
  }, [isOpen]);
}
