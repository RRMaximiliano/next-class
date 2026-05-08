import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import './GoDeeper.css';
import './ProgressDashboard.css';
import './CoachingSession.css';

const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const GoDeeper = lazy(() => import('./GoDeeper').then(m => ({ default: m.GoDeeper })));
const CoachingSession = lazy(() => import('./CoachingSession').then(m => ({ default: m.CoachingSession })));
const ProgressDashboard = lazy(() => import('./ProgressDashboard').then(m => ({ default: m.ProgressDashboard })));
// SummarySkeleton removed — using unified loading spinner
import { generateLectureSummary, generateIndexCard } from '../utils/llmService';
import { IndexCard } from './IndexCard';
import { FeedbackWidget } from './FeedbackWidget';
import './FeedbackWidget.css';
import './IndexCard.css';
import { FollowUpChat } from './FollowUpChat';
import { EmptyState } from './EmptyState';
import './FollowUpChat.css';
import { saveSession, getSessions, updateSessionStats, saveIndexCard, getIndexCard, saveAiInteraction, getAiInteractions } from '../utils/sessionHistory';
import {
  formatSummaryAsMarkdown,
  copyToClipboard,
  downloadAsFile,
  printReport
} from '../utils/exportUtils';
import './SessionHub.css';

const TabSpinner = () => (
  <div className="generating-loading"><div className="loading-spinner"></div></div>
);

