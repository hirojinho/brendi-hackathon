import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApplicationIntegration } from '../ApplicationIntegration';
import { EnhancedErrorBoundary } from '../EnhancedErrorHandling';
import { MacOSFadeTransition, MacOSSlideTransition } from '../EnhancedTransitions';
import { WorkflowValidator } from '../WorkflowValidator';
import { NotificationProvider } from '../../common/NotificationSystem';

// Mock electron API
const mockElectronAPI = {
  serverHealth: jest.fn(),
  toggleOverlay: jest.fn(),
  openMainWindow: jest.fn(),
  setState: jest.fn(),
  getState: jest.fn()
};

(global as any).window.electronAPI = mockElectronAPI;

// Mock performance API
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 1000000
  },
  writable: true
});

// Mock performance monitor
jest.mock('../../../utils/performanceMonitor', () => ({
  performanceMonitor: {
    startSession: jest.fn(),
    endSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
    recordError: jest.fn(),
    timeOperation: jest.fn((name, fn) => ({ result: fn() })),
    timeAsyncOperation: jest.fn(async (name, fn) => ({ result: await fn() })),
    getMetrics: jest.fn(() => ({
      operationCount: 0,
      averageDuration: 0
    }))
  }
}));

// Mock workflow tester
jest.mock('../../../utils/workflowTester', () => ({
  runAllWorkflows: jest.fn(() => Promise.resolve({})),
  createOverlayToMainWindowWorkflow: jest.fn(() => ({
    runWorkflow: jest.fn(() => Promise.resolve({
      success: true,
      completedSteps: ['step1', 'step2'],
      duration: 100
    }))
  })),
  createNotesManagementWorkflow: jest.fn(() => ({
    runWorkflow: jest.fn(() => Promise.resolve({
      success: true,
      completedSteps: ['step1', 'step2'],
      duration: 100
    }))
  })),
  WorkflowTester: jest.fn().mockImplementation(() => ({
    addStep: jest.fn(),
    runWorkflow: jest.fn(() => Promise.resolve({
      success: true,
      completedSteps: ['step1'],
      duration: 50
    }))
  }))
}));

