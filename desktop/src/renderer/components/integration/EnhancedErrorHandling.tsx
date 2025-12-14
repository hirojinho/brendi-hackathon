import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { useNotificationHelpers } from '../common/NotificationSystem';
import { FadeTransition, ScaleTransition } from '../common/Transitions';
import { performanceMonitor } from '../../utils/performanceMonitor';

interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorDetails: ErrorDetails | null;
  retryCount: number;
  isRecovering: boolean;
}

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (errorDetails: ErrorDetails) => void;
  maxRetries?: number;
  enableRecovery?: boolean;
  showErrorDetails?: boolean;
}

/**
 * Enhanced Error Boundary with comprehensive error handling,
 * automatic recovery, and detailed error reporting
 */
export class EnhancedErrorBoundary extends Component<EnhancedErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.state = {
      hasError: false,
      errorDetails: null,
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId
    };

    this.setState({ errorDetails });

    // Log error details
    console.error('[EnhancedErrorBoundary] Error caught:', errorDetails);
    
    // Record error in performance monitor
    performanceMonitor.recordError('component-error', error.message);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(errorDetails);
    }

    // Attempt automatic recovery if enabled
    if (this.props.enableRecovery && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.attemptRecovery();
    }
  }

  private attemptRecovery = () => {
    this.setState({ isRecovering: true });
    
    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        errorDetails: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }));
    }, 2000); // Wait 2 seconds before retry
  };

  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      errorDetails: null,
      retryCount: 0,
      isRecovering: false
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportError = () => {
    if (this.state.errorDetails) {
      // In a real app, this would send to an error reporting service
      console.log('[EnhancedErrorBoundary] Error report:', {
        ...this.state.errorDetails,
        retryCount: this.state.retryCount
      });
      
      // Show confirmation to user
      alert('Error report has been logged. Thank you for helping us improve the application.');
    }
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show recovery indicator
      if (this.state.isRecovering) {
        return (
          <div className="error-recovery">
            <FadeTransition isVisible={true} duration={300}>
              <div className="error-recovery-content">
                <div className="recovery-spinner" />
                <h3>Recovering...</h3>
                <p>Attempting to restore the application</p>
              </div>
            </FadeTransition>
          </div>
        );
      }

      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Enhanced default error UI
      return (
        <ScaleTransition isVisible={true} duration={400}>
          <div className="enhanced-error-boundary">
            <div className="error-content">
              <div className="error-header">
                <div className="error-icon" role="img" aria-label="Error">
                  ⚠️
                </div>
                <h2 className="error-title">Something went wrong</h2>
                <p className="error-subtitle">
                  We're sorry, but an unexpected error occurred
                </p>
              </div>

              <div className="error-details-summary">
                <p className="error-message">
                  {this.state.errorDetails?.error.message || 'An unexpected error occurred'}
                </p>
                
                {this.state.retryCount > 0 && (
                  <p className="retry-info">
                    Retry attempts: {this.state.retryCount} / {this.props.maxRetries || 3}
                  </p>
                )}
              </div>

              <div className="error-actions">
                <button 
                  onClick={this.handleManualRetry}
                  className="macos-button macos-button--primary macos-button--medium"
                  disabled={this.state.retryCount >= (this.props.maxRetries || 3)}
                >
                  Try Again
                </button>
                
                <button 
                  onClick={this.handleReload}
                  className="macos-button macos-button--secondary macos-button--medium"
                >
                  Reload Application
                </button>
                
                <button 
                  onClick={this.handleReportError}
                  className="macos-button macos-button--tertiary macos-button--medium"
                >
                  Report Issue
                </button>
              </div>

              {(this.props.showErrorDetails || process.env.NODE_ENV === 'development') && 
               this.state.errorDetails && (
                <ErrorDetailsPanel errorDetails={this.state.errorDetails} />
              )}
            </div>
          </div>
        </ScaleTransition>
      );
    }

    return this.props.children;
  }
}

