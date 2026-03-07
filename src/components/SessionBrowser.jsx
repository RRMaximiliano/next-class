import React, { useState, useRef } from 'react';
import { getSessions, deleteSession, getStorageUsage } from '../utils/sessionHistory';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { useFocusTrap } from '../utils/useFocusTrap';
import './SessionBrowser.css';

export const SessionBrowser = ({ isOpen, onClose, onSelectSession, showToast }) => {
  const [sessions, setSessions] = useState(() => getSessions(true));
  const [confirmDelete, setConfirmDelete] = useState(null);
  const modalRef = useRef(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const handleDeleteClick = (sessionId, fileName, e) => {
    e.stopPropagation();
    setConfirmDelete({ id: sessionId, fileName });
  };

  const handleDeleteConfirm = () => {
    if (confirmDelete) {
      deleteSession(confirmDelete.id);
      setSessions(getSessions(true));
      setConfirmDelete(null);
      showToast?.('Session deleted', 'success');
    }
  };

  const handleSelect = (session) => {
    onSelectSession({
      name: session.fileName,
      content: session.rawTranscript,
      date: session.date,
      sessionId: session.id
    });
    onClose();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle Escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="session-browser-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="session-browser-modal" ref={modalRef}>
        <div className="session-browser-header">
          <h3>Saved Sessions</h3>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close saved sessions">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="session-browser-body">
          {sessions.length === 0 ? (
            <EmptyState
              icon="📂"
              title="No saved sessions yet"
              description="Upload a transcript to create your first session."
            />
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="session-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(session)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(session); } }}
                >
                  <div className="session-info">
                    <div className="session-name">{session.fileName}</div>
                    <div className="session-meta">
                      <span className="session-date">{formatDate(session.date)}</span>
                      <span className="session-stats">
                        {formatDuration(session.stats?.totalDuration)} ·
                        {session.stats?.teacherTalkPercent || 0}% instructor ·
                        {session.stats?.questionCount || 0} questions
                      </span>
                    </div>
                  </div>
                  <div className="session-actions">
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteClick(session.id, session.fileName, e)}
                      aria-label={`Delete session ${session.fileName}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="session-browser-footer">
          <span className="session-count">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            {(() => {
              const usage = getStorageUsage();
              if (usage.percentUsed >= 80) {
                return <span className="storage-warning"> · Storage {usage.percentUsed}% full</span>;
              }
              return null;
            })()}
          </span>
          <button className="text-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete session?"
        message={confirmDelete ? `This will permanently delete "${confirmDelete.fileName}" and its data.` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
