import React from 'react';
import { useSettings } from '../hooks/useSettings';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    openaiKey,
    openrouterKey,
    ollamaUrl,
    provider,
    modelName,
    isLoading,
    saveStatus,
    setOpenaiKey,
    setOpenrouterKey,
    setOllamaUrl,
    setProvider,
    setModelName,
    saveSettings,
  } = useSettings(isOpen);

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
            <h3>Model Configuration</h3>
            <p className="settings-description">
              Choose your AI provider and model. Settings are saved automatically.
            </p>

            <div className="settings-field">
              <label>
                Provider
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'openai' | 'openrouter' | 'ollama')}
                  disabled={isLoading}
                >
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                </select>
              </label>
              <small>Select the AI provider to use</small>
            </div>

            <div className="settings-field">
              <label>
                Model Name
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={
                    provider === 'openai' 
                      ? 'gpt-4o-mini' 
                      : provider === 'openrouter'
                      ? 'meta-llama/llama-3.3-8b-instruct:free'
                      : 'phi3:latest'
                  }
                  disabled={isLoading}
                />
              </label>
              <small>
                {provider === 'openai' && 'Leave empty to use default (gpt-4.1-mini) or specify: gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo'}
                {provider === 'openrouter' && 'Model ID from OpenRouter (e.g., meta-llama/llama-3.3-8b-instruct:free)'}
                {provider === 'ollama' && 'Model name from your local Ollama instance (e.g., phi3:latest, llama3, mistral)'}
              </small>
            </div>
          </div>

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
              onClick={saveSettings}
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
