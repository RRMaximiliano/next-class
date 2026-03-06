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

// --- Journey Timeline Helpers ---

const isL1Complete = (s) => !!s.aiInteractions?.level1;
const isL2Complete = (s) => Object.keys(s.aiInteractions?.level2?.dataByFocus || {}).length > 0;
const isCoachingComplete = (s) => (s.aiInteractions?.coaching?.length || 0) > 0;

const getStudentTalkTrend = (sessions, idx) => {
  if (idx === 0) return null;
  const current = sessions[idx].stats?.studentTalkPercent || 0;
  const previous = sessions[idx - 1].stats?.studentTalkPercent || 0;
  return current - previous;
};

const computeMilestones = (sessions) => {
  const milestones = [];
  const count = sessions.length;

  // Count milestones — fire at 1, 3, 5, 10
  const countMilestones = [
    { at: 1, label: 'First session!', icon: 'star' },
    { at: 3, label: 'Building a habit', icon: 'fire' },
    { at: 5, label: 'Dedicated educator', icon: 'medal' },
    { at: 10, label: 'Teaching pro', icon: 'trophy' },
  ];
  for (const cm of countMilestones) {
    if (count >= cm.at) {
      milestones.push({ beforeIndex: cm.at - 1, label: cm.label, icon: cm.icon });
    }
  }

  // Streak: 3+ consecutive sessions with student talk > 50%
  let streak = 0;
  for (let i = 0; i < count; i++) {
    if ((sessions[i].stats?.studentTalkPercent || 0) > 50) {
      streak++;
      if (streak === 3) {
        milestones.push({ beforeIndex: i, label: 'Students finding their voice', icon: 'chat' });
      }
    } else {
      streak = 0;
    }
  }

  // Big leap: any session where student talk improved 10%+
  for (let i = 1; i < count; i++) {
    const diff = (sessions[i].stats?.studentTalkPercent || 0) - (sessions[i - 1].stats?.studentTalkPercent || 0);
    if (diff >= 10) {
      milestones.push({ beforeIndex: i, label: 'Big leap forward', icon: 'rocket' });
    }
  }

  return milestones;
};

