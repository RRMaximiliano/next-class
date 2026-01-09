import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

export const SettingsModal = ({ isOpen, onClose, onSave }) => {
    const [apiKey, setApiKey] = useState('');
    const [savedKey, setSavedKey] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('openai_key');
        if (stored) {
            setSavedKey(stored);
            setApiKey(stored);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!apiKey.startsWith('sk-')) {
            alert('Invalid Key: OpenAI keys usually start with "sk-"');
            return;
        }
        localStorage.setItem('openai_key', apiKey);
        setSavedKey(apiKey);
        onSave(apiKey);
        onClose();
    };

    const handleClear = () => {
        localStorage.removeItem('openai_key');
        setApiKey('');
        setSavedKey('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>⚙️ AI Settings</h3>
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
