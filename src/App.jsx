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
import { getSessions } from './utils/sessionHistory';

function App() {
  const [view, setView] = useState('upload'); // upload, session
  const [analysisData, setAnalysisData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply saved theme on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Check for existing sessions to show "View Sessions" link
  const savedSessions = getSessions();

  const handleFileLoaded = ({ name, content, date, sessionId }) => {
    setFileName(name);
    setSessionDate(date || new Date().toISOString().split('T')[0]);
    setCurrentSessionId(sessionId || null);

    // Process the file
    try {
      const parsed = parseTranscript(content);
      if (parsed.length === 0) {
        alert("Could not find any transcript data in this file.");
        return;
      }

      const analysis = analyzeClass(parsed);
      // Attach raw text for AI and session history
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
    setSessionDate(new Date().toISOString().split('T')[0]);
    setCurrentSessionId(null);
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
        onSave={() => { }}
      />

      <main className="main-content container">
        {view === 'upload' && (
          <div className="flex-col flex-center" style={{ minHeight: '60vh', gap: 'var(--spacing-xl)' }}>
            <div style={{ textAlign: 'center', maxWidth: '520px' }}>
              <h1 style={{ fontSize: '1.75rem', marginBottom: 'var(--spacing-sm)', fontWeight: '600' }}>
                Analyze Your Teaching
              </h1>
              <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                Upload a class transcript to get detailed feedback on classroom dynamics, student engagement, and teaching patterns.
              </p>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--color-primary)',
                lineHeight: '1.5',
                marginTop: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--color-primary-light, rgba(59, 130, 246, 0.1))',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)'
              }}>
                <span><strong>First time?</strong> Click <strong>⚙️ Settings</strong> to add your OpenAI API key for AI-powered analysis.</span>
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: '520px' }}>
              <UploadZone onFileLoaded={handleFileLoaded} />
            </div>

            {/* View Sessions link when sessions exist */}
            {savedSessions.length > 0 && (
              <button
                className="text-btn"
                onClick={() => {
                  // Load the most recent session to show Teaching Progress
                  const lastSession = savedSessions[0];
                  handleFileLoaded({
                    name: lastSession.fileName,
                    content: lastSession.rawTranscript,
                    date: lastSession.date,
                    sessionId: lastSession.id
                  });
                }}
                style={{ marginTop: 'var(--spacing-md)' }}
              >
                → View my {savedSessions.length} saved session{savedSessions.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Onboarding tour for first-time users */}
        {view === 'upload' && <OnboardingTour steps={TOUR_STEPS} storageKey="onboarding_complete" />}

        {view === 'session' && analysisData && (
          <ErrorBoundary onReset={handleReset} showDetails={false}>
            <SessionHub
              analysis={analysisData}
              fileName={fileName}
              sessionDate={sessionDate}
              sessionId={currentSessionId}
              onReset={handleReset}
              onDateChange={setSessionDate}
              onLoadSession={handleFileLoaded}
            />
          </ErrorBoundary>
        )}
      </main>
    </div>
  );
}

export default App;
