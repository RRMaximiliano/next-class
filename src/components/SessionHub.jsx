import React, { useState } from 'react';
import { Dashboard } from './Dashboard';
import { FeedbackView } from './FeedbackView';
import { analyzeWithAI, generateLectureSummary } from '../utils/llmService';
import './SessionHub.css';

export const SessionHub = ({ analysis, fileName, onReset }) => {
    const [activeTab, setActiveTab] = useState('feedback');
    const [aiFeedback, setAiFeedback] = useState(null);
    const [aiSummary, setAiSummary] = useState(null);
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    const handleGenerateFeedback = async () => {
        const apiKey = localStorage.getItem('openai_key');
        if (!apiKey) return alert("Please enter an OpenAI API Key in Settings (⚙️) first.");

        setIsGeneratingFeedback(true);
        try {
            const result = await analyzeWithAI(analysis.rawTranscript, apiKey);
            setAiFeedback(result);
        } catch (err) {
            alert("Feedback Analysis Failed: " + err.message);
        } finally {
            setIsGeneratingFeedback(false);
        }
    };

    const handleGenerateSummary = async () => {
        const apiKey = localStorage.getItem('openai_key');
        if (!apiKey) return alert("Please enter an OpenAI API Key in Settings (⚙️) first.");

        setIsGeneratingSummary(true);
        try {
            const result = await generateLectureSummary(analysis.rawTranscript, apiKey);
            setAiSummary(result);
        } catch (err) {
            alert("Summary Analysis Failed: " + err.message);
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
                    <button className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>Detailed Feedback</button>
                    <button className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Class Summary</button>
                    <button className={`tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`} onClick={() => setActiveTab('anatomy')}>Class Anatomy</button>
                    <button className={`tab-btn ${activeTab === 'artifacts' ? 'active' : ''}`} onClick={() => setActiveTab('artifacts')}>Artifacts</button>
                </div>
            </div>

            <div className="hub-content">
                {activeTab === 'feedback' && (
                    <>
                        <div className="referee-intro">
                            <h3>{aiFeedback ? '✨ Referee Report' : 'Detailed Feedback'}</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p>Deep analysis of instructional structure and engagement.</p>
                                {!aiFeedback && (
                                    <button className="btn-ai-generate" onClick={handleGenerateFeedback} disabled={isGeneratingFeedback}>
                                        {isGeneratingFeedback ? 'Analyzing...' : 'Generate Feedback Report'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <FeedbackView
                            analysis={analysis}
                            aiOverride={aiFeedback}
                            apiKey={localStorage.getItem('openai_key')}
                        />
                    </>
                )}
                {activeTab === 'summary' && (
                    <div className="card fade-in summary-view">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>{aiSummary ? '✨ Mini Teaching Plan & Feedback' : 'Class Session Summary'}</h3>
                            {!aiSummary && (
                                <button className="btn-ai-generate" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
                                    {isGeneratingSummary ? 'Analyzing...' : 'Generate Class Summary'}
                                </button>
                            )}
                        </div>

                        {!aiSummary ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                                <p>Generate a "Deep AI Analysis" to see the Teaching Plan, Objectives, and Feedback highlights.</p>
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

                                {/* Learning Objectives */}
                                <section className="summary-section">
                                    <h4 className="section-title">Deduced Learning Objectives</h4>
                                    <ul className="objectives-list">
                                        {aiSummary.learningObjectives?.map((obj, i) => (
                                            <li key={i}>{obj}</li>
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
                                                <h5>🎵 Moment that Sang</h5>
                                                <div className="moment-quote">"{aiSummary.feedback.momentThatSang?.quote}"</div>
                                                <div className="moment-meta">Time: {aiSummary.feedback.momentThatSang?.timestamp}</div>
                                                <p>{aiSummary.feedback.momentThatSang?.explanation}</p>
                                            </div>

                                            {/* Moment to Revisit */}
                                            <div className="moment-card warning">
                                                <h5>🤔 Moment to Revisit</h5>
                                                <div className="moment-quote">"{aiSummary.feedback.momentToRevisit?.quote}"</div>
                                                <div className="moment-meta">Time: {aiSummary.feedback.momentToRevisit?.timestamp}</div>
                                                <p>{aiSummary.feedback.momentToRevisit?.explanation}</p>
                                            </div>
                                        </div>

                                        <div className="lists-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                            <div>
                                                <h5 style={{ color: 'var(--color-success)' }}>Strengths</h5>
                                                <ul>
                                                    {aiSummary.feedback.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h5 style={{ color: 'var(--color-primary)' }}>Improvements</h5>
                                                <ul>
                                                    {aiSummary.feedback.improvements?.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'anatomy' && (
                    <Dashboard
                        analysis={analysis}
                        onReset={onReset}
                        apiKey={localStorage.getItem('openai_key')}
                    />
                )}
                {activeTab === 'artifacts' && (
                    <div className="artifacts-list card">
                        <h3>Session Documents</h3>
                        <div className="artifact-item">
                            <span className="icon">📄</span>
                            <div className="artifact-info">
                                <span className="name">{fileName}</span>
                                <span className="meta">Transcript • Automated Analysis Ready</span>
                            </div>
                            <span className="status-badge success">Processed</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