export const SessionHub = ({ analysis, fileName, sessionDate, sessionId, onReset, onLoadSession, showToast }) => {
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
  // Stable counter to refresh ProgressDashboard when its tab is selected
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  // Cache API key read (avoids localStorage read during every render)
  const [apiKey] = useState(() => localStorage.getItem('openai_key'));

  // --- Lifted state for tab persistence (Sprint 1A, 1B) ---
  // GoDeeper (Level 2) state — keyed by focus area for caching
  const [level2DataByFocus, setLevel2DataByFocus] = useState({});
  const [selectedFocus, setSelectedFocus] = useState(null);
  const [level2IndexCardByFocus, setLevel2IndexCardByFocus] = useState({});
  const [isLevel2CardSavedByFocus, setIsLevel2CardSavedByFocus] = useState({});

  // CoachingSession (Level 3) state
  const [coachingMessages, setCoachingMessages] = useState(null); // null = not initialized

  // FollowUpChat state
  const [followUpL1Messages, setFollowUpL1Messages] = useState([]);
  const [followUpL2Messages, setFollowUpL2Messages] = useState([]);

  // Feedback widget state
  const [l1Feedback, setL1Feedback] = useState(null);
  const [l2FeedbackByFocus, setL2FeedbackByFocus] = useState({});

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
        const hasSpeakerLabels = analysis.hasSpeakerLabels !== false;
        const teacherSpeaker = hasSpeakerLabels ? analysis.speakers?.find(s => s.role === 'Teacher') : null;
        const studentSpeakers = hasSpeakerLabels ? (analysis.speakers?.filter(s => s.role === 'Student') || []) : [];
        const silenceSpeaker = analysis.speakers?.find(s => s.name === 'Activity/Silence' || s.name === 'Brief Pause');

        const stats = {
          totalDuration: analysis.totalDuration || 0,
          teacherTalkPercent: hasSpeakerLabels ? Math.round(teacherSpeaker?.percentage || 0) : null,
          studentTalkPercent: hasSpeakerLabels ? Math.round(studentSpeakers.reduce((sum, s) => sum + (s.percentage || 0), 0)) : null,
          questionCount: analysis.insights?.questions?.length || 0,
          silencePercent: Math.round(silenceSpeaker?.percentage || 0),
          speakerCount: hasSpeakerLabels ? (analysis.speakers?.length || 0) : null,
          wordCount: analysis.metrics?.totalWords || 0,
          hasSpeakerLabels,
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

  // Load saved index card and AI interactions when session changes (Sprint 1C)
  useEffect(() => {
    if (currentSessionId) {
      const savedCard = getIndexCard(currentSessionId);
      if (savedCard) {
        setIndexCard(savedCard);
        setIsIndexCardSaved(true);
      }

      // Restore AI interactions
      const interactions = getAiInteractions(currentSessionId);
      if (interactions) {
        if (interactions.level1 && !aiSummary) {
          setAiSummary(interactions.level1);
        }
        if (interactions.level2) {
          // Support both old format ({ data, selectedFocus }) and new format ({ dataByFocus, selectedFocus })
          if (interactions.level2.dataByFocus) {
            setLevel2DataByFocus(interactions.level2.dataByFocus);
            setSelectedFocus(interactions.level2.selectedFocus || null);
            if (interactions.level2.indexCardByFocus) setLevel2IndexCardByFocus(interactions.level2.indexCardByFocus);
            if (interactions.level2.cardSavedByFocus) setIsLevel2CardSavedByFocus(interactions.level2.cardSavedByFocus);
          } else if (interactions.level2.data) {
            // Migrate old single-result format
            const focus = interactions.level2.selectedFocus;
            if (focus) {
              setLevel2DataByFocus({ [focus]: interactions.level2.data });
              setSelectedFocus(focus);
            }
          }
        }
        if (interactions.coaching && interactions.coaching.length > 0 && !coachingMessages) {
          setCoachingMessages(interactions.coaching);
        }
        if (interactions.followUpL1 && interactions.followUpL1.length > 0 && followUpL1Messages.length === 0) {
          setFollowUpL1Messages(interactions.followUpL1);
        }
        if (interactions.followUpL2 && interactions.followUpL2.length > 0 && followUpL2Messages.length === 0) {
          setFollowUpL2Messages(interactions.followUpL2);
        }
        if (interactions.feedbackL1) {
          setL1Feedback(interactions.feedbackL1);
        }
        if (interactions.feedbackL2 && Object.keys(interactions.feedbackL2).length > 0) {
          setL2FeedbackByFocus(interactions.feedbackL2);
        }
      }
    }
  }, [currentSessionId]);

  // Save AI interactions when they change (Sprint 1C)
  const saveInteraction = useCallback((type, data) => {
    if (currentSessionId && data) {
      saveAiInteraction(currentSessionId, type, data);
    }
  }, [currentSessionId]);

  // Save Level 1 when it changes
  useEffect(() => {
    if (aiSummary && currentSessionId) {
      saveInteraction('level1', aiSummary);
    }
  }, [aiSummary, currentSessionId]);

  // Save Level 2 when it changes
  useEffect(() => {
    if (Object.keys(level2DataByFocus).length > 0 && currentSessionId) {
      saveInteraction('level2', {
        dataByFocus: level2DataByFocus,
        selectedFocus,
        indexCardByFocus: level2IndexCardByFocus,
        cardSavedByFocus: isLevel2CardSavedByFocus
      });
    }
  }, [level2DataByFocus, selectedFocus, level2IndexCardByFocus, isLevel2CardSavedByFocus, currentSessionId]);

  // Save coaching when it changes
  useEffect(() => {
    if (coachingMessages && coachingMessages.length > 0 && currentSessionId) {
      saveInteraction('coaching', coachingMessages);
    }
  }, [coachingMessages, currentSessionId]);

  // Save follow-up chats when they change
  useEffect(() => {
    if (followUpL1Messages.length > 0 && currentSessionId) {
      saveInteraction('followUpL1', followUpL1Messages);
    }
  }, [followUpL1Messages, currentSessionId]);

  useEffect(() => {
    if (followUpL2Messages.length > 0 && currentSessionId) {
      saveInteraction('followUpL2', followUpL2Messages);
    }
  }, [followUpL2Messages, currentSessionId]);

  // Save feedback ratings when they change
  useEffect(() => {
    if (l1Feedback && currentSessionId) {
      saveInteraction('feedbackL1', l1Feedback);
    }
  }, [l1Feedback]);

  useEffect(() => {
    if (Object.keys(l2FeedbackByFocus).length > 0 && currentSessionId) {
      saveInteraction('feedbackL2', l2FeedbackByFocus);
    }
  }, [l2FeedbackByFocus]);

  const handleL1Feedback = (rating, comment) => {
    setL1Feedback({ rating, comment: comment || null, timestamp: new Date().toISOString() });
  };

  const handleL2Feedback = (rating, comment, focusArea) => {
    if (!rating) {
      // Clear feedback for this focus area (analysis was re-generated)
      setL2FeedbackByFocus(prev => {
        const next = { ...prev };
        delete next[focusArea];
        return next;
      });
      return;
    }
    setL2FeedbackByFocus(prev => ({
      ...prev,
      [focusArea]: { rating, comment: comment || null, timestamp: new Date().toISOString() },
    }));
  };

  // Handler for saving index card
  const handleSaveIndexCard = (cardData) => {
    if (currentSessionId && cardData) {
      saveIndexCard(currentSessionId, cardData);
      setIsIndexCardSaved(true);
      showToast('Index card saved to session!', 'success');
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
      setL1Feedback(null);
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
          <h2><span className="hub-title-label">Analyzing:</span> {fileName || 'Untitled Session'}</h2>
          <button className="text-btn" onClick={onReset}>← Upload New Session</button>
        </div>

        <div
          className="hub-tabs"
          role="tablist"
          onKeyDown={(e) => {
            const tabs = ['summary', 'feedback', 'coaching', 'anatomy', 'progress'];
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
            id="tab-summary"
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
            role="tab"
            aria-selected={activeTab === 'summary'}
            aria-controls="panel-summary"
            tabIndex={activeTab === 'summary' ? 0 : -1}
          >Main Feedback</button>
          <button
            id="tab-feedback"
            className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
            role="tab"
            aria-selected={activeTab === 'feedback'}
            aria-controls="panel-feedback"
            tabIndex={activeTab === 'feedback' ? 0 : -1}
          >Go Deeper</button>
          <button
            id="tab-coaching"
            className={`tab-btn ${activeTab === 'coaching' ? 'active' : ''}`}
            onClick={() => setActiveTab('coaching')}
            role="tab"
            aria-selected={activeTab === 'coaching'}
            aria-controls="panel-coaching"
            tabIndex={activeTab === 'coaching' ? 0 : -1}
          >Coaching</button>
          <button
            id="tab-anatomy"
            className={`tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`}
            onClick={() => setActiveTab('anatomy')}
            role="tab"
            aria-selected={activeTab === 'anatomy'}
            aria-controls="panel-anatomy"
            tabIndex={activeTab === 'anatomy' ? 0 : -1}
          >Session Data</button>
          <button
            id="tab-progress"
            className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => { setActiveTab('progress'); setProgressRefreshKey(k => k + 1); }}
            role="tab"
            aria-selected={activeTab === 'progress'}
            aria-controls="panel-progress"
            tabIndex={activeTab === 'progress' ? 0 : -1}
          >Teaching Progress</button>
        </div>
      </div>

      <Suspense fallback={<TabSpinner />}>
      <div className="hub-content">
        {activeTab === 'summary' && (
          <div id="panel-summary" role="tabpanel" aria-labelledby="tab-summary" className="card fade-in summary-view">
            <div className="summary-header">
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
                  <button className="btn-secondary" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
                    {isGeneratingSummary ? 'Analyzing...' : 'Generate Main Feedback'}
                  </button>
                )}
              </div>
            </div>

            {isGeneratingSummary ? (
              <div className="generating-loading">
                <div className="loading-spinner"></div>
                <p>Generating main feedback...</p>
              </div>
            ) : summaryError ? (
              <div className="error-state">
                <p className="error-message">{summaryError}</p>
                <button className="btn-danger-outline" onClick={handleGenerateSummary}>Try Again</button>
              </div>
            ) : !aiSummary ? (
              <EmptyState
                icon="📊"
                title="No analysis yet"
                description='Click "Generate Main Feedback" to receive focused, evidence-based feedback to help you improve your next class.'
              />
            ) : (
              /* Render Level 1 Feedback Content */
              <div className="summary-content level1-feedback">
                {/* Truncation Warning */}
                {aiSummary._meta?.truncated && (
                  <div className="truncation-warning">
                    This transcript was quite long, so we analyzed the first {Math.round(aiSummary._meta.analyzedLength / aiSummary._meta.originalLength * 100)}%. The feedback covers the beginning and middle of your class. You can increase the limit in Settings.
                  </div>
                )}

                {/* Framing Statement */}
                {aiSummary.framing && (
                  <div className="framing-statement">
                    {aiSummary.framing}
                  </div>
                )}

                {/* What Seemed to Work */}
                {aiSummary.whatWorked && aiSummary.whatWorked.length > 0 && (
                  <section className="summary-section">
                    <h4 className="section-title section-title--success">
                      What Seemed to Work
                    </h4>
                    <ul className="feedback-list">
                      {aiSummary.whatWorked.map((item, i) => (
                        <li key={i} className="feedback-item">
                          <div className="feedback-observation">
                            {typeof item === 'string' ? item : item.observation}
                          </div>
                          {item.evidence && (
                            <div className="feedback-evidence">
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
                    <h4 className="section-title section-title--primary">
                      Experiments to Try Next Class
                    </h4>
                    <ul className="feedback-list experiments-list">
                      {aiSummary.experiments.map((item, i) => (
                        <li key={i} className="feedback-item experiment-item">
                          <div className="experiment-suggestion">
                            {typeof item === 'string' ? item : item.suggestion}
                          </div>
                          {item.tradeoff && (
                            <div className="experiment-tradeoff">
                              <span className="tradeoff-icon">↔</span>
                              <span>Tradeoff: {item.tradeoff}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <FeedbackWidget
                  onSubmit={handleL1Feedback}
                  feedbackData={l1Feedback}
                />

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
                  />
                )}

                {/* Follow-up Chat for Level 1 */}
                <FollowUpChat
                  transcript={analysis.rawTranscript}
                  feedbackData={aiSummary}
                  level={1}
                  messages={followUpL1Messages}
                  onMessagesChange={setFollowUpL1Messages}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'feedback' && (
          <div id="panel-feedback" role="tabpanel" aria-labelledby="tab-feedback" className="card fade-in">
            <GoDeeper
              transcript={analysis.rawTranscript}
              sessionId={currentSessionId}
              onShowToast={showToast}
              hasLevel1Feedback={!!aiSummary}
              hasTimestamps={analysis.hasTimestamps !== false}
              hasSpeakerLabels={analysis.hasSpeakerLabels !== false}
              level2DataByFocus={level2DataByFocus}
              onLevel2DataByFocusChange={setLevel2DataByFocus}
              selectedFocus={selectedFocus}
              onSelectedFocusChange={setSelectedFocus}
              level2IndexCardByFocus={level2IndexCardByFocus}
              onLevel2IndexCardByFocusChange={setLevel2IndexCardByFocus}
              isLevel2CardSavedByFocus={isLevel2CardSavedByFocus}
              onIsLevel2CardSavedByFocusChange={setIsLevel2CardSavedByFocus}
              followUpMessages={followUpL2Messages}
              onFollowUpMessagesChange={setFollowUpL2Messages}
              l2FeedbackByFocus={l2FeedbackByFocus}
              onL2Feedback={handleL2Feedback}
            />
          </div>
        )}
        {activeTab === 'coaching' && (
          <div id="panel-coaching" role="tabpanel" aria-labelledby="tab-coaching" className="card fade-in">
            <CoachingSession
              transcript={analysis.rawTranscript}
              onShowToast={showToast}
              messages={coachingMessages}
              onMessagesChange={setCoachingMessages}
            />
          </div>
        )}
        {activeTab === 'anatomy' && (
          <div id="panel-anatomy" role="tabpanel" aria-labelledby="tab-anatomy" className="card fade-in">
            <Dashboard
              analysis={analysis}
              apiKey={apiKey}
              onTeacherChange={handleTeacherChange}
              initialTeacher={selectedTeacher}
              onShowToast={showToast}
            />
          </div>
        )}
        {activeTab === 'progress' && (
          <div id="panel-progress" role="tabpanel" aria-labelledby="tab-progress" className="card fade-in">
            <ProgressDashboard onLoadSession={onLoadSession} refreshKey={progressRefreshKey} />
          </div>
        )}
      </div>
      </Suspense>

    </div>
  );
};
