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
    if (!key) return { valid: true, message: '' };
    if (!key.startsWith('sk-')) {
      return { valid: false, message: 'OpenAI keys should start with "sk-"' };
    }
    if (key.length < 23) {
      return { valid: false, message: 'API key appears too short. Please check your key.' };
    }
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) onClose();
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
          <p>Enter your OpenAI API Key to enable <strong>Deep Semantic Analysis</strong>. Your key is stored locally and never sent to our servers.</p>

          <div className="input-group">
            <label htmlFor="settings-api-key">OpenAI API Key</label>
            <input
              id="settings-api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="settings-model">AI Model</label>
            <select
              id="settings-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <span className="input-hint">
              {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.description}
            </span>
          </div>

          <div className="input-group">
            <label>Theme</label>
            <div className="theme-toggle">
              <button
                type="button"
                className={`theme-option ${selectedTheme === 'light' ? 'active' : ''}`}
                onClick={() => { setSelectedTheme('light'); applyTheme('light'); }}
              >
                Light
              </button>
              <button
                type="button"
                className={`theme-option ${selectedTheme === 'dark' ? 'active' : ''}`}
                onClick={() => { setSelectedTheme('dark'); applyTheme('dark'); }}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="settings-transcript-length">Max Transcript Length</label>
            <select
              id="settings-transcript-length"
              value={transcriptMaxLength}
              onChange={(e) => setTranscriptMaxLength(parseInt(e.target.value, 10))}
            >
              {TRANSCRIPT_LENGTH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="input-hint">
              {TRANSCRIPT_LENGTH_OPTIONS.find(o => o.value === transcriptMaxLength)?.description}
              {transcriptMaxLength > 120000 && (
                <span className="input-warning">
                  Note: Very long transcripts use chunked analysis (multiple API calls)
                </span>
              )}
            </span>
          </div>

          {savedKey && (
            <div className="status-msg success">
              Key is saved locally.
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
          <button className="btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>

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
