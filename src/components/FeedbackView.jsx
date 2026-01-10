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
  const styleExplanation = isAiReport ? displayData.styleExplanation : null;

  // Style descriptions and spectrum positions
  const styleInfo = {
    'Facilitator': {
      position: 15,
      description: 'Student-centered approach with instructor guiding rather than directing.',
      appropriate: 'Advanced topics, seminar discussions, student-led projects, case-based learning.',
      consider: 'May need more structure for foundational content or when students lack prerequisite knowledge.'
    },
    'Hybrid': {
      position: 50,
      description: 'Balanced mix of instruction and interactive dialogue.',
      appropriate: 'Introducing concepts with guided practice, building on prior knowledge, most general teaching contexts.',
      consider: 'Adjust balance based on content complexity and student readiness.'
    },
    'Lecturer': {
      position: 85,
      description: 'Instructor-led presentation with emphasis on content delivery.',
      appropriate: 'Foundational content, complex material requiring careful sequencing, large class sizes.',
      consider: 'Incorporate interaction breaks to maintain engagement and check understanding.'
    }
  };

  const currentStyleInfo = styleInfo[style] || styleInfo['Hybrid'];
  const [showStyleDetails, setShowStyleDetails] = React.useState(false);

  return (
    <div className="feedback-view fade-in">
      <div className="feedback-header">
        <div className="style-badge-container">
          <div className="style-badge" onClick={() => setShowStyleDetails(!showStyleDetails)} style={{ cursor: 'pointer' }}>
            Teaching Style: <strong>{style}</strong>
            <span style={{ marginLeft: '8px', fontSize: '0.8rem' }}>{showStyleDetails ? '▲' : '▼'}</span>
          </div>

          {showStyleDetails && (
            <div className="style-explainer" style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--color-bg-secondary, #f8f9fa)',
              borderRadius: '8px',
              animation: 'fadeIn 0.3s ease'
            }}>
              {/* Visual Spectrum */}
              <div className="style-spectrum" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  <span>Facilitator</span>
                  <span>Hybrid</span>
                  <span>Lecturer</span>
                </div>
                <div style={{
                  position: 'relative',
                  height: '8px',
                  background: 'linear-gradient(to right, #10b981, #f59e0b, #6366f1)',
                  borderRadius: '4px'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: `${currentStyleInfo.position}%`,
                    top: '-4px',
                    width: '16px',
                    height: '16px',
                    background: 'white',
                    border: '3px solid var(--color-primary, #6366f1)',
                    borderRadius: '50%',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Style Description */}
              <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '0.75rem' }}><strong>{style}:</strong> {currentStyleInfo.description}</p>

                {styleExplanation && (
                  <p style={{ marginBottom: '0.75rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    {styleExplanation}
                  </p>
                )}

                <p style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-success)' }}>Appropriate for:</span> {currentStyleInfo.appropriate}
                </p>
                <p>
                  <span style={{ color: 'var(--color-warning)' }}>Consider:</span> {currentStyleInfo.consider}
                </p>
              </div>
            </div>
          )}
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
                  <span className="icon"></span>
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

                {item.learningObjectiveConnection && (
                  <div className="objective-connection" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--color-bg-secondary, #f0f7ff)', borderRadius: '4px' }}>
                    <strong>Learning Connection:</strong> {item.learningObjectiveConnection}
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
                  <span className="icon"></span>
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

                {item.learningObjectiveConnection && (
                  <div className="objective-connection" style={{ fontSize: '0.85rem', color: 'var(--color-warning)', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--color-bg-secondary, #fffbeb)', borderRadius: '4px' }}>
                    <strong>Learning Connection:</strong> {item.learningObjectiveConnection}
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
