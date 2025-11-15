import React from 'react';
import type { ModelType } from '../../types';

interface ChatControlsProps {
  model: ModelType;
  useRag: boolean;
  maxChunks: number;
  isLoading: boolean;
  onModelChange: (model: ModelType) => void;
  onUseRagChange: (useRag: boolean) => void;
  onMaxChunksChange: (maxChunks: number) => void;
}

export const ChatControls: React.FC<ChatControlsProps> = ({
  model,
  useRag,
  maxChunks,
  isLoading,
  onModelChange,
  onUseRagChange,
  onMaxChunksChange,
}) => {
  return (
    <div className="chat-controls">
      <div className="control-group">
        <label>
          Model:
          <select 
            value={model} 
            onChange={(e) => onModelChange(e.target.value as ModelType)}
            disabled={isLoading}
          >
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama</option>
          </select>
        </label>
      </div>
      
      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => onUseRagChange(e.target.checked)}
            disabled={isLoading}
          />
          Use RAG
        </label>
      </div>

      {useRag && (
        <div className="control-group">
          <label>
            Max Chunks:
            <input
              type="number"
              min="1"
              max="20"
              value={maxChunks}
              onChange={(e) => onMaxChunksChange(parseInt(e.target.value) || 5)}
              disabled={isLoading}
            />
          </label>
        </div>
      )}
    </div>
  );
};

