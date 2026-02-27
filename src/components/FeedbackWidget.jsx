import React, { useState, useEffect } from 'react';
import './FeedbackWidget.css';

const ThumbUp = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ThumbDown = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2" />
    <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

export const FeedbackWidget = ({ onSubmit, feedbackData }) => {
  const [rating, setRating] = useState(feedbackData?.rating || null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(!!feedbackData);
  const [faded, setFaded] = useState(!!feedbackData);

  useEffect(() => {
    if (submitted && !feedbackData) {
      const timer = setTimeout(() => setFaded(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [submitted, feedbackData]);

  const handleThumbUp = () => {
    setRating('positive');
    setSubmitted(true);
    onSubmit?.('positive', null);
  };

  const handleThumbDown = () => {
    setRating('negative');
    setShowComment(true);
  };

  const handleSubmitNegative = () => {
    setShowComment(false);
    setSubmitted(true);
    onSubmit?.('negative', comment.trim() || null);
  };

  // State C: Already submitted
  if (submitted) {
    return (
      <div className={`feedback-widget feedback-widget--thanks ${faded ? 'feedback-widget--faded' : ''}`}>
        <span className="feedback-thanks-icon">
          {rating === 'positive' ? <ThumbUp filled /> : <ThumbDown filled />}
        </span>
        <span className="feedback-thanks-text">Thanks for your feedback!</span>
      </div>
    );
  }

  // State B: Comment input (thumbs down)
  if (showComment) {
    return (
      <div className="feedback-widget feedback-widget--expanded">
        <span className="feedback-prompt">What could be better?</span>
        <div className="feedback-comment-row">
          <input
            type="text"
            className="feedback-comment-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional — tell us more"
            maxLength={280}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitNegative(); }}
            autoFocus
          />
          <button className="feedback-send-btn" onClick={handleSubmitNegative}>
            Send
          </button>
          <button className="feedback-skip-btn" onClick={handleSubmitNegative}>
            Skip
          </button>
        </div>
      </div>
    );
  }

  // State A: Prompt
  return (
    <div className="feedback-widget">
      <span className="feedback-prompt">Was this helpful?</span>
      <button
        className="feedback-thumb"
        onClick={handleThumbUp}
        aria-label="Yes, this was helpful"
      >
        <ThumbUp />
      </button>
      <button
        className="feedback-thumb"
        onClick={handleThumbDown}
        aria-label="No, this could be better"
      >
        <ThumbDown />
      </button>
    </div>
  );
};
