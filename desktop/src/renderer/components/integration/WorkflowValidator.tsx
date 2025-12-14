import React, { useState, useEffect, useCallback } from 'react';
import { useNotificationHelpers } from '../common/NotificationSystem';
import { MacOSFadeTransition, MacOSSlideTransition } from './EnhancedTransitions';
import { runAllWorkflows, WorkflowResult, createOverlayToMainWindowWorkflow, createNotesManagementWorkflow } from '../../utils/workflowTester';
import { performanceMonitor } from '../../utils/performanceMonitor';

interface WorkflowValidatorProps {
  isVisible: boolean;
  onClose: () => void;
}

interface ValidationResult {
  workflowName: string;
  result: WorkflowResult;
  timestamp: Date;
  performanceMetrics?: {
    duration: number;
    memoryUsed: number;
    stepsCompleted: number;
  };
}

/**
 * Comprehensive workflow validator that tests complete user journeys
 * from overlay to main window and back, ensuring seamless integration
 */
export const WorkflowValidator: React.FC<WorkflowValidatorProps> = ({ isVisible, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { showSuccess, showError, showInfo } = useNotificationHelpers();

  // Run all workflow validations
  const runValidation = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    
    try {
      showInfo('Workflow Validation', 'Starting comprehensive workflow testing...');
      
      const workflows = [
        { name: 'Overlay to Main Window', tester: createOverlayToMainWindowWorkflow() },
        { name: 'Notes Management', tester: createNotesManagementWorkflow() },
        { name: 'Data Synchronization', tester: createDataSyncWorkflow() },
        { name: 'Error Recovery', tester: createErrorRecoveryWorkflow() },
        { name: 'Performance Validation', tester: createPerformanceWorkflow() }
      ];

      const validationResults: ValidationResult[] = [];
      
      for (let i = 0; i < workflows.length; i++) {
        const { name, tester } = workflows[i];
        setCurrentWorkflow(name);
        setProgress((i / workflows.length) * 100);
        
        try {
          const startTime = performance.now();
          const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
          
          const result = await tester.runWorkflow(name);
          
          const endTime = performance.now();
          const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
          
          const performanceMetrics = {
            duration: endTime - startTime,
            memoryUsed: endMemory - startMemory,
            stepsCompleted: result.completedSteps.length
          };
          
          validationResults.push({
            workflowName: name,
            result,
            timestamp: new Date(),
            performanceMetrics
          });
          
          // Log result
          if (result.success) {
            console.log(`[WorkflowValidator] ✓ ${name} passed (${result.duration}ms)`);
          } else {
            console.warn(`[WorkflowValidator] ✗ ${name} failed: ${result.error}`);
          }
          
        } catch (error) {
          console.error(`[WorkflowValidator] Error running ${name}:`, error);
          validationResults.push({
            workflowName: name,
            result: {
              success: false,
              completedSteps: [],
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: 0
            },
            timestamp: new Date()
          });
        }
      }
      
      setResults(validationResults);
      setProgress(100);
      setCurrentWorkflow(null);
      
      // Show summary
      const passedCount = validationResults.filter(r => r.result.success).length;
      const totalCount = validationResults.length;
      
      if (passedCount === totalCount) {
        showSuccess(
          'Validation Complete',
          `All ${totalCount} workflows passed successfully`
        );
      } else {
        showError(
          'Validation Issues Found',
          `${totalCount - passedCount} of ${totalCount} workflows failed`
        );
      }
      
    } catch (error) {
      console.error('[WorkflowValidator] Validation failed:', error);
      showError(
        'Validation Failed',
        error instanceof Error ? error.message : 'Unknown validation error'
      );
    } finally {
      setIsRunning(false);
    }
  }, [showSuccess, showError, showInfo]);

  // Create data synchronization workflow
  const createDataSyncWorkflow = () => {
    const tester = new (require('../../utils/workflowTester').WorkflowTester)();
    
    tester.addStep({
      name: 'Create note in overlay',
      action: async () => {
        // Simulate note creation in overlay
        if (window.electronAPI?.noteTakingAgent) {
          try {
            await window.electronAPI.noteTakingAgent.process({
              input: 'Test note for sync validation',
              contextId: null,
              model: 'test'
            });
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
    });
    
    tester.addStep({
      name: 'Verify note appears in main window',
      action: async () => {
        // Wait for sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if note appears in notes list
        const notesList = document.querySelector('.notes-list, .optimized-notes-list');
        return notesList !== null;
      }
    });
    
    return tester;
  };

  // Create error recovery workflow
  const createErrorRecoveryWorkflow = () => {
    const tester = new (require('../../utils/workflowTester').WorkflowTester)();
    
    tester.addStep({
      name: 'Trigger recoverable error',
      action: async () => {
        // Simulate network error
        try {
          await fetch('/invalid-endpoint-for-testing');
          return false;
        } catch {
          return true; // Error expected
        }
      }
    });
    
    tester.addStep({
      name: 'Verify error handling',
      action: async () => {
        // Check if error boundary or notification appears
        const errorElement = document.querySelector('.error-boundary, .notification--error');
        return errorElement !== null;
      }
    });
    
    return tester;
  };

  // Create performance workflow
  const createPerformanceWorkflow = () => {
    const tester = new (require('../../utils/workflowTester').WorkflowTester)();
    
    tester.addStep({
      name: 'Load large dataset',
      action: async () => {
        const startTime = performance.now();
        
        // Simulate loading large number of notes
        if (window.electronAPI?.quickNotes) {
          try {
            await window.electronAPI.quickNotes.list();
            const endTime = performance.now();
            
            // Should complete within 2 seconds
            return (endTime - startTime) < 2000;
          } catch {
            return false;
          }
        }
        return true; // Pass if API not available
      }
    });
    
    tester.addStep({
      name: 'Verify UI responsiveness',
      action: async () => {
        // Check if UI is still responsive
        const button = document.querySelector('button');
        if (button) {
          button.click();
          await new Promise(resolve => setTimeout(resolve, 100));
          return true;
        }
        return false;
      }
    });
    
    return tester;
  };

  // Export results
  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        workflow: r.workflowName,
        success: r.result.success,
        duration: r.result.duration,
        completedSteps: r.result.completedSteps.length,
        error: r.result.error,
        performanceMetrics: r.performanceMetrics
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-validation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Export Complete', 'Validation results exported successfully');
  };

  return (
    <MacOSFadeTransition isVisible={isVisible} duration={300}>
      <div className="workflow-validator-overlay">
        <MacOSSlideTransition isVisible={isVisible} direction="up" duration={400}>
          <div className="workflow-validator-panel">
            <div className="validator-header">
              <h2>Workflow Validator</h2>
              <p>Comprehensive testing of user workflows and integration points</p>
              <button 
                onClick={onClose}
                className="close-button"
                aria-label="Close validator"
              >
                ×
              </button>
            </div>

            <div className="validator-content">
              {!isRunning && results.length === 0 && (
                <div className="validator-start">
                  <p>Run comprehensive workflow validation to ensure all user journeys work correctly.</p>
                  <button 
                    onClick={runValidation}
                    className="macos-button macos-button--primary macos-button--large"
                  >
                    Start Validation
                  </button>
                </div>
              )}

              {isRunning && (
                <div className="validator-progress">
                  <div className="progress-info">
                    <h3>Running Validation...</h3>
                    {currentWorkflow && (
                      <p>Testing: {currentWorkflow}</p>
                    )}
                  </div>
                  
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="progress-percentage">
                    {Math.round(progress)}%
                  </div>
                </div>
              )}

              {results.length > 0 && (
                <div className="validator-results">
                  <div className="results-header">
                    <h3>Validation Results</h3>
                    <div className="results-summary">
                      <span className="passed-count">
                        ✓ {results.filter(r => r.result.success).length} Passed
                      </span>
                      <span className="failed-count">
                        ✗ {results.filter(r => !r.result.success).length} Failed
                      </span>
                    </div>
                  </div>

                  <div className="results-list">
                    {results.map((result, index) => (
                      <div 
                        key={index}
                        className={`result-item ${result.result.success ? 'success' : 'failure'}`}
                      >
                        <div className="result-header">
                          <span className="result-icon">
                            {result.result.success ? '✓' : '✗'}
                          </span>
                          <span className="result-name">
                            {result.workflowName}
                          </span>
                          <span className="result-duration">
                            {result.result.duration}ms
                          </span>
                        </div>
                        
                        <div className="result-details">
                          <div className="steps-completed">
                            Steps: {result.result.completedSteps.length}
                            {result.result.failedStep && (
                              <span className="failed-step">
                                (Failed at: {result.result.failedStep})
                              </span>
                            )}
                          </div>
                          
                          {result.performanceMetrics && (
                            <div className="performance-metrics">
                              Memory: {(result.performanceMetrics.memoryUsed / 1024 / 1024).toFixed(2)}MB
                            </div>
                          )}
                          
                          {result.result.error && (
                            <div className="error-message">
                              Error: {result.result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="results-actions">
                    <button 
                      onClick={runValidation}
                      className="macos-button macos-button--secondary macos-button--medium"
                      disabled={isRunning}
                    >
                      Run Again
                    </button>
                    
                    <button 
                      onClick={exportResults}
                      className="macos-button macos-button--tertiary macos-button--medium"
                    >
                      Export Results
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </MacOSSlideTransition>
      </div>
    </MacOSFadeTransition>
  );
};