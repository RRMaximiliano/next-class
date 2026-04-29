import React, { useState, useRef } from 'react';
import { Toast } from './Toast';
import { useToast } from './useToast';
import { ConfirmDialog } from './ConfirmDialog';
import { useFocusTrap } from '../utils/useFocusTrap';
import { exportAllData, importData } from '../utils/sessionHistory';
import { downloadAsFile } from '../utils/exportUtils';
import { checkOpenAIConnection } from '../utils/openaiConnection';
import { AVAILABLE_OPENAI_MODELS, DEFAULT_OPENAI_MODEL, normalizeOpenAIModel } from '../utils/openaiModels';
import { DEFAULT_PRIVACY_UPLOAD_BEHAVIOR, PRIVACY_UPLOAD_BEHAVIOR, setPrivacyUploadBehavior } from '../utils/privacyPreferences';
import './SettingsModal.css';

const TRANSCRIPT_LENGTH_OPTIONS = [
  { value: 50000, label: '50K chars (~30 min class)', description: 'Lower cost, faster' },
  { value: 80000, label: '80K chars (~50 min class)', description: 'Standard' },
  { value: 120000, label: '120K chars (~75 min class)', description: 'Recommended for GPT-5' },
  { value: 200000, label: '200K chars (~2 hour class)', description: 'Long sessions' },
  { value: 400000, label: '400K chars (full context)', description: 'Uses chunked analysis if needed' },
];

const getConnectorStatusForSettings = (apiKey, model) => ({
  state: 'idle',
  message: apiKey
    ? `Not checked yet for ${model}.`
    : 'Add an OpenAI API key, then check the connection.',
  checkedAt: null,
});

