import React from 'react';

interface StatusMessageProps {
  message: string;
  error?: string;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message, error }) => {
  return (
    <div className="status-message">
      <p>{message}</p>
      {error && <p className="status-error">{error}</p>}
    </div>
  );
};