interface ErrorDetailsPanelProps {
  errorDetails: ErrorDetails;
}

const ErrorDetailsPanel: React.FC<ErrorDetailsPanelProps> = ({ errorDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="error-details-panel">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="error-details-toggle"
        aria-expanded={isExpanded}
      >
        {isExpanded ? '▼' : '▶'} Technical Details
      </button>
      
      <FadeTransition isVisible={isExpanded} duration={200}>
        <div className="error-details-content">
          <div className="error-detail-section">
            <h4>Error Information</h4>
            <div className="error-detail-item">
              <strong>Message:</strong> {errorDetails.error.message}
            </div>
            <div className="error-detail-item">
              <strong>Type:</strong> {errorDetails.error.name}
            </div>
            <div className="error-detail-item">
              <strong>Timestamp:</strong> {errorDetails.timestamp.toISOString()}
            </div>
            <div className="error-detail-item">
              <strong>Session ID:</strong> {errorDetails.sessionId}
            </div>
          </div>

          <div className="error-detail-section">
            <h4>Stack Trace</h4>
            <pre className="error-stack">
              {errorDetails.error.stack}
            </pre>
          </div>

          <div className="error-detail-section">
            <h4>Component Stack</h4>
            <pre className="error-component-stack">
              {errorDetails.errorInfo.componentStack}
            </pre>
          </div>

          <div className="error-detail-section">
            <h4>Environment</h4>
            <div className="error-detail-item">
              <strong>URL:</strong> {errorDetails.url}
            </div>
            <div className="error-detail-item">
              <strong>User Agent:</strong> {errorDetails.userAgent}
            </div>
          </div>
        </div>
      </FadeTransition>
    </div>
  );
};

/**
 * Hook for handling async errors in functional components
 */
export const useAsyncErrorHandler = () => {
  const { showError } = useNotificationHelpers();

  const handleAsyncError = React.useCallback((error: Error, context?: string) => {
    console.error(`[AsyncError${context ? ` - ${context}` : ''}]:`, error);
    
    // Record error in performance monitor
    performanceMonitor.recordError('async-error', error.message);
    
    // Show user notification
    showError(
      'Operation Failed',
      error.message,
      {
        action: {
          label: 'Retry',
          onClick: () => {
            // This would need to be implemented by the calling component
            console.log('Retry requested for async error');
          }
        }
      }
    );
  }, [showError]);

  return { handleAsyncError };
};

/**
 * Higher-order component for wrapping components with enhanced error handling
 */
export const withEnhancedErrorHandling = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Partial<EnhancedErrorBoundaryProps>
) => {
  const WithEnhancedErrorHandling: React.FC<P> = (props) => {
    return (
      <EnhancedErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </EnhancedErrorBoundary>
    );
  };

  WithEnhancedErrorHandling.displayName = 
    `withEnhancedErrorHandling(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithEnhancedErrorHandling;
};

/**
 * Network error handler with retry logic
 */
export const useNetworkErrorHandler = () => {
  const { showError, showWarning } = useNotificationHelpers();

  const handleNetworkError = React.useCallback(async (
    error: Error,
    retryFn?: () => Promise<any>,
    maxRetries: number = 3
  ) => {
    let retryCount = 0;
    
    const attemptRetry = async (): Promise<any> => {
      try {
        if (retryFn) {
          return await retryFn();
        }
      } catch (retryError) {
        retryCount++;
        
        if (retryCount < maxRetries) {
          showWarning(
            'Connection Issue',
            `Retrying... (${retryCount}/${maxRetries})`
          );
          
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return attemptRetry();
        } else {
          showError(
            'Network Error',
            'Unable to connect after multiple attempts. Please check your connection.',
            { persistent: true }
          );
          throw retryError;
        }
      }
    };

    return attemptRetry();
  }, [showError, showWarning]);

  return { handleNetworkError };
};