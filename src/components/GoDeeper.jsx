import React, { useState } from 'react';
import { generateLevel2Analysis, generateLevel2IndexCard } from '../utils/llmService';
import { IndexCard } from './IndexCard';
import { saveIndexCard } from '../utils/sessionHistory';
import { FollowUpChat } from './FollowUpChat';
import './FollowUpChat.css';
import './GoDeeper.css';

const FOCUS_AREAS = [
  {
    id: 'questions',
    title: 'Instructor Questions',
    description: 'Analyze your questioning patterns and how they invite student thinking',
    icon: '❓'
  },
  {
    id: 'sensemaking',
    title: 'Connecting Ideas',
    description: 'Explore how you help students connect concepts and build understanding',
    icon: '🔗'
  },
  {
    id: 'time',
    title: 'Time Management',
    description: 'Review pacing and how class time was allocated',
    icon: '⏱️',
    note: 'Requires time-stamped transcript'
  }
];

export const GoDeeper = ({
  transcript,
  sessionId,
  onShowToast,
  hasLevel1Feedback = false
}) => {
  const [selectedFocus, setSelectedFocus] = useState(null);
  const [level2Data, setLevel2Data] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [indexCard, setIndexCard] = useState(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [isCardSaved, setIsCardSaved] = useState(false);

  const handleSelectFocus = async (focusId) => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      setError('Please add your OpenAI API key in Settings to enable AI analysis.');
      return;
    }

    setSelectedFocus(focusId);
    setLevel2Data(null);
    setIndexCard(null);
    setIsCardSaved(false);
    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateLevel2Analysis(transcript, focusId, apiKey);

      // Check for error response (e.g., no timestamps for time analysis)
      if (result.error) {
        setError(result.error);
        setLevel2Data(null);
      } else {
        setLevel2Data(result);
      }
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateIndexCard = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey || !level2Data) return;

    setIsGeneratingCard(true);
    try {
      const result = await generateLevel2IndexCard(level2Data, apiKey);
      setIndexCard(result);
      setIsCardSaved(false);
    } catch (err) {
      onShowToast?.(`Failed to generate index card: ${err.message}`, 'error');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleSaveIndexCard = (cardData) => {
    if (sessionId && cardData) {
      // Save with a key that indicates it's a Level 2 card
      saveIndexCard(sessionId, {
        ...cardData,
        level: 2,
        focusArea: selectedFocus
      });
      setIsCardSaved(true);
      onShowToast?.('Index card saved to session!', 'success');
    }
  };

  const handleChangeFocus = () => {
    setSelectedFocus(null);
    setLevel2Data(null);
    setIndexCard(null);
    setIsCardSaved(false);
    setError(null);
  };

  // Initial selection state
  if (!selectedFocus) {
    return (
      <div className="go-deeper-selection">
        <div className="selection-header">
          <h3>Go Deeper (Optional)</h3>
          <p className="selection-intro">
            {hasLevel1Feedback
              ? "You've received your Main Feedback. Want to explore a specific dimension in more depth? Choose one focus area below."
              : "Choose one area to explore in depth. Each focus provides targeted insights you can apply in your next class."}
          </p>
        </div>

        <div className="focus-options">
          {FOCUS_AREAS.map((focus) => (
            <button
              key={focus.id}
              className="focus-option"
              onClick={() => handleSelectFocus(focus.id)}
            >
              <span className="focus-icon">{focus.icon}</span>
              <div className="focus-content">
                <h4>{focus.title}</h4>
                <p>{focus.description}</p>
                {focus.note && <span className="focus-note">{focus.note}</span>}
              </div>
              <span className="focus-arrow">→</span>
            </button>
          ))}
        </div>

        <div className="selection-note">
          <p>Level 2 deep dives are optional and designed to complement—not replace—your Main Feedback.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="go-deeper-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing {FOCUS_AREAS.find(f => f.id === selectedFocus)?.title.toLowerCase()}...</p>
        <button className="text-btn" onClick={handleChangeFocus}>Cancel</button>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="go-deeper-error">
        <div className="error-icon">⚠️</div>
        <p className="error-message">{error}</p>
        <button className="primary-btn" onClick={handleChangeFocus}>Choose Different Focus</button>
      </div>
    );
  }

  // Level 2 Analysis Display
  if (level2Data) {
    const currentFocus = FOCUS_AREAS.find(f => f.id === selectedFocus);

    return (
      <div className="go-deeper-analysis">
        <div className="analysis-header">
          <div className="analysis-title">
            <span className="focus-icon">{currentFocus?.icon}</span>
            <h3>{level2Data.focusArea || currentFocus?.title}</h3>
          </div>
          <button className="text-btn" onClick={handleChangeFocus}>
            ← Choose Different Focus
          </button>
        </div>

        {/* Truncation Warning */}
        {level2Data._meta?.truncated && (
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
            <span>Your transcript was longer than the analysis limit. Only the first ~{Math.round(level2Data._meta.analyzedLength / 1000)}k characters were analyzed ({Math.round(level2Data._meta.analyzedLength / level2Data._meta.originalLength * 100)}% of total).</span>
          </div>
        )}

        {/* Why It Matters */}
        <section className="analysis-section why-matters">
          <h4>Why This Matters</h4>
          <p>{level2Data.whyItMatters}</p>
        </section>

        {/* Current Approach */}
        <section className="analysis-section current-approach">
          <h4>What This Class Suggests</h4>

          <div className="approach-strengths">
            <h5>What Worked Well</h5>
            <p>{level2Data.currentApproach?.strengths}</p>
          </div>

          {level2Data.currentApproach?.opportunity && (
            <div className="approach-opportunity">
              <h5>One Opportunity</h5>
              <p>{level2Data.currentApproach.opportunity}</p>
            </div>
          )}
        </section>

        {/* Experiment */}
        <section className="analysis-section experiment">
          <h4>Experiment to Try Next Class</h4>
          <p>{level2Data.experiment?.description}</p>

          {level2Data.experiment?.examplePrompts && level2Data.experiment.examplePrompts.length > 0 && (
            <div className="example-prompts">
              <strong>Example phrases you could use:</strong>
              <ul>
                {level2Data.experiment.examplePrompts.map((prompt, i) => (
                  <li key={i}>"{prompt}"</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Tradeoff */}
        {level2Data.tradeoff && (
          <section className="analysis-section tradeoff">
            <h4>Making Space</h4>
            <p>{level2Data.tradeoff}</p>
          </section>
        )}

        {/* Watch For */}
        <section className="analysis-section watch-for">
          <h4>What to Watch For</h4>
          <p className="watch-for-hint">How to know if the experiment is working</p>
          <p>{level2Data.watchFor}</p>
        </section>

        {/* Index Card Section */}
        {!indexCard ? (
          <div className="index-card-section">
            <p>Want a compact card for this focus area?</p>
            <button
              className="btn-index-card"
              onClick={handleGenerateIndexCard}
              disabled={isGeneratingCard}
            >
              <span className="card-icon">📇</span>
              {isGeneratingCard ? 'Generating...' : 'Generate Index Card'}
            </button>
          </div>
        ) : (
          <IndexCard
            data={indexCard}
            onSave={handleSaveIndexCard}
            isSaved={isCardSaved}
            inline={true}
            level="2"
            focusArea={FOCUS_AREAS.find(f => f.id === selectedFocus)?.title}
          />
        )}

        {/* Follow-up Chat for Level 2 */}
        <FollowUpChat
          transcript={transcript}
          feedbackData={level2Data}
          level={2}
          focusArea={FOCUS_AREAS.find(f => f.id === selectedFocus)?.title}
        />
      </div>
    );
  }

  return null;
};
