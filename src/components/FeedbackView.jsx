import React, { useMemo, useState } from 'react';
import { generateFeedback } from '../utils/feedbackEngine';
import './FeedbackView.css';

const InsightCard = ({ insight }) => {
    const isStrength = insight.type === 'strength';
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`insight-card ${insight.type} fade-in`}>
            <div className="card-header">
                <div className="card-icon">{isStrength ? '🌟' : '💡'}</div>
                <div className="card-title-group">
                    <h4>{insight.title}</h4>
                    <span className="card-metric">{insight.value}</span>
                </div>
            </div>

            <div className="card-body">
                {/* Recommendation */}
                <div className="recommendation-box">
                    <strong>{isStrength ? 'Keep it up:' : 'Try this:'}</strong>
                    <p>{insight.recommendation}</p>
                </div>

                {/* Evidence Section */}
                {insight.evidence && insight.evidence.length > 0 && (
                    <div className="evidence-section">
                        <button
                            className="toggle-evidence-btn"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? 'Hide Evidence' : `Show Evidence (${insight.evidence.length})`}
                        </button>

                        {expanded && (
                            <ul className="evidence-list">
                                {insight.evidence.map((item, idx) => (
                                    <li key={idx}>
                                        <span className="quote">"{item.text}"</span>
                                        {item.time && <span className="timestamp">{Math.floor(item.time / 60)}:{Math.floor(item.time % 60).toString().padStart(2, '0')}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Citation Footer */}
                {insight.citation && (
                    <div className="citation-footer">
                        <span className="icon">📚</span>
                        <span>{insight.citation}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export const FeedbackView = ({ analysis, aiOverride }) => {
    // If AI override (Referee Report) exists, use strict schema. 
    // Otherwise fallback to heuristic generator (which produces 'insights' array).
    const isAiReport = !!aiOverride;

    // Fallback logic for initial view (before AI analysis)
    const heuristicFeedback = useMemo(() => {
        if (isAiReport) return null;
        return generateFeedback(analysis);
    }, [analysis, isAiReport]);

    const displayData = isAiReport ? aiOverride : heuristicFeedback;

    if (!displayData) return null;

    // Normalize data structure for rendering
    const strengths = isAiReport ? displayData.strengths : displayData.insights.filter(i => i.type === 'strength');
    const improvements = isAiReport ? displayData.areasForGrowth : displayData.insights.filter(i => i.type === 'improvement');
    const style = displayData.style;

    return (
        <div className="feedback-view fade-in">
            <div className="feedback-header">
                <div className="style-badge-container">
                    <div className="style-badge">
                        Teaching Style: <strong>{style}</strong>
                    </div>
                </div>
            </div>

            <div className="report-container">
                {/* Strengths Section */}
                <section className="report-section">
                    <h3 className="report-heading success">Highlights & Strengths</h3>
                    <ul className="report-list">
                        {strengths && strengths.length > 0 ? strengths.map((item, i) => (
                            <li key={i} className="report-item">
                                <div className="report-aspect-header">
                                    <span className="icon">🌟</span>
                                    <strong className="aspect-title">{isAiReport ? item.aspect : item.title}</strong>
                                </div>
                                <p className="report-explanation">{isAiReport ? item.explanation : item.recommendation}</p>

                                {item.evidence && item.evidence.length > 0 && (
                                    <div className="report-evidence">
                                        <strong>Evidence:</strong>
                                        <ul>
                                            {item.evidence.map((ev, idx) => (
                                                <li key={idx}>"{typeof ev === 'string' ? ev : ev.text}"</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </li>
                        )) : (
                            <li className="empty-msg">No strengths detected yet.</li>
                        )}
                    </ul>
                </section>

                <hr className="section-divider" />

                {/* Areas for Growth Section */}
                <section className="report-section">
                    <h3 className="report-heading warning">Areas for Growth</h3>
                    <ul className="report-list">
                        {improvements && improvements.length > 0 ? improvements.map((item, i) => (
                            <li key={i} className="report-item">
                                <div className="report-aspect-header">
                                    <span className="icon">💡</span>
                                    <strong className="aspect-title">{isAiReport ? item.aspect : item.title}</strong>
                                </div>
                                <p className="report-explanation">{isAiReport ? item.explanation : item.recommendation}</p>

                                {item.evidence && item.evidence.length > 0 && (
                                    <div className="report-evidence">
                                        <strong>Evidence:</strong>
                                        <ul>
                                            {item.evidence.map((ev, idx) => (
                                                <li key={idx}>"{typeof ev === 'string' ? ev : ev.text}"</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </li>
                        )) : (
                            <li className="empty-msg">No areas for improvement detected.</li>
                        )}
                    </ul>
                </section>
            </div>
        </div>
    );
};
