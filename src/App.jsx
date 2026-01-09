import React, { useState } from 'react';
import './App.css';
import { UploadZone } from './components/UploadZone';
import { SessionHub } from './components/SessionHub';
import { SettingsModal } from './components/SettingsModal';
import { parseTranscript } from './utils/transcriptParser';
import { analyzeClass } from './utils/classAnatomy';

function App() {
  const [view, setView] = useState('upload'); // upload, session
  const [analysisData, setAnalysisData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
          <a href="#" className="logo">ClassAnatomy</a>
          <div className="header-actions flex-center" style={{ gap: '1rem' }}>
            {view === 'session' && <span style={{ color: 'var(--color-text-muted)' }}>Feedback Hub</span>}
            <button
              className="settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="AI Settings"
            >
              ⚙️
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
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>
                Unlock Classroom Insights
              </h1>
              <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>
                Upload your Zoom transcripts to get a <strong>Referee-Level</strong> review of your teaching dynamics and student engagement.
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: '600px' }}>
              <UploadZone onFileLoaded={handleFileLoaded} />
            </div>
          </div>
        )}

        {view === 'session' && analysisData && (
          <SessionHub analysis={analysisData} fileName={fileName} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}

export default App;
