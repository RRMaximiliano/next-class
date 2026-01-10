import React, { useState, useEffect } from 'react';
import './App.css';
import { UploadZone } from './components/UploadZone';
import { SessionHub } from './components/SessionHub';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingTour, TOUR_STEPS } from './components/OnboardingTour';
import './components/OnboardingTour.css';
import ErrorBoundary from './components/ErrorBoundary';
import './components/ErrorBoundary.css';
import { parseTranscript } from './utils/transcriptParser';
import { analyzeClass } from './utils/classAnatomy';

function App() {
  const [view, setView] = useState('upload'); // upload, session
  const [analysisData, setAnalysisData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply saved theme on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleFileLoaded = ({ name, content }) => {
    setFileName(name);

    // Process the file
    try {
      const parsed = parseTranscript(content);
      if (parsed.length === 0) {
        alert("Could not find any transcript data in this file.");
        return;
      }

      const analysis = analyzeClass(parsed);
      // Attach raw text for AI
      analysis.rawTranscript = content;

      setAnalysisData(analysis);
      setView('session');
    } catch (e) {
      console.error(e);
      alert("Error analyzing file.");
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setFileName('');
    setView('upload');
  };

  return (
    <div className="app-layout">
      <header className="header">
        <div className="container flex-center" style={{ justifyContent: 'space-between' }}>
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); handleReset(); }}>ClassAnatomy</a>
          <div className="header-actions">
            <button
              className="settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => { }} // LocalStorage handles it, this is just for trigger if needed
      />

      <main className="main-content container">
        {view === 'upload' && (
          <div className="flex-col flex-center" style={{ minHeight: '60vh', gap: 'var(--spacing-xl)' }}>
            <div style={{ textAlign: 'center', maxWidth: '520px' }}>
              <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--spacing-sm)', fontWeight: '600' }}>
                Analyze Your Teaching
              </h1>
              <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                Upload a Zoom transcript to get detailed feedback on classroom dynamics, student engagement, and teaching patterns.
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: '520px' }}>
              <UploadZone onFileLoaded={handleFileLoaded} />
            </div>
          </div>
        )}

        {/* Onboarding tour for first-time users */}
        {view === 'upload' && <OnboardingTour steps={TOUR_STEPS} storageKey="onboarding_complete" />}

        {view === 'session' && analysisData && (
          <ErrorBoundary onReset={handleReset} showDetails={false}>
            <SessionHub analysis={analysisData} fileName={fileName} onReset={handleReset} />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

export default App;
