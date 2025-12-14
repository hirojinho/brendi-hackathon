import React, { useEffect, useCallback, useState } from 'react';
import { useNotificationHelpers } from '../common/NotificationSystem';

interface SimpleApplicationIntegrationProps {
  children: React.ReactNode;
}

interface IntegrationState {
  isInitialized: boolean;
  hasErrors: boolean;
}

/**
 * Simplified ApplicationIntegration component that provides basic
 * integration without complex workflows or performance monitoring
 * that might cause crashes.
 */
export const SimpleApplicationIntegration: React.FC<SimpleApplicationIntegrationProps> = ({ children }) => {
  const [state, setState] = useState<IntegrationState>({
    isInitialized: false,
    hasErrors: false
  });

  const { showError } = useNotificationHelpers();

  // Simple initialization without complex async operations
  const initializeIntegration = useCallback(async () => {
    try {
      console.log('[SimpleApplicationIntegration] Initializing...');
      
      // Simple health check - just verify basic DOM elements exist
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        throw new Error('Root element not found');
      }

      setState(prev => ({
        ...prev,
        isInitialized: true,
        hasErrors: false
      }));

      console.log('[SimpleApplicationIntegration] Initialized successfully');
      
    } catch (error) {
      console.error('[SimpleApplicationIntegration] Initialization failed:', error);
      setState(prev => ({ ...prev, hasErrors: true, isInitialized: false }));
      showError(
        'Application Integration Failed',
        error instanceof Error ? error.message : 'Unknown initialization error'
      );
    }
  }, [showError]);

  // Handle global application errors (simplified)
  const handleGlobalError = useCallback((error: Error) => {
    console.error('[SimpleApplicationIntegration] Global error:', error);
    
    setState(prev => ({ ...prev, hasErrors: true }));
    
    // Show user-friendly error notification
    showError(
      'Application Error',
      'An unexpected error occurred. Please try refreshing the application.'
    );
  }, [showError]);

  // Initialize on mount
  useEffect(() => {
    initializeIntegration();
  }, [initializeIntegration]);

  // Set up minimal global error handling
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleGlobalError(new Error(event.reason));
    };

    const handleError = (event: ErrorEvent) => {
      handleGlobalError(new Error(event.message));
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleGlobalError]);

  // Render simple status for development
  const renderIntegrationStatus = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10000,
          fontFamily: 'monospace'
        }}
      >
        <div>Integration: {state.isInitialized ? '✓' : '⏳'}</div>
        <div>Errors: {state.hasErrors ? '⚠️' : '✓'}</div>
      </div>
    );
  };

  return (
    <>
      {children}
      {renderIntegrationStatus()}
    </>
  );
};