export const SettingsModal = ({
  isOpen,
  onClose,
  onSave,
  user,
  privacyUploadBehavior,
  onSignOut,
  onOpenPrivacy,
  onShowTour,
}) => {
  const readSettings = () => {
    const stored = localStorage.getItem('openai_key');
    const storedModel = localStorage.getItem('openai_model');
    const storedTheme = localStorage.getItem('theme') || 'light';
    const storedMaxLength = localStorage.getItem('transcript_max_length');
    return {
      apiKey: stored || '',
      savedKey: stored || '',
      selectedModel: normalizeOpenAIModel(storedModel),
      selectedTheme: storedTheme,
      transcriptMaxLength: storedMaxLength ? parseInt(storedMaxLength, 10) : 120000,
      privacyUploadBehavior: privacyUploadBehavior || DEFAULT_PRIVACY_UPLOAD_BEHAVIOR,
    };
  };

  const initial = isOpen ? readSettings() : null;
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_OPENAI_MODEL);
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [transcriptMaxLength, setTranscriptMaxLength] = useState(120000);
  const [selectedPrivacyUploadBehavior, setSelectedPrivacyUploadBehavior] = useState(DEFAULT_PRIVACY_UPLOAD_BEHAVIOR);
  const [loadedForOpen, setLoadedForOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState(getConnectorStatusForSettings('', DEFAULT_OPENAI_MODEL));
  const { toast, showToast, hideToast } = useToast();
  const importInputRef = useRef(null);
  const modalRef = useRef(null);
  useFocusTrap(modalRef, isOpen);

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
    setSelectedPrivacyUploadBehavior(s.privacyUploadBehavior);
    setConnectorStatus(getConnectorStatusForSettings(s.savedKey, s.selectedModel));
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

  const handleApiKeyChange = (e) => {
    const nextApiKey = e.target.value;
    setApiKey(nextApiKey);
    setConnectorStatus({
      state: 'idle',
      message: nextApiKey.trim()
        ? 'Connection not checked for this API key.'
        : 'Add an OpenAI API key, then check the connection.',
      checkedAt: null,
    });
  };

  const handleModelChange = (e) => {
    const nextModel = e.target.value;
    setSelectedModel(nextModel);
    setConnectorStatus({
      state: 'idle',
      message: apiKey.trim()
        ? `Connection not checked for ${nextModel}.`
        : 'Add an OpenAI API key, then check the connection.',
      checkedAt: null,
    });
  };

  const handleCheckConnection = async () => {
    const trimmedApiKey = apiKey.trim();
    const validation = validateApiKey(trimmedApiKey);
    if (!validation.valid) {
      setConnectorStatus({
        state: 'error',
        message: validation.message,
        checkedAt: null,
      });
      showToast(validation.message, 'error');
      return;
    }

    setConnectorStatus({
      state: 'checking',
      message: `Checking OpenAI access to ${selectedModel}...`,
      checkedAt: null,
    });

    try {
      const result = await checkOpenAIConnection({ apiKey: trimmedApiKey, model: selectedModel });
      setConnectorStatus({
        state: result.ok ? 'connected' : 'warning',
        message: result.message,
        checkedAt: result.checkedAt,
      });
      showToast(result.ok ? 'OpenAI connection verified.' : result.message, result.ok ? 'success' : 'info');
    } catch (err) {
      const message = err.message || 'Could not verify OpenAI connection.';
      setConnectorStatus({
        state: 'error',
        message,
        checkedAt: null,
      });
      showToast(message, 'error');
    }
  };

  const handleSave = () => {
    const trimmedApiKey = apiKey.trim();
    const validation = validateApiKey(trimmedApiKey);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    if (trimmedApiKey) {
      localStorage.setItem('openai_key', trimmedApiKey);
      setApiKey(trimmedApiKey);
      setSavedKey(trimmedApiKey);
    }
    localStorage.setItem('openai_model', selectedModel);
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('transcript_max_length', transcriptMaxLength.toString());
    setPrivacyUploadBehavior(selectedPrivacyUploadBehavior);
    applyTheme(selectedTheme);
    showToast('Settings saved successfully!', 'success');
    onSave(trimmedApiKey);
    setTimeout(() => onClose(), 500);
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const doClearKey = () => {
    setShowClearConfirm(false);
    localStorage.removeItem('openai_key');
    localStorage.removeItem('openai_model');
    setApiKey('');
    setSavedKey('');
    setSelectedModel(DEFAULT_OPENAI_MODEL);
    setConnectorStatus(getConnectorStatusForSettings('', DEFAULT_OPENAI_MODEL));
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
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close settings">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="modal-body">
          <p>Enter your OpenAI API Key to enable <strong>transcript analysis</strong>. Your key is stored locally and never sent to our servers.</p>

          <div className="input-group">
            <label htmlFor="settings-api-key">OpenAI API Key</label>
            <input
              id="settings-api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={handleApiKeyChange}
            />
          </div>

          <div className="input-group">
            <label htmlFor="settings-model">AI Model</label>
            <select
              id="settings-model"
              value={selectedModel}
              onChange={handleModelChange}
            >
              {AVAILABLE_OPENAI_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <span className="input-hint">
              {AVAILABLE_OPENAI_MODELS.find(m => m.id === selectedModel)?.description}
            </span>
          </div>

          <div className="connector-card" aria-live="polite">
            <div className="connector-card-header">
              <div>
                <div className="connector-card-title">OpenAI connector</div>
                <div className="connector-card-subtitle">Checks API key validity and access to the selected model.</div>
              </div>
              <span className={`connector-status connector-status-${connectorStatus.state}`}>
                {connectorStatus.state === 'checking' ? 'Checking' :
                  connectorStatus.state === 'connected' ? 'Connected' :
                    connectorStatus.state === 'warning' ? 'Limited' :
                      connectorStatus.state === 'error' ? 'Issue' : 'Not checked'}
              </span>
            </div>
            <p className="connector-card-message">{connectorStatus.message}</p>
            {connectorStatus.checkedAt && (
              <p className="connector-card-timestamp">
                Last checked {new Date(connectorStatus.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            <button
              type="button"
              className={`btn-secondary btn-sm ${connectorStatus.state === 'checking' ? 'btn-loading' : ''}`}
              onClick={handleCheckConnection}
              disabled={!apiKey.trim() || connectorStatus.state === 'checking'}
            >
              {connectorStatus.state === 'checking' && <span className="btn-spinner" aria-hidden="true" />}
              {connectorStatus.state === 'checking' ? 'Checking...' : 'Check connection'}
            </button>
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

          <div className="input-group">
            <label htmlFor="settings-privacy-upload">Privacy Check On Upload</label>
            <select
              id="settings-privacy-upload"
              value={selectedPrivacyUploadBehavior}
              onChange={(e) => setSelectedPrivacyUploadBehavior(e.target.value)}
            >
              <option value={PRIVACY_UPLOAD_BEHAVIOR.LIGHT_PROMPT}>Show a short privacy prompt</option>
              <option value={PRIVACY_UPLOAD_BEHAVIOR.FULL_REVIEW}>Open the full anonymization review</option>
              <option value={PRIVACY_UPLOAD_BEHAVIOR.SKIP}>Skip upload privacy prompts</option>
            </select>
            <span className="input-hint">
              {selectedPrivacyUploadBehavior === PRIVACY_UPLOAD_BEHAVIOR.LIGHT_PROMPT
                ? 'Recommended. Warns you when likely names are found, then lets you decide whether to review anonymization.'
                : selectedPrivacyUploadBehavior === PRIVACY_UPLOAD_BEHAVIOR.FULL_REVIEW
                  ? 'Best if you always want to inspect names before analysis starts.'
                  : 'Uploads continue with the original transcript unless you manually review before running analysis.'}
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

          <div className="settings-divider" />
          <div className="input-group">
            <label>Help</label>
            <button className="btn-secondary btn-sm" onClick={onShowTour}>
              Show onboarding tour
            </button>
            <span className="input-hint">Walk through the main features of the app.</span>
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
          <span className="settings-version">v{__APP_VERSION__}</span>
          <div className="modal-footer-actions">
            {savedKey && (
              <button className="btn-danger-text" onClick={handleClear}>Clear Key</button>
            )}
            <button className="btn-primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear API key?"
        message="Remove your saved API key? You will need to re-enter it to use AI features."
        confirmLabel="Clear Key"
        variant="danger"
        onConfirm={doClearKey}
        onCancel={() => setShowClearConfirm(false)}
      />

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
