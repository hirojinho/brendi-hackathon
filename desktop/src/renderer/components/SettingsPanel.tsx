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
    globalShortcut,
    defaultMode,
    maxQuickNotes,
    reviewAgeThresholdHours,
    isLoading,
    saveStatus,
    setOpenaiKey,
    setOpenrouterKey,
    setOllamaUrl,
    setProvider,
    setModelName,
    setGlobalShortcut,
    setDefaultMode,
    setMaxQuickNotes,
    setReviewAgeThresholdHours,
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
            
            {/* Current configuration display */}
            <div style={{ 
              background: 'rgba(0, 122, 255, 0.1)', 
              border: '1px solid rgba(0, 122, 255, 0.2)', 
              borderRadius: '8px', 
              padding: '12px', 
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <strong>Current:</strong> {provider} 
              {modelName && ` (${modelName})`}
              {!modelName && provider === 'openrouter' && ' (meta-llama/llama-3.3-8b-instruct:free)'}
              {!modelName && provider === 'openai' && ' (gpt-4o-mini)'}
              {!modelName && provider === 'ollama' && ' (phi3:latest)'}
            </div>

            <div className="settings-field">
              <label>
                Provider
                <select
                  value={provider}
                  onChange={(e) => {
                    const newProvider = e.target.value as 'openai' | 'openrouter' | 'ollama';
                    setProvider(newProvider);
                    // Auto-save provider changes immediately
                    setTimeout(() => saveSettings(), 100);
                  }}
                  disabled={isLoading}
                >
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                </select>
              </label>
              <small>Select the AI provider to use (auto-saved)</small>
            </div>

            <div className="settings-field">
              <label>
                Model Name
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  onBlur={() => {
                    // Auto-save model name when user finishes editing
                    setTimeout(() => saveSettings(), 100);
                  }}
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
                {provider === 'openai' && 'Leave empty to use default (gpt-4o-mini) or specify: gpt-4o-mini, gpt-4o, gpt-4-turbo, gpt-3.5-turbo (auto-saved)'}
                {provider === 'openrouter' && 'Model ID from OpenRouter (e.g., meta-llama/llama-3.3-8b-instruct:free) (auto-saved)'}
                {provider === 'ollama' && 'Model name from your local Ollama instance (e.g., phi3:latest, llama3, mistral) (auto-saved)'}
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

          <div className="settings-section">
            <h3>Application Mode</h3>
            <p className="settings-description">
              Choose the default mode when opening the overlay.
            </p>

            <div className="settings-field">
              <label>
                Default Mode
                <select
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value as 'chat' | 'note-taking')}
                  disabled={isLoading}
                >
                  <option value="chat">Chat Mode</option>
                  <option value="note-taking">Note-Taking Agent Mode</option>
                </select>
              </label>
              <small>
                Chat Mode: Interactive Q&A with automatic note generation. Note-Taking Agent Mode: Quick natural language input for fast note capture.
              </small>
            </div>
          </div>

          <div className="settings-section">
            <h3>Smart Notes Configuration</h3>
            <p className="settings-description">
              Configure note limits and review settings for the smart notes workflow.
            </p>

            <div className="settings-field">
              <label>
                Maximum Quick Notes
                <input
                  type="number"
                  value={maxQuickNotes}
                  onChange={(e) => setMaxQuickNotes(parseInt(e.target.value, 10) || 10)}
                  min="1"
                  max="50"
                  disabled={isLoading}
                />
              </label>
              <small>Maximum number of quick notes before review is required (default: 10)</small>
            </div>

            <div className="settings-field">
              <label>
                Review Age Threshold (hours)
                <input
                  type="number"
                  value={reviewAgeThresholdHours}
                  onChange={(e) => setReviewAgeThresholdHours(parseInt(e.target.value, 10) || 24)}
                  min="1"
                  max="168"
                  disabled={isLoading}
                />
              </label>
              <small>Hours after which quick notes require review (default: 24 hours)</small>
            </div>
          </div>

          <div className="settings-section">
            <h3>Keyboard Shortcut</h3>
            <p className="settings-description">
              Configure the global keyboard shortcut to toggle the overlay window.
            </p>

            <div className="settings-field">
              <label>
                Global Shortcut
                <input
                  type="text"
                  value={globalShortcut}
                  onChange={(e) => setGlobalShortcut(e.target.value)}
                  placeholder="CmdOrCtrl+Shift+Space"
                  disabled={isLoading}
                />
              </label>
              <small>
                Format: CmdOrCtrl+Shift+Space (use CmdOrCtrl for macOS/Windows, Command/Control for specific, Alt/Option, Shift, and key names like Space, A, B, etc.)
              </small>
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
