import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [openaiKey, setOpenaiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const [openai, openrouter, ollama] = await Promise.all([
        window.electronAPI.getConfig('openaiApiKey'),
        window.electronAPI.getConfig('openrouterApiKey'),
        window.electronAPI.getConfig('ollamaBaseUrl'),
      ]);

      setOpenaiKey(openai || '');
      setOpenrouterKey(openrouter || '');
      setOllamaUrl(ollama || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('');

    try {
      await Promise.all([
        openaiKey ? window.electronAPI.setConfig('openaiApiKey', openaiKey) : window.electronAPI.setConfig('openaiApiKey', ''),
        openrouterKey ? window.electronAPI.setConfig('openrouterApiKey', openrouterKey) : window.electronAPI.setConfig('openrouterApiKey', ''),
        ollamaUrl ? window.electronAPI.setConfig('ollamaBaseUrl', ollamaUrl) : window.electronAPI.setConfig('ollamaBaseUrl', ''),
      ]);

      setSaveStatus('Settings saved! Restart the app for API keys to take effect.');
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setSaveStatus(`Error: ${error.message || 'Failed to save settings'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>API Keys</h3>
            <p className="settings-description">
              Configure API keys for the AI models. Keys are stored locally and encrypted.
            </p>

            <div className="settings-field">
              <label>
                OpenAI API Key
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  disabled={isLoading}
                />
              </label>
              <small>Required for OpenAI models</small>
            </div>

            <div className="settings-field">
              <label>
                OpenRouter API Key
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  disabled={isLoading}
                />
              </label>
              <small>Required for OpenRouter models</small>
            </div>

            <div className="settings-field">
              <label>
                Ollama Base URL
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  disabled={isLoading}
                />
              </label>
              <small>URL for your local Ollama instance (default: http://localhost:11434)</small>
            </div>
          </div>

          {saveStatus && (
            <div className={`settings-status ${saveStatus.includes('Error') ? 'error' : 'success'}`}>
              {saveStatus}
            </div>
          )}

          <div className="settings-footer">
            <button
              className="settings-cancel-btn"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="settings-save-btn"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

