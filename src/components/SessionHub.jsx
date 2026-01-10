import React, { useState } from 'react';
import { Dashboard } from './Dashboard';
import { FeedbackView } from './FeedbackView';
import { SummarySkeleton, FeedbackSkeleton } from './Skeleton';
import { Toast, useToast } from './Toast';
import { analyzeWithAI, generateLectureSummary } from '../utils/llmService';
import {
  formatSummaryAsMarkdown,
  formatFeedbackAsMarkdown,
  copyToClipboard,
  downloadAsFile,
  printReport
} from '../utils/exportUtils';
import './SessionHub.css';

export const SessionHub = ({ analysis, fileName, onReset }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);
  const { toast, showToast, hideToast } = useToast();

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

  const handleCopyFeedback = async () => {
    if (!aiFeedback) return;
    const markdown = formatFeedbackAsMarkdown(aiFeedback, fileName);
    const success = await copyToClipboard(markdown);
    showToast(success ? 'Feedback copied to clipboard!' : 'Failed to copy', success ? 'success' : 'error');
  };

  const handleDownloadFeedback = () => {
    if (!aiFeedback) return;
    const markdown = formatFeedbackAsMarkdown(aiFeedback, fileName);
    const safeName = (fileName || 'session').replace(/\.[^/.]+$/, '');
    downloadAsFile(markdown, `${safeName}_feedback.md`);
    showToast('Feedback downloaded!', 'success');
  };

  const handleGenerateFeedback = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      setFeedbackError('Please add your OpenAI API key in Settings to enable AI analysis.');
      return;
    }

    setIsGeneratingFeedback(true);
    setFeedbackError(null);
    try {
      const result = await analyzeWithAI(analysis.rawTranscript, apiKey);
      setAiFeedback(result);
    } catch (err) {
      const message = err.message.includes('rate')
        ? 'OpenAI rate limit reached. Please wait a moment and try again.'
        : err.message.includes('network') || err.message.includes('fetch')
          ? 'Connection error. Check your internet and try again.'
          : `Analysis failed: ${err.message}`;
      setFeedbackError(message);
    } finally {
      setIsGeneratingFeedback(false);
    }
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

  return (
    <div className="session-hub fade-in">
      {/* ... Header ... */}
      <div className="hub-header">
        {/* ... (Header code remains from previous edit, just make sure to keep the tabs) ... */}
        <div className="hub-title-row">
          <h2>{fileName || 'Untitled Session'}</h2>
          <button className="text-btn" onClick={onReset}>← Upload New Session</button>
        </div>

        <div className="hub-tabs">
          <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Class Summary</button>
          <button className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>Detailed Feedback</button>
          <button className={`tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`} onClick={() => setActiveTab('anatomy')}>Class Anatomy</button>
          <button className={`tab-btn ${activeTab === 'artifacts' ? 'active' : ''}`} onClick={() => setActiveTab('artifacts')}>Documents</button>
        </div>
      </div>

      <div className="hub-content">
        {activeTab === 'summary' && (
          <div className="card fade-in summary-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{aiSummary ? 'Teaching Plan & Feedback' : 'Class Summary'}</h3>
              <div className="header-actions-row">
                {aiSummary && (
                  <div className="export-buttons">
                    <button className="btn-export" onClick={handleCopySummary} title="Copy to clipboard">
                      📋 Copy
                    </button>
                    <button className="btn-export" onClick={handleDownloadSummary} title="Download as Markdown">
                      ⬇️ Download
                    </button>
                    <button className="btn-export" onClick={printReport} title="Print / Save as PDF">
                      🖨️ Print
                    </button>
                  </div>
                )}
                {!aiSummary && (
                  <button className="btn-ai-generate" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
                    {isGeneratingSummary ? 'Analyzing...' : 'Generate Class Summary'}
                  </button>
                )}
              </div>
            </div>

            {isGeneratingSummary ? (
              <SummarySkeleton />
            ) : summaryError ? (
              <div className="error-state">
                <p className="error-message">{summaryError}</p>
                <button className="btn-retry" onClick={handleGenerateSummary}>Try Again</button>
              </div>
            ) : !aiSummary ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p className="empty-title">No analysis yet</p>
                <p className="empty-description">Click "Generate Class Summary" to analyze this session and receive teaching insights, learning objectives, and feedback highlights.</p>
              </div>
            ) : (
              /* Render Summary Content */
              <div className="summary-content">
                {/* Executive Summary */}
                {aiSummary.executiveSummary && (
                  <div className="summary-intro" style={{ marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    {aiSummary.executiveSummary}
                  </div>
                )}

                {/* Learning Objectives - Updated for new format */}
                <section className="summary-section">
                  <h4 className="section-title">Deduced Learning Objectives</h4>
                  <ul className="objectives-list">
                    {aiSummary.learningObjectives?.map((obj, i) => (
                      <li key={i} className="objective-item">
                        {typeof obj === 'string' ? (
                          obj
                        ) : (
                          <>
                            <div className="objective-text">{obj.objective}</div>
                            {obj.evidenceOfProgress && (
                              <div className="objective-evidence" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                Evidence: {obj.evidenceOfProgress}
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Activity Table */}
                <section className="summary-section">
                  <h4 className="section-title">Mini Teaching Plan</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="anatomy-table">
                      <thead>
                        <tr>
                          <th>Activity</th>
                          <th>Time</th>
                          <th>Split (Inst/S-I/S-S)</th>
                          <th>Description & Objective</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiSummary.classActivities?.map((act, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{act.activity}</td>
                            <td>{act.time}</td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {typeof act.split === 'string' ? act.split :
                                `${act.split?.instructor || '-'} / ${act.split?.studentToInstructor || '-'} / ${act.split?.studentToStudent || '-'}`}
                            </td>
                            <td>
                              <div style={{ marginBottom: '4px' }}>{act.description}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', opacity: 0.8 }}>
                                Goal: {act.objectiveMapping}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Feedback Moments */}
                {aiSummary.feedback && (
                  <section className="summary-section feedback-moments">
                    <h4 className="section-title">Feedback Highlights</h4>
                    <div className="moments-grid">
                      {/* Moment that Sang */}
                      <div className="moment-card success">
                        <h5>Standout Moment</h5>
                        <div className="moment-quote">"{aiSummary.feedback.momentThatSang?.quote}"</div>
                        <div className="moment-meta">Time: {aiSummary.feedback.momentThatSang?.timestamp}</div>
                        <p>{aiSummary.feedback.momentThatSang?.explanation}</p>
                        {aiSummary.feedback.momentThatSang?.objectiveConnection && (
                          <div className="objective-connection" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '8px' }}>
                            → {aiSummary.feedback.momentThatSang.objectiveConnection}
                          </div>
                        )}
                      </div>

                      {/* Moment to Revisit */}
                      <div className="moment-card warning">
                        <h5>Moment to Revisit</h5>
                        <div className="moment-quote">"{aiSummary.feedback.momentToRevisit?.quote}"</div>
                        <div className="moment-meta">Time: {aiSummary.feedback.momentToRevisit?.timestamp}</div>
                        <p>{aiSummary.feedback.momentToRevisit?.explanation}</p>
                        {aiSummary.feedback.momentToRevisit?.objectiveConnection && (
                          <div className="objective-connection" style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginTop: '8px' }}>
                            → {aiSummary.feedback.momentToRevisit.objectiveConnection}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lists-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div>
                        <h5 style={{ color: 'var(--color-success)' }}>Strengths</h5>
                        <ul>
                          {aiSummary.feedback.strengths?.map((s, i) => (
                            <li key={i}>
                              {typeof s === 'string' ? s : (
                                <>
                                  <div>{s.strength}</div>
                                  {s.objectiveConnection && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                      → {s.objectiveConnection}
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 style={{ color: 'var(--color-primary)' }}>Improvements</h5>
                        <ul>
                          {aiSummary.feedback.improvements?.map((s, i) => (
                            <li key={i}>
                              {typeof s === 'string' ? s : (
                                <>
                                  <div>{s.improvement}</div>
                                  {s.objectiveConnection && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                      → {s.objectiveConnection}
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'feedback' && (
          <div className="card fade-in">
            <div className="referee-intro">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{aiFeedback ? 'Feedback Report' : 'Detailed Feedback'}</h3>
                <div className="header-actions-row">
                  {aiFeedback && (
                    <div className="export-buttons">
                      <button className="btn-export" onClick={handleCopyFeedback} title="Copy to clipboard">
                        📋 Copy
                      </button>
                      <button className="btn-export" onClick={handleDownloadFeedback} title="Download as Markdown">
                        ⬇️ Download
                      </button>
                      <button className="btn-export" onClick={printReport} title="Print / Save as PDF">
                        🖨️ Print
                      </button>
                    </div>
                  )}
                  {!aiFeedback && !isGeneratingFeedback && (
                    <button className="btn-ai-generate" onClick={handleGenerateFeedback}>
                      Generate Feedback Report
                    </button>
                  )}
                </div>
              </div>
              <p style={{ marginTop: '0.5rem' }}>Analysis of instructional structure and engagement patterns.</p>
            </div>
            {isGeneratingFeedback ? (
              <FeedbackSkeleton />
            ) : feedbackError ? (
              <div className="error-state">
                <p className="error-message">{feedbackError}</p>
                <button className="btn-retry" onClick={handleGenerateFeedback}>Try Again</button>
              </div>
            ) : (
              <FeedbackView
                analysis={analysis}
                aiOverride={aiFeedback}
                apiKey={localStorage.getItem('openai_key')}
              />
            )}
          </div>
        )}
        {activeTab === 'anatomy' && (
          <div className="card fade-in">
            <Dashboard
              analysis={analysis}
              onReset={onReset}
              apiKey={localStorage.getItem('openai_key')}
            />
          </div>
        )}
        {activeTab === 'artifacts' && (
          <div className="artifacts-list card">
            <h3>Session Documents</h3>
            <div className="artifact-item">
              <span className="icon"></span>
              <div className="artifact-info">
                <span className="name">{fileName}</span>
                <span className="meta">Transcript • Automated Analysis Ready</span>
              </div>
              <span className="status-badge success">Processed</span>
            </div>
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
