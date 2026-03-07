import React, { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default', // 'default' | 'danger'
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // Focus the dialog when it opens
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="confirm-dialog" ref={dialogRef} tabIndex={-1} role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <h3 id="confirm-title">{title}</h3>
        <p id="confirm-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`confirm-dialog-confirm ${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
