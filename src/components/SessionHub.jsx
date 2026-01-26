import React, { useState, useEffect } from 'react';
import { Dashboard } from './Dashboard';
import { GoDeeper } from './GoDeeper';
import './GoDeeper.css';
import { ProgressDashboard } from './ProgressDashboard';
import './ProgressDashboard.css';
import { SummarySkeleton } from './Skeleton';
import { Toast, useToast } from './Toast';
import { generateLectureSummary, generateIndexCard } from '../utils/llmService';
import { IndexCard } from './IndexCard';
import './IndexCard.css';
import { FollowUpChat } from './FollowUpChat';
import './FollowUpChat.css';
import { saveSession, getSessions, updateSessionStats, saveIndexCard, getIndexCard } from '../utils/sessionHistory';
import {
  formatSummaryAsMarkdown,
  copyToClipboard,
  downloadAsFile,
  printReport
} from '../utils/exportUtils';
import './SessionHub.css';

export const SessionHub = ({ analysis, fileName, sessionDate, sessionId, onReset, onDateChange, onLoadSession }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [aiSummary, setAiSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [selectedTeacher, setSelectedTeacher] = useState(null); // Track teacher selection
  const [indexCard, setIndexCard] = useState(null);
  const [isGeneratingIndexCard, setIsGeneratingIndexCard] = useState(false);
  const [isIndexCardSaved, setIsIndexCardSaved] = useState(false);
  // Track the last saved transcript hash to prevent duplicate saves
  const [lastSavedHash, setLastSavedHash] = useState(null);
  const { toast, showToast, hideToast } = useToast();

  // Simple hash function for transcript comparison
  const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 1000); i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  // Save session when analysis is loaded (only once per unique transcript)
  useEffect(() => {
    const transcriptHash = analysis?.rawTranscript ? hashString(analysis.rawTranscript) : null;

    if (analysis && fileName && transcriptHash && transcriptHash !== lastSavedHash) {
      // Check if this exact file already exists
      const existingSessions = getSessions();
      const alreadyExists = existingSessions.some(s =>
        s.fileName === fileName && s.rawTranscript === analysis.rawTranscript
      );

      if (!alreadyExists) {
        // Calculate stats from analysis - use 'speakers' array with 'role' property
        const teacherSpeaker = analysis.speakers?.find(s => s.role === 'Teacher');
        const studentSpeakers = analysis.speakers?.filter(s => s.role === 'Student') || [];
        const silenceSpeaker = analysis.speakers?.find(s => s.name === 'Activity/Silence' || s.name === 'Brief Pause');

        const stats = {
          totalDuration: analysis.totalDuration || 0,
          teacherTalkPercent: Math.round(teacherSpeaker?.percentage || 0),
          studentTalkPercent: Math.round(studentSpeakers.reduce((sum, s) => sum + (s.percentage || 0), 0)),
          questionCount: analysis.insights?.questions?.length || 0,
          silencePercent: Math.round(silenceSpeaker?.percentage || 0),
          speakerCount: analysis.speakers?.length || 0,
        };

        const savedSession = saveSession({
          id: sessionId,
          fileName,
          date: sessionDate,
          stats,
          rawTranscript: analysis.rawTranscript || '',
        });

        setCurrentSessionId(savedSession.id);
      }
      setLastSavedHash(transcriptHash);
    }
  }, [analysis, fileName, lastSavedHash]);

  // Load saved index card when session changes
  useEffect(() => {
    if (currentSessionId) {
      const savedCard = getIndexCard(currentSessionId);
      if (savedCard) {
        setIndexCard(savedCard);
        setIsIndexCardSaved(true);
      }
    }
  }, [currentSessionId]);

  // Handler for saving index card
  const handleSaveIndexCard = (cardData) => {
    if (currentSessionId && cardData) {
      saveIndexCard(currentSessionId, cardData);
      setIsIndexCardSaved(true);
      showToast('Index card saved to session!', 'success');
    }
  };

  // Handler for date change
  const handleDateChange = (e) => {
    if (onDateChange) {
      onDateChange(e.target.value);
    }
  };

  // Handler for teacher change - recalculates stats based on new teacher
  const handleTeacherChange = (newTeacherName, speakers) => {
    // Update local state to persist selection
    setSelectedTeacher(newTeacherName);

    if (!currentSessionId) return;

    // Find the new teacher and students in speakers array
    const teacherSpeaker = speakers.find(s => s.name === newTeacherName);
    const studentSpeakers = speakers.filter(s => s.name !== newTeacherName && s.role !== 'System');

    const newStats = {
      teacherTalkPercent: Math.round(teacherSpeaker?.percentage || 0),
      studentTalkPercent: Math.round(studentSpeakers.reduce((sum, s) => sum + (s.percentage || 0), 0)),
      selectedTeacher: newTeacherName, // Store teacher selection in session
    };

    updateSessionStats(currentSessionId, newStats);
  };

  // Export handlers
  const handleCopySummary = async () => {
    if (!aiSummary) return;
    const markdown = formatSummaryAsMarkdown(aiSummary, fileName);
    const success = await copyToClipboard(markdown);
    showToast(success ? 'Report copied to clipboard!' : 'Failed to copy', success ? 'success' : 'error');
  };

  const handleDownloadSummary = () => {
    if (!aiSummary) return;
    const markdown = formatSummaryAsMarkdown(aiSummary, fileName);
    const safeName = (fileName || 'session').replace(/\.[^/.]+$/, '');
    downloadAsFile(markdown, `${safeName}_summary.md`);
    showToast('Report downloaded!', 'success');
  };

  const handleGenerateSummary = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      setSummaryError('Please add your OpenAI API key in Settings to enable AI analysis.');
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryError(null);
    try {
      const result = await generateLectureSummary(analysis.rawTranscript, apiKey);
      setAiSummary(result);
    } catch (err) {
      const message = err.message.includes('rate')
        ? 'OpenAI rate limit reached. Please wait a moment and try again.'
        : err.message.includes('network') || err.message.includes('fetch')
          ? 'Connection error. Check your internet and try again.'
          : `Analysis failed: ${err.message}`;
      setSummaryError(message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateIndexCard = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      showToast('Please add your OpenAI API key in Settings.', 'error');
      return;
    }

    if (!aiSummary) {
      showToast('Please generate Main Feedback first.', 'error');
      return;
    }

    setIsGeneratingIndexCard(true);
    try {
      const result = await generateIndexCard(aiSummary, apiKey);
      setIndexCard(result);
      setIsIndexCardSaved(false); // Reset saved state for new card
    } catch (err) {
      showToast(`Failed to generate index card: ${err.message}`, 'error');
    } finally {
      setIsGeneratingIndexCard(false);
    }
  };

  return (
    <div className="session-hub fade-in">
      {/* ... Header ... */}
      <div className="hub-header">
        {/* ... (Header code remains from previous edit, just make sure to keep the tabs) ... */}
        <div className="hub-title-row">
          <h2>{fileName || 'Untitled Session'}</h2>
          <button className="text-btn" onClick={onReset}>← Upload New Session</button>
        </div>

        <div
          className="hub-tabs"
          role="tablist"
          onKeyDown={(e) => {
            const tabs = ['summary', 'feedback', 'anatomy', 'progress'];
            const currentIndex = tabs.indexOf(activeTab);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex]);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              setActiveTab(tabs[prevIndex]);
            }
          }}
        >
          <button
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
            role="tab"
            aria-selected={activeTab === 'summary'}
            tabIndex={activeTab === 'summary' ? 0 : -1}
          >Main Feedback</button>
          <button
            className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
            role="tab"
            aria-selected={activeTab === 'feedback'}
            tabIndex={activeTab === 'feedback' ? 0 : -1}
          >Go Deeper</button>
          <button
            className={`tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`}
            onClick={() => setActiveTab('anatomy')}
            role="tab"
            aria-selected={activeTab === 'anatomy'}
            tabIndex={activeTab === 'anatomy' ? 0 : -1}
          >Session Data</button>
          <button
            className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
            role="tab"
            aria-selected={activeTab === 'progress'}
            tabIndex={activeTab === 'progress' ? 0 : -1}
          >Teaching Progress</button>
        </div>
      </div>

      <div className="hub-content">
        {activeTab === 'summary' && (
          <div className="card fade-in summary-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{aiSummary ? 'Teaching Plan & Feedback' : 'Main Feedback'}</h3>
              <div className="header-actions-row">
                {aiSummary && (
                  <div className="export-buttons">
                    <button className="btn-export" onClick={handleCopySummary} aria-label="Copy feedback to clipboard">
                      Copy
                    </button>
                    <button className="btn-export" onClick={handleDownloadSummary} aria-label="Download feedback as Markdown">
                      Download
                    </button>
                    <button className="btn-export" onClick={printReport} aria-label="Print or save as PDF">
                      Print
                    </button>
                  </div>
                )}
                {!aiSummary && (
                  <button className="btn-primary btn-gradient" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
                    {isGeneratingSummary ? 'Analyzing...' : 'Generate Main Feedback'}
                  </button>
                )}
              </div>
            </div>

            {isGeneratingSummary ? (
              <SummarySkeleton />
            ) : summaryError ? (
              <div className="error-state">
                <p className="error-message">{summaryError}</p>
                <button className="btn-danger-outline" onClick={handleGenerateSummary}>Try Again</button>
              </div>
            ) : !aiSummary ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p className="empty-title">No analysis yet</p>
                <p className="empty-description">Click "Generate Main Feedback" to receive focused, evidence-based feedback to help you improve your next class.</p>
              </div>
            ) : (
              /* Render Level 1 Feedback Content */
              <div className="summary-content level1-feedback">
                {/* Truncation Warning */}
                {aiSummary._meta?.truncated && (
                  <div className="truncation-warning" style={{
                    marginBottom: '1rem',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: 'var(--color-warning-light, #fef3c7)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--color-warning-dark, #92400e)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                  }}>
                    <span>⚠️</span>
                    <span>Your transcript was longer than the analysis limit. Only the first ~{Math.round(aiSummary._meta.analyzedLength / 1000)}k characters were analyzed ({Math.round(aiSummary._meta.analyzedLength / aiSummary._meta.originalLength * 100)}% of total).</span>
                  </div>
                )}

                {/* Framing Statement */}
                {aiSummary.framing && (
                  <div className="framing-statement" style={{
                    marginBottom: '2rem',
                    fontSize: '1.1rem',
                    lineHeight: '1.6',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--color-primary)'
                  }}>
                    {aiSummary.framing}
                  </div>
                )}

                {/* What Seemed to Work */}
                {aiSummary.whatWorked && aiSummary.whatWorked.length > 0 && (
                  <section className="summary-section">
                    <h4 className="section-title" style={{ color: 'var(--color-success)' }}>
                      What Seemed to Work
                    </h4>
                    <ul className="feedback-list">
                      {aiSummary.whatWorked.map((item, i) => (
                        <li key={i} className="feedback-item">
                          <div className="feedback-observation">
                            {typeof item === 'string' ? item : item.observation}
                          </div>
                          {item.evidence && (
                            <div className="feedback-evidence" style={{
                              fontSize: '0.85rem',
                              color: 'var(--color-text-muted)',
                              marginTop: '4px',
                              fontStyle: 'italic',
                              paddingLeft: '1rem',
                              borderLeft: '2px solid var(--color-border)'
                            }}>
                              "{item.evidence}"
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Teaching Experiments to Try */}
                {aiSummary.experiments && aiSummary.experiments.length > 0 && (
                  <section className="summary-section">
                    <h4 className="section-title" style={{ color: 'var(--color-primary)' }}>
                      Experiments to Try Next Class
                    </h4>
                    <ul className="feedback-list experiments-list">
                      {aiSummary.experiments.map((item, i) => (
                        <li key={i} className="feedback-item experiment-item">
                          <div className="experiment-suggestion">
                            {typeof item === 'string' ? item : item.suggestion}
                          </div>
                          {item.tradeoff && (
                            <div className="experiment-tradeoff" style={{
                              fontSize: '0.85rem',
                              color: 'var(--color-text-muted)',
                              marginTop: '4px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem'
                            }}>
                              <span style={{ color: 'var(--color-warning)' }}>↔</span>
                              <span>Tradeoff: {item.tradeoff}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Index Card Section */}
                {!indexCard ? (
                  <div className="index-card-section">
                    <p>Ready to take this into your next class?</p>
                    <button
                      className="btn-secondary btn-lg"
                      onClick={handleGenerateIndexCard}
                      disabled={isGeneratingIndexCard}
                      aria-label="Generate index card for next class"
                    >
                      <span className="card-icon" aria-hidden="true">📇</span>
                      {isGeneratingIndexCard ? 'Generating...' : 'Generate Next Class Index Card'}
                    </button>
                  </div>
                ) : (
                  <IndexCard
                    data={indexCard}
                    onSave={handleSaveIndexCard}
                    isSaved={isIndexCardSaved}
                    inline={true}
                    level="1"
                  />
                )}

                {/* Follow-up Chat for Level 1 */}
                <FollowUpChat
                  transcript={analysis.rawTranscript}
                  feedbackData={aiSummary}
                  level={1}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'feedback' && (
          <div className="card fade-in">
            <GoDeeper
              transcript={analysis.rawTranscript}
              sessionId={currentSessionId}
              onShowToast={showToast}
              hasLevel1Feedback={!!aiSummary}
            />
          </div>
        )}
        {activeTab === 'anatomy' && (
          <div className="card fade-in">
            <Dashboard
              analysis={analysis}
              onReset={onReset}
              apiKey={localStorage.getItem('openai_key')}
              onTeacherChange={handleTeacherChange}
              initialTeacher={selectedTeacher}
              onShowToast={showToast}
            />
          </div>
        )}
        {activeTab === 'progress' && (
          <div className="card fade-in">
            <ProgressDashboard onLoadSession={onLoadSession} refreshKey={activeTab === 'progress' ? Date.now() : null} />
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          key={toast.id}
        />
      )}

    </div>
  );
};
