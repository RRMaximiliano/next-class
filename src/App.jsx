import React, { useState } from 'react';
import './App.css';
import { UploadZone } from './components/UploadZone';
import { Dashboard } from './components/Dashboard';
import { parseTranscript } from './utils/transcriptParser';
import { analyzeClass } from './utils/classAnatomy';

function App() {
  const [view, setView] = useState('upload'); // upload, dashboard
  const [analysisData, setAnalysisData] = useState(null);
  const [fileName, setFileName] = useState('');

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
      setAnalysisData(analysis);
      setView('dashboard');
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
          {view === 'dashboard' && <span style={{ color: 'var(--color-text-muted)' }}>{fileName}</span>}
        </div>
      </header>

      <main className="main-content container">
        {view === 'upload' && (
          <div className="flex-col flex-center" style={{ minHeight: '60vh', gap: 'var(--spacing-xl)' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>
                Unlock Classroom Insights
              </h1>
              <p style={{ fontSize: '1.25rem' }}>
                Upload your Zoom transcripts to visualize the anatomy of your class: speaking time, interaction density, and engagement patterns.
              </p>
            </div>

            <div style={{ width: '100%', maxWidth: '600px' }}>
              <UploadZone onFileLoaded={handleFileLoaded} />
            </div>
          </div>
        )}

        {view === 'dashboard' && analysisData && (
          <Dashboard analysis={analysisData} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}

export default App;
