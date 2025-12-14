import React, { useEffect, useCallback, useState } from 'react';
import { useNotificationHelpers } from '../common/NotificationSystem';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { runAllWorkflows, WorkflowResult } from '../../utils/workflowTester';
import { useSystemPreferences } from '../../hooks/useSystemPreferences';

interface ApplicationIntegrationProps {
  children: React.ReactNode;
}

interface IntegrationState {
  isInitialized: boolean;
  hasErrors: boolean;
  workflowResults: { [key: string]: WorkflowResult } | null;
  performanceMetrics: any;
}

/**
 * ApplicationIntegration component provides comprehensive integration
 * between all application components, handles global error states,
 * and manages workflow testing and performance monitoring.
 */
export const ApplicationIntegration: React.FC<ApplicationIntegrationProps> = ({ children }) => {
  const [state, setState] = useState<IntegrationState>({
    isInitialized: false,
    hasErrors: false,
    workflowResults: null,
    performanceMetrics: null
  });

  const { showSuccess, showError, showWarning, showInfo } = useNotificationHelpers();
  const systemPreferences = useSystemPreferences();

  // Initialize application integration
  const initializeIntegration = useCallback(async () => {
    try {
      console.log('[ApplicationIntegration] Initializing application integration...');
      
      // Start performance monitoring
      const initStart = performance.now();
      
      // Check system health
      const healthCheck = await performHealthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`System health check failed: ${healthCheck.error}`);
      }

      // Initialize performance monitoring
      performanceMonitor.startOperation('application-integration');
      
      // Run integration workflows in development mode
      if (process.env.NODE_ENV === 'development') {
        try {
          const workflowResults = await runAllWorkflows();
          setState(prev => ({ ...prev, workflowResults }));
          
          const failedWorkflows = Object.entries(workflowResults)
            .filter(([_, result]) => !result.success);
          
          if (failedWorkflows.length > 0) {
            showWarning(
              'Integration Issues Detected',
              `${failedWorkflows.length} workflow(s) failed during integration testing`
            );
          } else {
            showSuccess('Integration Complete', 'All workflows passed successfully');
          }
        } catch (workflowError) {
          console.warn('[ApplicationIntegration] Workflow testing failed:', workflowError);
          showWarning('Workflow Testing Failed', 'Some integration tests could not run');
        }
      }

      // Collect performance metrics
      const initEnd = performance.now();
      const metrics = {
        initializationTime: initEnd - initStart,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        timestamp: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        isInitialized: true,
        hasErrors: false,
        performanceMetrics: metrics
      }));

      console.log('[ApplicationIntegration] Integration initialized successfully', metrics);
      
    } catch (error) {
      console.error('[ApplicationIntegration] Initialization failed:', error);
      setState(prev => ({ ...prev, hasErrors: true, isInitialized: false }));
      showError(
        'Application Integration Failed',
        error instanceof Error ? error.message : 'Unknown initialization error'
      );
    }
  }, [showSuccess, showError, showWarning]);

  // Perform system health check
  const performHealthCheck = async (): Promise<{ healthy: boolean; error?: string }> => {
    try {
      // Check backend connectivity
      if (window.electronAPI?.serverHealth) {
        const healthResult = await window.electronAPI.serverHealth();
        if (!healthResult.healthy) {
          return { healthy: false, error: healthResult.error || 'Backend not available' };
        }
      }

      // Check essential DOM elements
      const essentialElements = [
        'body',
        '#root'
      ];

      for (const selector of essentialElements) {
        if (!document.querySelector(selector)) {
          return { healthy: false, error: `Essential element missing: ${selector}` };
        }
      }

      // Check system preferences integration
      if (!systemPreferences) {
        return { healthy: false, error: 'System preferences not available' };
      }

      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Health check failed' 
      };
    }
  };

  // Handle global application errors
  const handleGlobalError = useCallback((error: Error, errorInfo?: any) => {
    console.error('[ApplicationIntegration] Global error:', error, errorInfo);
    
    setState(prev => ({ ...prev, hasErrors: true }));
    
    // Show user-friendly error notification
    showError(
      'Application Error',
      'An unexpected error occurred. The application will attempt to recover.',
      {
        persistent: true,
        action: {
          label: 'Reload',
          onClick: () => window.location.reload()
        }
      }
    );

    // Log error for debugging
    performanceMonitor.recordError('global-error', error.message);
  }, [showError]);

  // Handle window focus and visibility changes
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Application is hidden, pause non-essential operations
      console.log('[ApplicationIntegration] Application hidden, pausing operations');
    } else {
      // Application is visible, resume operations
      console.log('[ApplicationIntegration] Application visible, resuming operations');
    }
  }, []);

  // Handle keyboard shortcuts for integration features
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    // Development-only shortcuts
    if (process.env.NODE_ENV === 'development') {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey) {
        switch (event.key) {
          case 'I':
            // Toggle integration info
            event.preventDefault();
            if (state.performanceMetrics) {
              showInfo(
                'Integration Status',
                `Initialized: ${state.isInitialized}, Errors: ${state.hasErrors}, Init Time: ${state.performanceMetrics.initializationTime.toFixed(2)}ms`
              );
            }
            break;
          case 'T':
            // Run workflow tests
            event.preventDefault();
            runAllWorkflows().then(results => {
              const summary = Object.entries(results)
                .map(([name, result]) => `${name}: ${result.success ? '✓' : '✗'}`)
                .join(', ');
              showInfo('Workflow Test Results', summary);
            });
            break;
          case 'P':
            // Show performance metrics
            event.preventDefault();
            const metrics = performanceMonitor.getMetrics();
            showInfo(
              'Performance Metrics',
              `Operations: ${metrics.operationCount}, Avg Duration: ${metrics.averageDuration.toFixed(2)}ms`
            );
            break;
        }
      }
    }
  }, [state, showInfo]);

  // Initialize on mount
  useEffect(() => {
    initializeIntegration();
  }, [initializeIntegration]);

  // Set up global event listeners
  useEffect(() => {
    // Global error handling
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleGlobalError(new Error(event.reason));
    };

    const handleError = (event: ErrorEvent) => {
      handleGlobalError(new Error(event.message));
    };

    // Visibility change handling
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleGlobalError, handleVisibilityChange, handleKeyboardShortcuts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up performance monitoring on unmount
      console.log('[ApplicationIntegration] Component unmounting, cleaning up performance monitoring');
    };
  }, []);

  // Render integration status for development
  const renderIntegrationStatus = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div 
        className="integration-status"
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'var(--color-surface-secondary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 'var(--radius-medium)',
          padding: 'var(--spacing-2)',
          fontSize: 'var(--font-size-caption-1)',
          color: 'var(--color-text-secondary)',
          zIndex: 'var(--z-tooltip)',
          fontFamily: 'var(--font-family-mono)',
          maxWidth: '200px'
        }}
      >
        <div>Status: {state.isInitialized ? '✓' : '⏳'}</div>
        <div>Errors: {state.hasErrors ? '⚠️' : '✓'}</div>
        {state.performanceMetrics && (
          <div>Init: {state.performanceMetrics.initializationTime.toFixed(0)}ms</div>
        )}
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