import React, { useState } from 'react';
import { generateLevel2Analysis, generateLevel2IndexCard, generateCustomLevel2Analysis } from '../utils/llmService';
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
  hasLevel1Feedback = false,
  hasTimestamps = true,
  hasSpeakerLabels = true,
  // Lifted state from SessionHub — keyed by focus area
  level2DataByFocus: externalDataByFocus,
  onLevel2DataByFocusChange,
  selectedFocus: externalSelectedFocus,
  onSelectedFocusChange,
  level2IndexCardByFocus: externalIndexCardByFocus,
  onLevel2IndexCardByFocusChange,
  isLevel2CardSavedByFocus: externalCardSavedByFocus,
  onIsLevel2CardSavedByFocusChange,
  followUpMessages,
  onFollowUpMessagesChange,
}) => {
  // Use external state if provided, otherwise local state
  const [localSelectedFocus, setLocalSelectedFocus] = useState(null);
  const [localDataByFocus, setLocalDataByFocus] = useState({});
  const [localIndexCardByFocus, setLocalIndexCardByFocus] = useState({});
  const [localCardSavedByFocus, setLocalCardSavedByFocus] = useState({});

  const selectedFocus = externalSelectedFocus !== undefined ? externalSelectedFocus : localSelectedFocus;
  const setSelectedFocus = onSelectedFocusChange || setLocalSelectedFocus;
  const dataByFocus = externalDataByFocus !== undefined ? externalDataByFocus : localDataByFocus;
  const setDataByFocus = onLevel2DataByFocusChange || setLocalDataByFocus;
  const indexCardByFocus = externalIndexCardByFocus !== undefined ? externalIndexCardByFocus : localIndexCardByFocus;
  const setIndexCardByFocus = onLevel2IndexCardByFocusChange || setLocalIndexCardByFocus;
  const cardSavedByFocus = externalCardSavedByFocus !== undefined ? externalCardSavedByFocus : localCardSavedByFocus;
  const setCardSavedByFocus = onIsLevel2CardSavedByFocusChange || setLocalCardSavedByFocus;

  // Derived: current focus data
  const level2Data = selectedFocus ? dataByFocus[selectedFocus] || null : null;
  const indexCard = selectedFocus ? indexCardByFocus[selectedFocus] || null : null;
  const isCardSaved = selectedFocus ? cardSavedByFocus[selectedFocus] || false : false;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  // Custom focus state (Sprint 4D)
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customFocusDescription, setCustomFocusDescription] = useState('');

  const handleSelectFocus = async (focusId, isRetry = false) => {
    // If we already have cached data for this focus, just show it
    if (!isRetry && dataByFocus[focusId]) {
      setSelectedFocus(focusId);
      setError(null);
      return;
    }

    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey) {
      setError('Please add your OpenAI API key in Settings to enable AI analysis.');
      return;
    }

    setSelectedFocus(focusId);
    setError(null);
    setIsGenerating(true);

    // Exponential backoff for retries
    if (isRetry && retryCount > 0) {
      const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      let result;
      if (focusId === 'custom') {
        result = await generateCustomLevel2Analysis(transcript, customFocusDescription, apiKey);
      } else {
        result = await generateLevel2Analysis(transcript, focusId, apiKey);
      }

      // Check for error response (e.g., no timestamps for time analysis)
      if (result.error) {
        setError(result.error);
      } else {
        setDataByFocus(prev => ({ ...prev, [focusId]: result }));
        setRetryCount(0); // Reset on success
      }
    } catch (err) {
      const isRetryable = err.message.includes('timed out') ||
                          err.message.includes('rate') ||
                          err.message.includes('network') ||
                          err.message.includes('fetch');
      setError(`Analysis failed: ${err.message}${isRetryable ? ' You can try again.' : ''}`);
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    if (selectedFocus) {
      setRetryCount(prev => prev + 1);
      handleSelectFocus(selectedFocus, true);
    }
  };

  const handleGenerateIndexCard = async () => {
    const apiKey = localStorage.getItem('openai_key');
    if (!apiKey || !level2Data) return;

    setIsGeneratingCard(true);
    try {
      const result = await generateLevel2IndexCard(level2Data, apiKey);
      setIndexCardByFocus(prev => ({ ...prev, [selectedFocus]: result }));
      setCardSavedByFocus(prev => ({ ...prev, [selectedFocus]: false }));
    } catch (err) {
      onShowToast?.(`Failed to generate index card: ${err.message}`, 'error');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleSaveIndexCard = (cardData) => {
    if (sessionId && cardData) {
      saveIndexCard(sessionId, {
        ...cardData,
        level: 2,
        focusArea: selectedFocus
      });
      setCardSavedByFocus(prev => ({ ...prev, [selectedFocus]: true }));
      onShowToast?.('Index card saved to session!', 'success');
    }
  };

  const handleChangeFocus = () => {
    setSelectedFocus(null);
    setError(null);
    setShowCustomInput(false);
    setCustomFocusDescription('');
  };

  const handleCustomSubmit = () => {
    if (customFocusDescription.trim().length < 10) {
      onShowToast?.('Please describe your focus area in at least a few words.', 'error');
      return;
    }
    handleSelectFocus('custom');
  };

  // Get the display title for the current focus
  const getFocusTitle = () => {
    if (selectedFocus === 'custom') return 'Custom Focus';
    return FOCUS_AREAS.find(f => f.id === selectedFocus)?.title || selectedFocus;
  };

  const getFocusIcon = () => {
    if (selectedFocus === 'custom') return '🔍';
    return FOCUS_AREAS.find(f => f.id === selectedFocus)?.icon || '📊';
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
          {FOCUS_AREAS.map((focus) => {
            const isDisabled = focus.id === 'time' && !hasTimestamps;
            const hasCachedResult = !!dataByFocus[focus.id];
            return (
              <button
                key={focus.id}
                className={`focus-option ${isDisabled ? 'focus-option-disabled' : ''} ${hasCachedResult ? 'focus-option-completed' : ''}`}
                onClick={() => !isDisabled && handleSelectFocus(focus.id)}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                <span className="focus-icon">{focus.icon}</span>
                <div className="focus-content">
                  <h4>{focus.title}</h4>
                  <p>{focus.description}</p>
                  {hasCachedResult && (
                    <span className="focus-note focus-note-completed">Analysis complete — click to view</span>
                  )}
                  {!hasCachedResult && focus.note && (
                    <span className={`focus-note ${isDisabled ? 'focus-note-unavailable' : ''}`}>
                      {isDisabled ? 'Unavailable - transcript has no timestamps' : focus.note}
                    </span>
                  )}
                </div>
                <span className="focus-arrow">{isDisabled ? '⊘' : hasCachedResult ? '↩' : '→'}</span>
              </button>
            );
          })}

          {/* Custom Focus (Sprint 4D) */}
          {!showCustomInput ? (
            <button
              className={`focus-option focus-option-custom ${dataByFocus['custom'] ? 'focus-option-completed' : ''}`}
              onClick={() => dataByFocus['custom'] ? handleSelectFocus('custom') : setShowCustomInput(true)}
            >
              <span className="focus-icon">🔍</span>
              <div className="focus-content">
                <h4>Custom Focus</h4>
                <p>Describe your own area to explore in depth</p>
              </div>
              <span className="focus-arrow">→</span>
            </button>
          ) : (
            <div className="custom-focus-input">
              <div className="custom-focus-header">
                <span className="focus-icon">🔍</span>
                <h4>Custom Focus</h4>
              </div>
              <p className="custom-focus-hint">Describe what you want to explore. For example: "How I responded to student confusion" or "Moments where I could have paused longer"</p>
              <textarea
                className="custom-focus-textarea"
                value={customFocusDescription}
                onChange={(e) => setCustomFocusDescription(e.target.value)}
                placeholder="I want to explore..."
                rows={3}
                autoFocus
              />
              <div className="custom-focus-actions">
                <button
                  className="btn-primary"
                  onClick={handleCustomSubmit}
                  disabled={customFocusDescription.trim().length < 10}
                >
                  Analyze
                </button>
                <button className="text-btn" onClick={() => { setShowCustomInput(false); setCustomFocusDescription(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="selection-note">
          <p>Level 2 deep dives are optional and designed to complement—not replace—your Main Feedback.</p>
          {hasSpeakerLabels === false && (
            <p className="selection-note-info">
              <strong>Note:</strong> Your transcript doesn't have speaker labels. AI analysis will still work, but some speaker-specific insights may be limited.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isGenerating) {
    return (
      <div className="go-deeper-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing {getFocusTitle().toLowerCase()}...</p>
        <button className="text-btn" onClick={handleChangeFocus}>Cancel</button>
      </div>
    );
  }

  // Error state
  if (error) {
    const isRetryable = error.includes('timed out') ||
                        error.includes('rate') ||
                        error.includes('network') ||
                        error.includes('try again');
    return (
      <div className="go-deeper-error">
        <div className="error-icon">⚠️</div>
        <p className="error-message">{error}</p>
        <div className="error-actions">
          {isRetryable && retryCount < 3 && (
            <button className="btn-primary" onClick={handleRetry}>
              Try Again {retryCount > 0 ? `(Attempt ${retryCount + 1})` : ''}
            </button>
          )}
          <button className={isRetryable && retryCount < 3 ? "text-btn" : "btn-primary"} onClick={handleChangeFocus}>
            Choose Different Focus
          </button>
        </div>
      </div>
    );
  }

  // Level 2 Analysis Display
  if (level2Data) {
    return (
      <div className="go-deeper-analysis">
        <div className="analysis-header">
          <div className="analysis-title">
            <span className="focus-icon">{getFocusIcon()}</span>
            <h3>{level2Data.focusArea || getFocusTitle()}</h3>
          </div>
          <button className="text-btn" onClick={handleChangeFocus}>
            ← Choose Different Focus
          </button>
        </div>

        {/* Truncation Warning */}
        {level2Data._meta?.truncated && (
          <div className="truncation-warning">
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
              className="btn-secondary btn-lg"
              onClick={handleGenerateIndexCard}
              disabled={isGeneratingCard}
              aria-label="Generate index card for this focus area"
            >
              <span className="card-icon" aria-hidden="true">📇</span>
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
            focusArea={getFocusTitle()}
          />
        )}

        {/* Follow-up Chat for Level 2 */}
        <FollowUpChat
          transcript={transcript}
          feedbackData={level2Data}
          level={2}
          focusArea={getFocusTitle()}
          messages={followUpMessages}
          onMessagesChange={onFollowUpMessagesChange}
        />
      </div>
    );
  }

  return null;
};