const MilestoneIcon = ({ icon }) => {
  const icons = {
    star: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1l2.2 4.4 4.8.7-3.5 3.4.8 4.8L8 12l-4.3 2.3.8-4.8L1 6.1l4.8-.7L8 1z" fill="currentColor"/>
      </svg>
    ),
    fire: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1C6 4 4 5 4 8a4 4 0 008 0C12 5 10 4 8 1z" fill="currentColor"/>
      </svg>
    ),
    medal: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="9" r="4" fill="currentColor"/>
        <path d="M5 1l1 5h4l1-5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      </svg>
    ),
    trophy: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 2h8v4a4 4 0 01-8 0V2z" fill="currentColor"/>
        <path d="M4 4H2a2 2 0 002 2M12 4h2a2 2 0 01-2 2M7 10v2h2v-2M5 14h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    rocket: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1c-2 3-3 6-3 9l3-2 3 2c0-3-1-6-3-9z" fill="currentColor"/>
        <circle cx="8" cy="6" r="1.5" fill="var(--color-bg, #fff)"/>
      </svg>
    ),
    chat: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 3h12v8H6l-4 3V3z" fill="currentColor"/>
      </svg>
    ),
  };
  return icons[icon] || null;
};

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
  const [isExportingChart, setIsExportingChart] = useState(false);
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

  // Journey timeline: oldest-first order, milestones, milestone map
  const chronoSessions = filteredSessions.slice().reverse();
  const milestones = computeMilestones(chronoSessions);
  const milestoneMap = new Map();
  for (const m of milestones) {
    if (!milestoneMap.has(m.beforeIndex)) milestoneMap.set(m.beforeIndex, []);
    milestoneMap.get(m.beforeIndex).push(m);
  }

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
    setIsExportingChart(true);
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
    } catch {
      // Silently fail — chart export is optional
    } finally {
      setIsExportingChart(false);
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
              <button className="pd-btn-subtle" onClick={handleDownloadChart} disabled={isExportingChart} aria-label="Export chart as image">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1v8m0 0l-3-3m3 3l3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isExportingChart ? 'Exporting...' : 'Export'}
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

          {/* Journey Timeline */}
          <section className="pd-sessions">
            <div className="pd-sessions-header">
              <h2 className="pd-section-title">Your Teaching Journey</h2>
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

            <div className="pd-journey">
              <div className="pd-journey-rail">
                {chronoSessions.map((session, idx) => {
                  const isExpanded = expandedSession === session.id;
                  const hasCards = session.indexCards && session.indexCards.length > 0;
                  const hasAnyWork = isL1Complete(session) || isL2Complete(session) || isCoachingComplete(session);
                  const trend = getStudentTalkTrend(chronoSessions, idx);
                  const stopMilestones = milestoneMap.get(idx);
                  const isLast = idx === chronoSessions.length - 1;

                  return (
                    <React.Fragment key={session.id}>
                      {/* Milestone banner (if any fire at this index) */}
                      {stopMilestones && stopMilestones.map((m, mi) => (
                        <div key={mi} className="pd-milestone">
                          <span className="pd-milestone-badge">
                            <MilestoneIcon icon={m.icon} />
                            {m.label}
                          </span>
                        </div>
                      ))}

                      <div
                        className={`pd-stop ${isExpanded ? 'expanded' : ''}`}
                        style={{ '--delay': `${idx * 0.05}s` }}
                      >
                        {/* Left column: node circle + connector line */}
                        <div className="pd-stop-left">
                          <div className={`pd-node ${hasAnyWork ? 'pd-node--active' : 'pd-node--empty'}`}>
                            <span className="pd-node-num">{idx + 1}</span>
                          </div>
                          {!isLast && <div className="pd-connector" />}
                        </div>

                        {/* Right column: session card */}
                        <div className="pd-stop-card">
                          {/* Collapsed summary row — always visible */}
                          <div className="pd-stop-summary">
                            <button
                              className="pd-stop-summary-toggle"
                              onClick={() => toggleSession(session.id)}
                              aria-expanded={isExpanded}
                            >
                              <div className="pd-stop-summary-left">
                                <h3 className="pd-session-name">{session.fileName}</h3>
                                <div className="pd-stop-inline-meta">
                                  <span className="pd-inline-stat">{session.stats?.teacherTalkPercent || 0}% instr</span>
                                  <span className="pd-inline-sep">·</span>
                                  <span className="pd-inline-stat">{session.stats?.studentTalkPercent || 0}% student</span>
                                  <span className="pd-inline-sep">·</span>
                                  <span className="pd-inline-stat">{session.stats?.questionCount || 0} questions</span>
                                  {trend !== null && trend !== 0 && (
                                    <span className={`pd-trend ${trend > 0 ? 'pd-trend--up' : 'pd-trend--down'}`}>
                                      {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <svg
                                className={`pd-expand-icon ${isExpanded ? 'expanded' : ''}`}
                                width="14" height="14" viewBox="0 0 16 16" fill="none"
                                aria-hidden="true"
                              >
                                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
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
                          </div>

                          {/* Expanded detail section */}
                          {isExpanded && (
                            <div className="pd-stop-detail">
                              {/* Actions */}
                              <div className="pd-stop-detail-actions">
                                <div className="pd-session-actions">
                                  <button
                                    className="pd-btn-action"
                                    onClick={() => handleReanalyze(session)}
                                  >
                                    Analyze
                                  </button>
                                  <button
                                    className="pd-btn-delete"
                                    onClick={() => handleDeleteClick(session.id, session.fileName)}
                                    aria-label="Delete session"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                      <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              {/* Tags */}
                              <div className="pd-session-tags" onClick={(e) => e.stopPropagation()}>
                                {(session.tags || []).map(tag => (
                                  <span key={tag} className="pd-tag">
                                    {tag}
                                    <button
                                      className="pd-tag-remove"
                                      onClick={() => handleRemoveTag(session.id, tag)}
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
                                    <button className="pd-tag-save" onClick={() => handleAddTag(session.id)}>Add</button>
                                    <button className="pd-tag-cancel" onClick={() => { setEditingTags(null); setNewTagInput(''); }}>×</button>
                                  </div>
                                ) : (
                                  <button
                                    className="pd-tag-add"
                                    onClick={() => setEditingTags(session.id)}
                                  >
                                    + Tag
                                  </button>
                                )}
                              </div>

                              {/* Index cards */}
                              {hasCards && (
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
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Journey end cap */}
                {chronoSessions.length > 0 && (
                  <div className="pd-journey-end">
                    <div className="pd-stop-left">
                      <div className="pd-journey-end-dot" />
                    </div>
                    <span className="pd-journey-end-label">Keep going!</span>
                  </div>
                )}
              </div>
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
