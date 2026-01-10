import React, { useState, useEffect, useRef } from 'react';
import { getSessions, deleteSession, getAverages, updateSessionDate } from '../utils/sessionHistory';
import './ProgressDashboard.css';

export const ProgressDashboard = ({ onLoadSession, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [averages, setAverages] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, fileName }
  const chartRef = useRef(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setSessions(getSessions());
    setAverages(getAverages());
  };

  const handleDeleteClick = (sessionId, fileName) => {
    setDeleteConfirm({ id: sessionId, fileName });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteSession(deleteConfirm.id);
      refreshData();
      setDeleteConfirm(null);
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
    // Parse YYYY-MM-DD directly to avoid timezone shift
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  // Calculate trend indicator
  const getTrend = (current, average) => {
    if (!average || average === 0) return null;
    const diff = current - average;
    if (Math.abs(diff) < 2) return null; // Within 2% is neutral
    return diff > 0 ? 'up' : 'down';
  };

  // Download chart as PNG
  const handleDownloadChart = async () => {
    if (!chartRef.current) return;

    try {
      // Use html2canvas approach with canvas
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });

      const link = document.createElement('a');
      link.download = `student-engagement-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading chart:', error);
      alert('Could not download chart. Please try again.');
    }
  };

  // Handle inline date change
  const handleDateChange = (sessionId, newDate) => {
    updateSessionDate(sessionId, newDate);
    refreshData();
  };

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <h2>Your Teaching Progress</h2>
        {onClose && (
          <button className="close-dashboard" onClick={onClose}>×</button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="empty-dashboard">
          <div className="empty-icon">📊</div>
          <h3>No sessions yet</h3>
          <p>Upload your first class transcript to start tracking your teaching progress.</p>
        </div>
      ) : (
        <>
          {/* Averages Summary */}
          {averages && (
            <div className="averages-section">
              <h3>Your Averages ({averages.sessionCount} sessions)</h3>
              <div className="averages-grid">
                <div className="avg-stat">
                  <span className="avg-label">Teacher Talk</span>
                  <span className="avg-value">{averages.teacherTalkPercent}%</span>
                </div>
                <div className="avg-stat">
                  <span className="avg-label">Student Talk</span>
                  <span className="avg-value">{averages.studentTalkPercent}%</span>
                </div>
                <div className="avg-stat">
                  <span className="avg-label">Avg Questions</span>
                  <span className="avg-value">{averages.questionCount}</span>
                </div>
                <div className="avg-stat">
                  <span className="avg-label">Silence</span>
                  <span className="avg-value">{averages.silencePercent}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Chart */}
          <div className="timeline-section" ref={chartRef}>
            <div className="chart-header">
              <h3>Student Engagement Over Time</h3>
              <button className="btn-download-chart" onClick={handleDownloadChart} title="Download as PNG">
                ⬇ PNG
              </button>
            </div>
            <div className="chart-container">
              {/* Y-axis labels */}
              <div className="chart-y-axis">
                <span className="y-label">100%</span>
                <span className="y-label">50%</span>
                <span className="y-label">0%</span>
              </div>
              {/* Chart plot area with bars */}
              <div className="chart-plot-area">
                <div className="mini-chart">
                  {sessions.slice().reverse().map((session, idx) => (
                    <div
                      key={session.id}
                      className="chart-bar-wrapper"
                      data-tooltip={`${session.stats?.studentTalkPercent || 0}%`}
                    >
                      <div
                        className="chart-bar"
                        style={{ height: `${session.stats?.studentTalkPercent || 0}%` }}
                      />
                    </div>
                  ))}
                </div>
                {/* X-axis labels */}
                <div className="chart-x-axis">
                  {sessions.slice().reverse().map((session) => (
                    <span key={session.id} className="chart-label">{formatDate(session.date)}</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="chart-caption">Student talk percentage per session</p>
          </div>

          {/* Session List */}
          <div className="sessions-section">
            <h3>Session History</h3>
            <div className="sessions-list">
              {sessions.map((session) => (
                <div key={session.id} className="session-card">
                  <div className="session-main">
                    <input
                      type="date"
                      value={session.date || ''}
                      onChange={(e) => handleDateChange(session.id, e.target.value)}
                      className="session-date-input-inline"
                      title="Click to change session date"
                    />
                    <div className="session-filename">{session.fileName}</div>
                  </div>
                  <div className="session-stats">
                    <span className="stat-item">
                      <span className="stat-label">Teacher</span>
                      <span className="stat-value">
                        {session.stats?.teacherTalkPercent || 0}%
                        {averages && getTrend(session.stats?.teacherTalkPercent, averages.teacherTalkPercent) === 'up' && (
                          <span className="trend-down" title="Above your average">↑</span>
                        )}
                        {averages && getTrend(session.stats?.teacherTalkPercent, averages.teacherTalkPercent) === 'down' && (
                          <span className="trend-up" title="Below your average">↓</span>
                        )}
                      </span>
                    </span>
                    <span className="stat-item">
                      <span className="stat-label">Student</span>
                      <span className="stat-value">
                        {session.stats?.studentTalkPercent || 0}%
                        {averages && getTrend(session.stats?.studentTalkPercent, averages.studentTalkPercent) === 'up' && (
                          <span className="trend-up" title="Above your average">↑</span>
                        )}
                        {averages && getTrend(session.stats?.studentTalkPercent, averages.studentTalkPercent) === 'down' && (
                          <span className="trend-down" title="Below your average">↓</span>
                        )}
                      </span>
                    </span>
                    <span className="stat-item">
                      <span className="stat-label">Questions</span>
                      <span className="stat-value">{session.stats?.questionCount || 0}</span>
                    </span>
                  </div>
                  <div className="session-actions">
                    <button
                      className="btn-session-action"
                      onClick={() => handleReanalyze(session)}
                      title="Re-analyze this session"
                    >
                      Analyze
                    </button>
                    <button
                      className="btn-session-delete"
                      onClick={() => handleDeleteClick(session.id, session.fileName)}
                      title="Delete from history"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Delete Session?</h4>
            <p>Are you sure you want to delete "{deleteConfirm.fileName}"? This cannot be undone.</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={handleDeleteCancel}>Cancel</button>
              <button className="btn-confirm-delete" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
