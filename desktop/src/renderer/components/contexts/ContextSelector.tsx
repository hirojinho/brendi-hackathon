import React from 'react';
import type { Context } from '../../services/contextsService';
import { getContextOptions } from '../../utils/contextUtils';
import './ContextSelector.css';

interface ContextSelectorProps {
  contexts: Context[];
  value: string | null;
  onChange: (contextId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  showNoneOption?: boolean;
  className?: string;
}

export const ContextSelector: React.FC<ContextSelectorProps> = ({
  contexts,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select source...',
  showNoneOption = true,
  className = '',
}) => {
  return (
    <select
      value={value || 'none'}
      onChange={(e) => onChange(e.target.value === 'none' ? null : e.target.value)}
      disabled={disabled}
      className={`context-selector ${className}`}
    >
      {showNoneOption && <option value="none">{placeholder}</option>}
      {getContextOptions(contexts).map(option => (
        <option key={option.id} value={option.id} title={option.name}>
          {option.displayName}
        </option>
      ))}
    </select>
  );
};

