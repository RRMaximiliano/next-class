import React from 'react';
import { useFocusTrap } from '../utils/useFocusTrap';

export function TranscriptPrivacyPrompt({
  isOpen,
  fileName,
  likelyCount,
  reviewCount,
  onContinue,
  onReview,
}) {
  const modalRef = React.useRef(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const totalCount = likelyCount + reviewCount;

  return (
    <div className="privacy-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-prompt-title">
      <section className="privacy-prompt-modal" ref={modalRef}>
        <header className="privacy-prompt-header">
          <div>
            <p className="privacy-prompt-kicker">Privacy check</p>
            <h2 id="privacy-prompt-title">Names may be present in this transcript</h2>
            <p>
              We found {totalCount} possible student name{totalCount === 1 ? '' : 's'} in <strong>{fileName}</strong>.
              This scan runs locally in your browser before any AI analysis.
            </p>
          </div>
        </header>

        <div className="privacy-prompt-body">
          <div className="privacy-prompt-summary">
            <div className="privacy-prompt-card">
              <span className="privacy-prompt-number">{likelyCount}</span>
              <span className="privacy-prompt-label">likely matches</span>
            </div>
            <div className="privacy-prompt-card">
              <span className="privacy-prompt-number">{reviewCount}</span>
              <span className="privacy-prompt-label">needs review</span>
            </div>
          </div>

          <div className="privacy-prompt-note">
            If you continue with the original transcript, any remaining names may be parsed, saved, and sent to OpenAI
            during analysis. You can review and anonymize first, or change this upload behavior in Settings later.
          </div>
        </div>

        <footer className="privacy-prompt-footer">
          <button className="btn-danger-outline" onClick={onContinue}>
            Continue with original
          </button>
          <button className="btn-primary" onClick={onReview}>
            Review anonymization
          </button>
        </footer>
      </section>
    </div>
  );
}
