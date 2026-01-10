import React, { useState, useEffect } from 'react';
import './OnboardingTour.css';

const TOUR_STEPS = [
  {
    target: '.upload-zone',
    title: 'Welcome to ClassAnatomy!',
    content: 'Start by uploading a Zoom transcript or class recording transcript (.vtt or .txt file).',
    position: 'bottom'
  },
  {
    target: '.settings-btn',
    title: 'Add Your API Key',
    content: 'Click Settings to add your OpenAI API key. This enables AI-powered analysis and feedback.',
    position: 'bottom-left'
  }
];

const SESSION_TOUR_STEPS = [
  {
    target: '.hub-tabs',
    title: 'Explore Your Analysis',
    content: 'Navigate between tabs to see different insights: Summary, Detailed Feedback, Class Anatomy, and Documents.',
    position: 'bottom'
  },
  {
    target: '.btn-ai-generate',
    title: 'Generate AI Insights',
    content: 'Click here to generate AI-powered analysis of your teaching session.',
    position: 'bottom'
  },
  {
    target: '.export-buttons',
    title: 'Export Your Report',
    content: 'Copy, download, or print your generated reports to share with colleagues.',
    position: 'bottom-left'
  }
];

export const OnboardingTour = ({ steps = TOUR_STEPS, storageKey = 'tour_completed', onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];
  const targetElement = document.querySelector(step.target);

  // If target doesn't exist, skip this step
  if (!targetElement) {
    if (currentStep < steps.length - 1) {
      setTimeout(() => setCurrentStep(prev => prev + 1), 100);
    } else {
      handleComplete();
    }
    return null;
  }

  const rect = targetElement.getBoundingClientRect();

  // Calculate tooltip position
  let tooltipStyle = {};
  switch (step.position) {
    case 'bottom':
      tooltipStyle = {
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)'
      };
      break;
    case 'bottom-left':
      tooltipStyle = {
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right
      };
      break;
    case 'top':
      tooltipStyle = {
        bottom: window.innerHeight - rect.top + 12,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)'
      };
      break;
    default:
      tooltipStyle = {
        top: rect.bottom + 12,
        left: rect.left
      };
  }

  return (
    <>
      {/* Overlay */}
      <div className="tour-overlay" onClick={handleSkip} />

      {/* Spotlight on target */}
      <div
        className="tour-spotlight"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16
        }}
      />

      {/* Tooltip */}
      <div className="tour-tooltip" style={tooltipStyle}>
        <div className="tour-arrow" />
        <h4>{step.title}</h4>
        <p>{step.content}</p>
        <div className="tour-footer">
          <span className="tour-progress">
            {currentStep + 1} of {steps.length}
          </span>
          <div className="tour-actions">
            <button className="tour-skip" onClick={handleSkip}>
              Skip
            </button>
            <button className="tour-next" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export { TOUR_STEPS, SESSION_TOUR_STEPS };
