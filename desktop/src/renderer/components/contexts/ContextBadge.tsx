import React from 'react';
import type { Context } from '../../services/contextsService';
import { getContextName } from '../../utils/contextUtils';
import './ContextBadge.css';

interface ContextBadgeProps {
  contexts: Context[];
  contextId: string | null;
  className?: string;
}

export const ContextBadge: React.FC<ContextBadgeProps> = ({
  contexts,
  contextId,
  className = '',
}) => {
  const contextName = getContextName(contexts, contextId);
  
  if (!contextName) return null;

  return (
    <span className={`context-badge ${className}`} title={contextName}>
      {contextName}
    </span>
  );
};

