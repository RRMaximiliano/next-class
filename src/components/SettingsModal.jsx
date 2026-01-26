import React, { useState, useEffect } from 'react';
import { Toast, useToast } from './Toast';
import './SettingsModal.css';

const AVAILABLE_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2 (Best Quality)', description: 'Most precise and nuanced analysis' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Fast and reliable' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Balanced speed and quality' },
  { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', description: 'Preview model' },
];

const TRANSCRIPT_LENGTH_OPTIONS = [
  { value: 50000, label: '50K chars (~30 min class)', description: 'Lower cost, faster' },
  { value: 80000, label: '80K chars (~50 min class)', description: 'Standard' },
  { value: 120000, label: '120K chars (~75 min class)', description: 'Recommended for GPT-5' },
  { value: 200000, label: '200K chars (~2 hour class)', description: 'Long sessions' },
  { value: 400000, label: '400K chars (full context)', description: 'Uses chunked analysis if needed' },
];

export const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5.2');
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [transcriptMaxLength, setTranscriptMaxLength] = useState(120000);
  const { toast, showToast, hideToast } = useToast();

  // Apply theme to document
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    const stored = localStorage.getItem('openai_key');
    const storedModel = localStorage.getItem('openai_model');
    const storedTheme = localStorage.getItem('theme') || 'light';
    const storedMaxLength = localStorage.getItem('transcript_max_length');
    if (stored) {
      setSavedKey(stored);
      setApiKey(stored);
    }
    if (storedModel) {
      setSelectedModel(storedModel);
    }
    if (storedMaxLength) {
      setTranscriptMaxLength(parseInt(storedMaxLength, 10));
    }
    setSelectedTheme(storedTheme);
    applyTheme(storedTheme);
  }, [isOpen]);

  const validateApiKey = (key) => {
    if (!key) return { valid: true, message: '' }; // Empty is ok (optional)

    // Check prefix
    if (!key.startsWith('sk-')) {
      return { valid: false, message: 'OpenAI keys should start with "sk-"' };
    }

    // Check minimum length (sk- + at least 20 chars)
    if (key.length < 23) {
      return { valid: false, message: 'API key appears too short. Please check your key.' };
    }

    // Check for spaces or invalid characters
    if (/\s/.test(key)) {
      return { valid: false, message: 'API key should not contain spaces.' };
    }

    return { valid: true, message: '' };
  };

  const handleSave = () => {
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    if (apiKey) {
      localStorage.setItem('openai_key', apiKey);
      setSavedKey(apiKey);
    }
    localStorage.setItem('openai_model', selectedModel);
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('transcript_max_length', transcriptMaxLength.toString());
    applyTheme(selectedTheme);
    showToast('Settings saved successfully!', 'success');
    onSave(apiKey);
    // Delay close to show toast
    setTimeout(() => onClose(), 500);
  };

  const handleClear = () => {
    localStorage.removeItem('openai_key');
    localStorage.removeItem('openai_model');
    setApiKey('');
    setSavedKey('');
    setSelectedModel('gpt-5.2');
    showToast('API key cleared', 'info');
  };

  if (!isOpen) return null;

  // Handle Escape key to close modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={(el) => el?.focus()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close settings">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="modal-body">
          <p>Enter your OpenAI API Key to enable <strong>Deep Semantic Analysis</strong>. Your key is stored locally in your browser and never sent to our servers.</p>

          <div className="input-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>AI Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-bg, white)',
                fontSize: '1rem'
              }}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.description}
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Theme</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setSelectedTheme('light'); applyTheme('light'); }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: selectedTheme === 'light' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: selectedTheme === 'light' ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                  fontSize: '0.875rem',
                  fontWeight: selectedTheme === 'light' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                ☀️ Light
              </button>
              <button
                type="button"
                onClick={() => { setSelectedTheme('dark'); applyTheme('dark'); }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: selectedTheme === 'dark' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: selectedTheme === 'dark' ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
                  fontSize: '0.875rem',
                  fontWeight: selectedTheme === 'dark' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Max Transcript Length</label>
            <select
              value={transcriptMaxLength}
              onChange={(e) => setTranscriptMaxLength(parseInt(e.target.value, 10))}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-bg, white)',
                fontSize: '1rem'
              }}
            >
              {TRANSCRIPT_LENGTH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {TRANSCRIPT_LENGTH_OPTIONS.find(o => o.value === transcriptMaxLength)?.description}
              {transcriptMaxLength > 120000 && (
                <span style={{ display: 'block', marginTop: '4px', color: 'var(--color-warning)' }}>
                  Note: Very long transcripts use chunked analysis (multiple API calls)
                </span>
              )}
            </div>
          </div>

          {savedKey && (
            <div className="status-msg success">
              ✓ Key is saved locally.
            </div>
          )}

          <div className="help-text">
            Don't have a key? <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Get one from OpenAI</a>.
          </div>
        </div>

        <div className="modal-footer">
          {savedKey && (
            <button className="btn-danger-text" onClick={handleClear}>Clear Key</button>
          )}
          <button className="btn-primary" onClick={handleSave}>Save & Enable AI</button>
        </div>
      </div>

      {/* Toast Notification */}
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
};
