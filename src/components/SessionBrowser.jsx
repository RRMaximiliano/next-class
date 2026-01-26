import React, { useState } from 'react';
import { getSessions, deleteSession } from '../utils/sessionHistory';
import './SessionBrowser.css';

export const SessionBrowser = ({ isOpen, onClose, onSelectSession }) => {
  const [sessions, setSessions] = useState(() => getSessions(true));
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!isOpen) return null;

  const handleDelete = (sessionId, e) => {
    e.stopPropagation();
    if (confirmDelete === sessionId) {
      deleteSession(sessionId);
      setSessions(getSessions(true));
      setConfirmDelete(null);
    } else {
      setConfirmDelete(sessionId);
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
    if (e.target.classList.contains('session-browser-overlay')) {
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
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <div className="session-browser-modal">
        <div className="session-browser-header">
          <h3>Saved Sessions</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="session-browser-body">
          {sessions.length === 0 ? (
            <div className="no-sessions">
              <p>No saved sessions yet.</p>
              <p className="hint">Upload a transcript to create your first session.</p>
            </div>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="session-item"
                  onClick={() => handleSelect(session)}
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
                      className={`delete-btn ${confirmDelete === session.id ? 'confirm' : ''}`}
                      onClick={(e) => handleDelete(session.id, e)}
                      title={confirmDelete === session.id ? 'Click again to confirm' : 'Delete session'}
                    >
                      {confirmDelete === session.id ? 'Confirm?' : '×'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="session-browser-footer">
          <span className="session-count">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
          <button className="text-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