// Mock system preferences hook
jest.mock('../../../hooks/useSystemPreferences', () => ({
  useSystemPreferences: jest.fn(() => ({
    reducedMotion: false,
    voiceOverEnabled: false,
    highContrast: false
  }))
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Integration Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.serverHealth.mockResolvedValue({ healthy: true });
  });

  describe('ApplicationIntegration', () => {
    it('should initialize successfully', async () => {
      const TestComponent = () => <div data-testid="test-content">Test Content</div>;
      
      render(
        <NotificationProvider>
          <ApplicationIntegration>
            <TestComponent />
          </ApplicationIntegration>
        </NotificationProvider>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      
      // Wait for initialization
      await waitFor(() => {
        expect(mockElectronAPI.serverHealth).toHaveBeenCalled();
      });
    });

    it('should handle initialization errors gracefully', async () => {
      mockElectronAPI.serverHealth.mockRejectedValue(new Error('Backend unavailable'));
      
      const TestComponent = () => <div data-testid="test-content">Test Content</div>;
      
      render(
        <NotificationProvider>
          <ApplicationIntegration>
            <TestComponent />
          </ApplicationIntegration>
        </NotificationProvider>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should show integration status in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const TestComponent = () => <div data-testid="test-content">Test Content</div>;
      
      render(
        <NotificationProvider>
          <ApplicationIntegration>
            <TestComponent />
          </ApplicationIntegration>
        </NotificationProvider>
      );

      // Should show integration status in development
      expect(document.querySelector('.integration-status')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('EnhancedErrorBoundary', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div data-testid="no-error">No Error</div>;
    };

    it('should catch and display errors', () => {
      const onError = jest.fn();
      
      render(
        <EnhancedErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });

    it('should render children when no error occurs', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={false} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByTestId('no-error')).toBeInTheDocument();
    });

    it('should provide retry functionality', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      // After retry, error should be cleared (though component will throw again)
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <EnhancedErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      // Look for the details toggle button which contains the text
      expect(screen.getByRole('button', { name: /technical details/i })).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Enhanced Transitions', () => {
    it('should render MacOSFadeTransition correctly', async () => {
      const { rerender } = render(
        <MacOSFadeTransition isVisible={false}>
          <div data-testid="fade-content">Fade Content</div>
        </MacOSFadeTransition>
      );

      // Should not render when not visible
      expect(screen.queryByTestId('fade-content')).not.toBeInTheDocument();

      rerender(
        <MacOSFadeTransition isVisible={true}>
          <div data-testid="fade-content">Fade Content</div>
        </MacOSFadeTransition>
      );

      // Should render when visible
      expect(screen.getByTestId('fade-content')).toBeInTheDocument();
    });

    it('should render MacOSSlideTransition correctly', async () => {
      const { rerender } = render(
        <MacOSSlideTransition isVisible={false} direction="up">
          <div data-testid="slide-content">Slide Content</div>
        </MacOSSlideTransition>
      );

      expect(screen.queryByTestId('slide-content')).not.toBeInTheDocument();

      rerender(
        <MacOSSlideTransition isVisible={true} direction="up">
          <div data-testid="slide-content">Slide Content</div>
        </MacOSSlideTransition>
      );

      expect(screen.getByTestId('slide-content')).toBeInTheDocument();
    });

    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <MacOSFadeTransition isVisible={true} respectMotionPreference={true}>
          <div data-testid="motion-content">Motion Content</div>
        </MacOSFadeTransition>
      );

      expect(screen.getByTestId('motion-content')).toBeInTheDocument();
    });
  });

  describe('WorkflowValidator', () => {
    it('should render workflow validator when visible', () => {
      const onClose = jest.fn();
      
      render(
        <NotificationProvider>
          <WorkflowValidator isVisible={true} onClose={onClose} />
        </NotificationProvider>
      );

      expect(screen.getByText('Workflow Validator')).toBeInTheDocument();
      expect(screen.getByText('Start Validation')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      const onClose = jest.fn();
      
      render(
        <NotificationProvider>
          <WorkflowValidator isVisible={false} onClose={onClose} />
        </NotificationProvider>
      );

      expect(screen.queryByText('Workflow Validator')).not.toBeInTheDocument();
    });

    it('should handle close button click', () => {
      const onClose = jest.fn();
      
      render(
        <NotificationProvider>
          <WorkflowValidator isVisible={true} onClose={onClose} />
        </NotificationProvider>
      );

      const closeButton = screen.getByLabelText('Close validator');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should start validation when button is clicked', async () => {
      const onClose = jest.fn();
      
      render(
        <NotificationProvider>
          <WorkflowValidator isVisible={true} onClose={onClose} />
        </NotificationProvider>
      );

      const startButton = screen.getByText('Start Validation');
      fireEvent.click(startButton);
      
      // Should show progress state
      await waitFor(() => {
        expect(screen.getByText('Running Validation...')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Workflow', () => {
    it('should handle complete application integration', async () => {
      const TestApp = () => (
        <NotificationProvider>
          <ApplicationIntegration>
            <EnhancedErrorBoundary>
              <MacOSFadeTransition isVisible={true}>
                <div data-testid="integrated-app">Integrated Application</div>
              </MacOSFadeTransition>
            </EnhancedErrorBoundary>
          </ApplicationIntegration>
        </NotificationProvider>
      );

      render(<TestApp />);

      expect(screen.getByTestId('integrated-app')).toBeInTheDocument();
      
      // Wait for integration to complete
      await waitFor(() => {
        expect(mockElectronAPI.serverHealth).toHaveBeenCalled();
      });
    });

    it('should handle keyboard shortcuts for integration features', () => {
      const TestApp = () => (
        <NotificationProvider>
          <ApplicationIntegration>
            <div data-testid="app-content">App Content</div>
          </ApplicationIntegration>
        </NotificationProvider>
      );

      render(<TestApp />);

      // Simulate development keyboard shortcut
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      fireEvent.keyDown(document, {
        key: 'I',
        metaKey: true,
        shiftKey: true
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle visibility changes', () => {
      const TestApp = () => (
        <NotificationProvider>
          <ApplicationIntegration>
            <div data-testid="app-content">App Content</div>
          </ApplicationIntegration>
        </NotificationProvider>
      );

      render(<TestApp />);

      // Simulate visibility change
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      
      fireEvent(document, new Event('visibilitychange'));
      
      // Simulate visibility restore
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });
      
      fireEvent(document, new Event('visibilitychange'));
    });
  });

  describe('Error Recovery', () => {
    it('should handle network errors with retry logic', async () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(false);
        
        const handleClick = () => {
          setShouldThrow(true);
        };
        
        if (shouldThrow) {
          throw new Error('Network error occurred');
        }
        
        return (
          <button onClick={handleClick} data-testid="network-button">
            Test Network
          </button>
        );
      };

      render(
        <NotificationProvider>
          <EnhancedErrorBoundary enableRecovery={false} maxRetries={0}>
            <TestComponent />
          </EnhancedErrorBoundary>
        </NotificationProvider>
      );

      const button = screen.getByTestId('network-button');
      fireEvent.click(button);
      
      // Should handle the error gracefully
      await waitFor(() => {
        // Error boundary should catch the error and show error UI
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      // Should also show the Try Again button
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });
});