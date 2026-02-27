import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import './App.css';
import './components/Buttons.css';
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
import { Toast } from './components/Toast';
import { useToast } from './components/useToast';
import { SessionBrowser } from './components/SessionBrowser';
import './components/SessionBrowser.css';
import { onAuthChange, signOutUser } from './utils/authService';

const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const PrivacyPage = lazy(() => import('./components/PrivacyPage').then(m => ({ default: m.PrivacyPage })));

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [view, setView] = useState('upload'); // upload, session
  const [analysisData, setAnalysisData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSessionBrowserOpen, setIsSessionBrowserOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Apply saved theme on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
  };

  // Check for existing sessions to show "View Sessions" link (memoized to avoid localStorage read every render)
  const savedSessions = useMemo(() => getSessions(), [view]);

  const handleFileLoaded = ({ name, content, date, sessionId }) => {
    setFileName(name);
    setSessionDate(date || new Date().toISOString().split('T')[0]);
    setCurrentSessionId(sessionId || null);

    // Check for empty content
    if (!content || content.trim().length === 0) {
      showToast('The file appears to be empty. Please upload a file with transcript content.', 'error');
      return;
    }

    // Process the file
    try {
      const { entries, hasTimestamps, hasSpeakerLabels } = parseTranscript(content);

      if (entries.length === 0) {
        showToast('Could not parse transcript data. The file may be empty or in an unsupported format.', 'error');
        return;
      }

      const analysis = analyzeClass(entries, hasTimestamps, hasSpeakerLabels);
      // Attach raw text for AI and session history
      analysis.rawTranscript = content;
      analysis.hasTimestamps = hasTimestamps;
      analysis.hasSpeakerLabels = hasSpeakerLabels;

      // Show info toast based on transcript format
      if (!hasSpeakerLabels) {
        showToast('Transcript loaded without speaker labels. Some analytics are unavailable, but AI feedback is fully functional.', 'info');
      } else if (!hasTimestamps) {
        showToast('Transcript loaded without timestamps. Some features (Time Management analysis, timing metrics) will be unavailable.', 'info');
      }

      setAnalysisData(analysis);
      setView('session');
    } catch (e) {
      console.error('Transcript parsing error:', e);
      showToast(`Error analyzing file: ${e.message || 'Unknown error'}. Please check the file format.`, 'error');
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setFileName('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setCurrentSessionId(null);
    setView('upload');
  };

  // Auth loading — minimal spinner to prevent flash
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  // Not signed in — show login screen
  if (!user) {
    return (
      <Suspense fallback={<div className="auth-loading"><div className="auth-loading-spinner" /></div>}>
        <LoginScreen
          onSignIn={setUser}
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
        />
        {isPrivacyOpen && <PrivacyPage onBack={() => setIsPrivacyOpen(false)} />}
      </Suspense>
    );
  }

  // Signed in — full app
  return (
    <div className="app-layout">
      <header className="header">
        <div className="container">
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); handleReset(); }}>Next Class</a>
          <div className="header-actions">
            <button
              className="settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
            >
              Settings
            </button>
            <div className="user-pill">
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="user-pill-avatar"
              />
              <span className="user-pill-name">{user.displayName?.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => { }}
        user={user}
        onSignOut={handleSignOut}
        onOpenPrivacy={() => { setIsSettingsOpen(false); setIsPrivacyOpen(true); }}
      />

      <SessionBrowser
        isOpen={isSessionBrowserOpen}
        onClose={() => setIsSessionBrowserOpen(false)}
        onSelectSession={handleFileLoaded}
      />

      {isPrivacyOpen && (
        <Suspense fallback={null}>
          <PrivacyPage onBack={() => setIsPrivacyOpen(false)} />
        </Suspense>
      )}

      <main className="main-content container">
        {view === 'upload' && (
          <div className="upload-landing">
            <div className="upload-landing-text">
              <h1>Improve Your Next Class</h1>
              <p className="upload-landing-subtitle">
                Upload a class transcript to receive focused, evidence-based feedback to help you improve your next class.
              </p>
              <p className="upload-landing-hint">
                <strong>First time?</strong> Click <strong>Settings</strong> above to add your OpenAI API key for AI-powered analysis.
              </p>
            </div>

            <div className="upload-landing-zone">
              <UploadZone onFileLoaded={handleFileLoaded} />
            </div>

            {savedSessions.length > 0 && (
              <button
                className="text-btn upload-landing-sessions"
                onClick={() => setIsSessionBrowserOpen(true)}
              >
                View {savedSessions.length} saved session{savedSessions.length > 1 ? 's' : ''}
              </button>
            )}

            <button
              className="text-btn privacy-footer-link"
              onClick={() => setIsPrivacyOpen(true)}
            >
              Privacy
            </button>
          </div>
        )}

        {view === 'upload' && <OnboardingTour steps={TOUR_STEPS} storageKey="onboarding_complete" />}

        {view === 'session' && analysisData && (
          <ErrorBoundary onReset={handleReset} showDetails={false}>
            <SessionHub
              analysis={analysisData}
              fileName={fileName}
              sessionDate={sessionDate}
              sessionId={currentSessionId}
              onReset={handleReset}
              onLoadSession={handleFileLoaded}
            />
          </ErrorBoundary>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          key={toast.id}
        />
      )}
    </div>
  );
}

export default App;
