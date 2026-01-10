import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

const AVAILABLE_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2 (Best Quality)', description: 'Most precise and nuanced analysis' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Fast and reliable' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Balanced speed and quality' },
  { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', description: 'Preview model' },
];

export const SettingsModal = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-5.2');

  useEffect(() => {
    const stored = localStorage.getItem('openai_key');
    const storedModel = localStorage.getItem('openai_model');
    if (stored) {
      setSavedKey(stored);
      setApiKey(stored);
    }
    if (storedModel) {
      setSelectedModel(storedModel);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.startsWith('sk-')) {
      alert('Invalid Key: OpenAI keys usually start with "sk-"');
      return;
    }
    localStorage.setItem('openai_key', apiKey);
    localStorage.setItem('openai_model', selectedModel);
    setSavedKey(apiKey);
    onSave(apiKey);
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem('openai_key');
    localStorage.removeItem('openai_model');
    setApiKey('');
    setSavedKey('');
    setSelectedModel('gpt-5.2');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
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
    </div>
  );
};
