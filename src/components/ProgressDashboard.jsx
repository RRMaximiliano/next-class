import React, { useState, useEffect, useRef } from 'react';
import { getSessions, deleteSession, getAverages, updateSessionDate, getIndexCards, addSessionTag, removeSessionTag, getAllTags } from '../utils/sessionHistory';
import { formatSessionsAsCSV, downloadAsFile } from '../utils/exportUtils';
import { IndexCard } from './IndexCard';
import './ProgressDashboard.css';

// Focus area labels for Level 2 cards
const FOCUS_LABELS = {
  questions: 'Instructor Questions',
  sensemaking: 'Connecting Ideas',
  time: 'Time Management'
};

// Predefined tag suggestions
const TAG_SUGGESTIONS = ['lecture', 'discussion', 'lab', 'seminar', 'workshop', 'review'];

export const ProgressDashboard = ({ onLoadSession, onClose, refreshKey }) => {
  const [sessions, setSessions] = useState([]);
  const [averages, setAverages] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [viewingCard, setViewingCard] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [editingTags, setEditingTags] = useState(null);
  const [newTagInput, setNewTagInput] = useState('');
  const chartRef = useRef(null);

  useEffect(() => {
    refreshData();
  }, [refreshKey]);

  const refreshData = () => {
    const sessionsData = getSessions();
    // Enrich sessions with their index cards
    const enrichedSessions = sessionsData.map(s => ({
      ...s,
      indexCards: getIndexCards(s.id)
    }));
    setSessions(enrichedSessions);
    setAverages(getAverages());
    setAllTags(getAllTags());
  };

  const handleExportCSV = () => {
    const csv = formatSessionsAsCSV(sessions);
    const filename = `teaching-sessions-${new Date().toISOString().split('T')[0]}.csv`;
    downloadAsFile(csv, filename, 'text/csv');
  };

  const handleAddTag = (sessionId) => {
    const tag = newTagInput.trim();
    if (tag) {
      addSessionTag(sessionId, tag);
      setNewTagInput('');
      refreshData();
    }
  };

  const handleRemoveTag = (sessionId, tag) => {
    removeSessionTag(sessionId, tag);
    refreshData();
  };

  const filteredSessions = tagFilter
    ? sessions.filter(s => (s.tags || []).includes(tagFilter))
    : sessions;

  const handleDeleteClick = (sessionId, fileName) => {
    setDeleteConfirm({ id: sessionId, fileName });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteSession(deleteConfirm.id);
      refreshData();
      setDeleteConfirm(null);
      setExpandedSession(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const handleReanalyze = (session) => {
    if (onLoadSession) {
      onLoadSession({
        name: session.fileName,
        content: session.rawTranscript,
        date: session.date,
        sessionId: session.id
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDateChange = (sessionId, newDate) => {
    updateSessionDate(sessionId, newDate);
    refreshData();
  };

  const handleDownloadChart = async () => {
    if (!chartRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `student-engagement-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading chart:', error);
    }
  };

  const toggleSession = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const getCardLabel = (card) => {
    if (card.level === 1 || card.level === '1') {
      return 'Main Feedback';
    }
    if (card.level === 2 || card.level === '2') {
      const focus = FOCUS_LABELS[card.focusArea] || card.focusArea || 'Deep Dive';
      return focus;
    }
    return 'Index Card';
  };

  const getCardLevelBadge = (card) => {
    if (card.level === 1 || card.level === '1') return 'L1';
    if (card.level === 2 || card.level === '2') return 'L2';
    return '';
  };

  return (
    <div className="progress-dashboard-v2">
      {/* Header */}
      <header className="pd-header">
        <div className="pd-header-content">
          <h1>Teaching Progress</h1>
          <p className="pd-subtitle">Track your growth across sessions</p>
        </div>
        <div className="pd-header-actions">
          {sessions.length > 0 && (
            <button className="pd-btn-subtle" onClick={handleExportCSV} aria-label="Export sessions as CSV">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1v8m0 0l-3-3m3 3l3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              CSV
            </button>
          )}
          {onClose && (
            <button className="pd-close" onClick={onClose} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="pd-empty">
          <div className="pd-empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="28" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 20h32M16 12V8M32 12V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="24" cy="30" r="4" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <h3>No sessions yet</h3>
          <p>Upload your first class transcript to start tracking your teaching journey.</p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          {averages && (
            <section className="pd-stats">
              <div className="pd-stats-grid">
                <div className="pd-stat">
                  <span className="pd-stat-value">{averages.sessionCount}</span>
                  <span className="pd-stat-label">Sessions</span>
                </div>
                <div className="pd-stat">
                  <span className="pd-stat-value">{averages.teacherTalkPercent}%</span>
                  <span className="pd-stat-label">Avg Instructor</span>
                </div>
                <div className="pd-stat">
                  <span className="pd-stat-value">{averages.studentTalkPercent}%</span>
                  <span className="pd-stat-label">Avg Student</span>
                </div>
                <div className="pd-stat">
                  <span className="pd-stat-value">{averages.questionCount}</span>
                  <span className="pd-stat-label">Avg Questions</span>
                </div>
              </div>
            </section>
          )}

          {/* Timeline Chart */}
          <section className="pd-chart-section" ref={chartRef}>
            <div className="pd-section-header">
              <h2>Student Engagement</h2>
              <button className="pd-btn-subtle" onClick={handleDownloadChart} aria-label="Export chart as image">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1v8m0 0l-3-3m3 3l3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export
              </button>
            </div>
            <div className="pd-chart">
              <div className="pd-chart-y">
                <span>100%</span>
                <span>50%</span>
                <span>0%</span>
              </div>
              <div className="pd-chart-area">
                <div className="pd-chart-bars">
                  {sessions.slice().reverse().map((session) => (
                    <div
                      key={session.id}
                      className="pd-bar-col"
                      data-value={`${session.stats?.studentTalkPercent || 0}%`}
                    >
                      <div
                        className="pd-bar"
                        style={{ height: `${session.stats?.studentTalkPercent || 0}%` }}
                      />
                      <span className="pd-bar-label">{formatDate(session.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {sessions.length < 3 && (
              <p className="pd-sparse-hint">Upload more sessions to see engagement trends.</p>
            )}
          </section>

          {/* Session Timeline */}
          <section className="pd-sessions">
            <div className="pd-sessions-header">
              <h2 className="pd-section-title">Session Timeline</h2>
              {/* Tag Filter */}
              {allTags.length > 0 && (
                <div className="pd-tag-filter">
                  <button
                    className={`pd-tag-btn ${!tagFilter ? 'active' : ''}`}
                    onClick={() => setTagFilter(null)}
                  >
                    All
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      className={`pd-tag-btn ${tagFilter === tag ? 'active' : ''}`}
                      onClick={() => setTagFilter(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pd-timeline">
              {filteredSessions.map((session, idx) => {
                const isExpanded = expandedSession === session.id;
                const hasCards = session.indexCards && session.indexCards.length > 0;

                return (
                  <article
                    key={session.id}
                    className={`pd-session ${isExpanded ? 'expanded' : ''}`}
                    style={{ '--delay': `${idx * 0.05}s` }}
                  >
                    {/* Session Header - Always Visible */}
                    <div className="pd-session-header" onClick={() => hasCards && toggleSession(session.id)}>
                      <label className="pd-session-date" onClick={(e) => e.stopPropagation()}>
                        <span className="pd-date-display">
                          {formatDate(session.date) || 'Set date'}
                        </span>
                        <input
                          type="date"
                          value={session.date || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleDateChange(session.id, e.target.value);
                          }}
                          className="pd-date-input-hidden"
                        />
                      </label>

                      <div className="pd-session-info">
                        <h3 className="pd-session-name">{session.fileName}</h3>
                        <div className="pd-session-meta">
                          <span className="pd-meta-item">
                            <span className="pd-meta-label">Instructor</span>
                            <span className="pd-meta-value">{session.stats?.teacherTalkPercent || 0}%</span>
                          </span>
                          <span className="pd-meta-item">
                            <span className="pd-meta-label">Student</span>
                            <span className="pd-meta-value">{session.stats?.studentTalkPercent || 0}%</span>
                          </span>
                          <span className="pd-meta-item">
                            <span className="pd-meta-label">Questions</span>
                            <span className="pd-meta-value">{session.stats?.questionCount || 0}</span>
                          </span>
                        </div>
                        {/* Session Tags */}
                        <div className="pd-session-tags" onClick={(e) => e.stopPropagation()}>
                          {(session.tags || []).map(tag => (
                            <span key={tag} className="pd-tag">
                              {tag}
                              <button
                                className="pd-tag-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTag(session.id, tag);
                                }}
                                aria-label={`Remove ${tag} tag`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {editingTags === session.id ? (
                            <div className="pd-tag-input-wrapper">
                              <input
                                type="text"
                                className="pd-tag-input"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag(session.id);
                                  } else if (e.key === 'Escape') {
                                    setEditingTags(null);
                                    setNewTagInput('');
                                  }
                                }}
                                placeholder="Add tag..."
                                autoFocus
                                list={`tag-suggestions-${session.id}`}
                              />
                              <datalist id={`tag-suggestions-${session.id}`}>
                                {TAG_SUGGESTIONS.filter(t => !(session.tags || []).includes(t)).map(t => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                              <button
                                className="pd-tag-save"
                                onClick={() => handleAddTag(session.id)}
                              >
                                Add
                              </button>
                              <button
                                className="pd-tag-cancel"
                                onClick={() => {
                                  setEditingTags(null);
                                  setNewTagInput('');
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              className="pd-tag-add"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTags(session.id);
                              }}
                            >
                              + Tag
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Index Card Badges */}
                      {hasCards && (
                        <div className="pd-card-badges">
                          {session.indexCards.map((card, i) => (
                            <span key={i} className={`pd-card-badge level-${card.level || 1}`}>
                              {getCardLevelBadge(card)}
                            </span>
                          ))}
                          <svg
                            className={`pd-expand-icon ${isExpanded ? 'expanded' : ''}`}
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                          >
                            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}

                      <div className="pd-session-actions">
                        <button
                          className="pd-btn-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReanalyze(session);
                          }}
                        >
                          Analyze
                        </button>
                        <button
                          className="pd-btn-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(session.id, session.fileName);
                          }}
                          aria-label="Delete session"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Index Cards */}
                    {isExpanded && hasCards && (
                      <div className="pd-session-cards">
                        <div className="pd-cards-header">
                          <h4>Saved Index Cards</h4>
                          <span className="pd-cards-count">{session.indexCards.length} card{session.indexCards.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="pd-cards-grid">
                          {session.indexCards.map((card, i) => (
                            <button
                              key={card.id || i}
                              className={`pd-card-preview level-${card.level || 1}`}
                              onClick={() => setViewingCard({ card, fileName: session.fileName })}
                            >
                              <div className="pd-card-preview-header">
                                <span className={`pd-card-level level-${card.level || 1}`}>
                                  {card.level === 1 || card.level === '1' ? 'Level 1' : 'Level 2'}
                                </span>
                                <span className="pd-card-type">{getCardLabel(card)}</span>
                              </div>
                              <div className="pd-card-preview-content">
                                <div className="pd-card-snippet">
                                  <strong>Keep:</strong> {card.keep?.substring(0, 60)}...
                                </div>
                                <div className="pd-card-snippet">
                                  <strong>Try:</strong> {Array.isArray(card.try) ? card.try[0]?.substring(0, 50) : card.try?.substring(0, 50)}...
                                </div>
                              </div>
                              <div className="pd-card-preview-footer">
                                <span className="pd-card-date">
                                  {card.savedAt ? new Date(card.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                </span>
                                <span className="pd-card-view">View Card →</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="pd-modal-overlay" onClick={handleDeleteCancel}>
          <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Session?</h3>
            <p>This will permanently delete "{deleteConfirm.fileName}" and all its index cards.</p>
            <div className="pd-modal-actions">
              <button className="pd-btn-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="pd-btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Index Card View Modal */}
      {viewingCard && (
        <div className="pd-modal-overlay" onClick={() => setViewingCard(null)}>
          <div className="pd-card-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-card-modal-header">
              <div>
                <h3>{viewingCard.fileName}</h3>
                <span className="pd-card-modal-level">
                  {viewingCard.card.level === 1 || viewingCard.card.level === '1' ? 'Level 1 • Main Feedback' : `Level 2 • ${getCardLabel(viewingCard.card)}`}
                </span>
              </div>
              <button className="pd-modal-close" onClick={() => setViewingCard(null)} aria-label="Close index card view">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <IndexCard
              data={viewingCard.card}
              isSaved={true}
              inline={true}
              level={viewingCard.card.level}
              focusArea={viewingCard.card.focusArea}
            />
          </div>
        </div>
      )}
    </div>
  );
};
