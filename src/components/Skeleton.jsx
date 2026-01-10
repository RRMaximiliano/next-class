import React, { useState, useEffect } from 'react';
import './Skeleton.css';

// Single line skeleton text
export const SkeletonText = ({ width = '100%', height = '1rem' }) => (
  <div
    className="skeleton skeleton-text"
    style={{ width, height }}
  />
);

// Rectangular block skeleton
export const SkeletonBlock = ({ width = '100%', height = '4rem' }) => (
  <div
    className="skeleton skeleton-block"
    style={{ width, height }}
  />
);

// Progress steps for AI analysis
const SUMMARY_STEPS = [
  { label: 'Reading transcript...', duration: 2000 },
  { label: 'Identifying learning objectives...', duration: 3000 },
  { label: 'Mapping class activities...', duration: 3000 },
  { label: 'Generating feedback highlights...', duration: 4000 },
  { label: 'Compiling report...', duration: 2000 },
];

const FEEDBACK_STEPS = [
  { label: 'Analyzing teaching patterns...', duration: 2000 },
  { label: 'Evaluating engagement strategies...', duration: 3000 },
  { label: 'Identifying strengths...', duration: 3000 },
  { label: 'Finding growth opportunities...', duration: 3000 },
  { label: 'Generating recommendations...', duration: 3000 },
];

// Animated progress indicator
export const AnalysisProgress = ({ steps = SUMMARY_STEPS }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= steps.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }, steps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep, steps]);

  return (
    <div className="analysis-progress">
      <div className="progress-spinner" />
      <div className="progress-steps">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`progress-step ${idx < currentStep ? 'completed' : ''} ${idx === currentStep ? 'active' : ''}`}
          >
            <span className="step-indicator">
              {idx < currentStep ? '✓' : idx === currentStep ? '•' : '○'}
            </span>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton for Class Summary content with progress
export const SummarySkeleton = () => (
  <div className="skeleton-container">
    <AnalysisProgress steps={SUMMARY_STEPS} />

    <div className="skeleton-section" style={{ marginTop: '1.5rem' }}>
      <SkeletonText width="40%" height="1.25rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonText width="100%" />
        <SkeletonText width="90%" />
        <SkeletonText width="95%" />
      </div>
    </div>

    <div className="skeleton-section">
      <SkeletonText width="35%" height="1.25rem" />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <SkeletonBlock width="30%" height="3rem" />
        <SkeletonBlock width="30%" height="3rem" />
        <SkeletonBlock width="30%" height="3rem" />
      </div>
    </div>

    <div className="skeleton-section">
      <SkeletonText width="45%" height="1.25rem" />
      <SkeletonBlock width="100%" height="6rem" />
    </div>
  </div>
);

// Skeleton for Detailed Feedback content with progress
export const FeedbackSkeleton = () => (
  <div className="skeleton-container">
    <AnalysisProgress steps={FEEDBACK_STEPS} />

    <div className="skeleton-section" style={{ marginTop: '1.5rem' }}>
      <SkeletonText width="50%" height="1.25rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonBlock width="100%" height="5rem" />
        <SkeletonBlock width="100%" height="5rem" />
      </div>
    </div>

    <div className="skeleton-section">
      <SkeletonText width="45%" height="1.25rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonBlock width="100%" height="5rem" />
        <SkeletonBlock width="100%" height="5rem" />
      </div>
    </div>
  </div>
);

// Skeleton for table rows
export const TableRowSkeleton = ({ columns = 3 }) => (
  <tr className="skeleton-row">
    {Array(columns).fill(0).map((_, i) => (
      <td key={i}>
        <SkeletonText width={i === 1 ? '80%' : '60%'} />
      </td>
    ))}
  </tr>
);
