import { useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;
    const previouslyFocused = document.activeElement;

    // Focus the first focusable element
    const focusable = container.querySelectorAll(FOCUSABLE);
    if (focusable.length) focusable[0].focus();

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = container.querySelectorAll(FOCUSABLE);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously focused element
      previouslyFocused?.focus?.();
    };
  }, [ref, isActive]);
}
