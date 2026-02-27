import React, { useState, useRef } from 'react';
import { Toast } from './Toast';
import { useToast } from './useToast';
import { exportAllData, importData } from '../utils/sessionHistory';
import { downloadAsFile } from '../utils/exportUtils';
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

export const SettingsModal = ({ isOpen, onClose, onSave, user, onSignOut, onOpenPrivacy }) => {
  const readSettings = () => {
    const stored = localStorage.getItem('openai_key');
    const storedModel = localStorage.getItem('openai_model');
    const storedTheme = localStorage.getItem('theme') || 'light';
    const storedMaxLength = localStorage.getItem('transcript_max_length');
    return {
      apiKey: stored || '',
      savedKey: stored || '',
      selectedModel: storedModel || 'gpt-5.2',
      selectedTheme: storedTheme,
      transcriptMaxLength: storedMaxLength ? parseInt(storedMaxLength, 10) : 120000,
    };
  };

  const initial = isOpen ? readSettings() : null;
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5.2');
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [transcriptMaxLength, setTranscriptMaxLength] = useState(120000);
  const [loadedForOpen, setLoadedForOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const importInputRef = useRef(null);

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  // Sync state from localStorage when modal opens
  if (isOpen && !loadedForOpen) {
    const s = initial || readSettings();
    setApiKey(s.apiKey);
    setSavedKey(s.savedKey);
    setSelectedModel(s.selectedModel);
    setSelectedTheme(s.selectedTheme);
    setTranscriptMaxLength(s.transcriptMaxLength);
    applyTheme(s.selectedTheme);
    setLoadedForOpen(true);
  }
  if (!isOpen && loadedForOpen) {
    setLoadedForOpen(false);
  }

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
    if (!window.confirm('Remove your saved API key? You will need to re-enter it to use AI features.')) return;
    localStorage.removeItem('openai_key');
    localStorage.removeItem('openai_model');
    setApiKey('');
    setSavedKey('');
    setSelectedModel('gpt-5.2');
    showToast('API key cleared', 'info');
  };

  const handleExportData = () => {
    const json = exportAllData();
    const date = new Date().toISOString().split('T')[0];
    downloadAsFile(json, `next-class-backup-${date}.json`, 'application/json');
    showToast('Data exported successfully!', 'success');
  };

  const handleImportData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = importData(event.target.result);
        showToast(`Imported ${result.imported} session(s)${result.skipped ? `, ${result.skipped} skipped (duplicates)` : ''}.`, 'success');
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = '';
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

          <div className="settings-divider" />
          <div className="input-group">
            <label>Data Management</label>
            <div className="data-management-actions">
              <button className="btn-secondary btn-sm" onClick={handleExportData}>
                Export All Data
              </button>
              <button className="btn-secondary btn-sm" onClick={() => importInputRef.current?.click()}>
                Import Data
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
            </div>
            <span className="input-hint">Export sessions as JSON backup, or restore from a previous export.</span>
          </div>
        </div>

        {user && (
          <div className="settings-account">
            <div className="settings-divider" />
            <div className="settings-account-header">Account</div>
            <div className="settings-account-info">
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="settings-account-avatar"
              />
              <div className="settings-account-details">
                <span className="settings-account-name">{user.displayName}</span>
                <span className="settings-account-email">{user.email}</span>
              </div>
            </div>
            <div className="settings-account-actions">
              <button className="btn-danger-text" onClick={onSignOut}>Sign out</button>
              <button className="text-btn" onClick={onOpenPrivacy}>Privacy</button>
            </div>
          </div>
        )}

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
