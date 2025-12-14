/**
 * Workflow Testing Utilities
 * Tests complete user workflows from overlay to main window and back
 */

interface WorkflowStep {
  name: string;
  action: () => Promise<boolean>;
  timeout?: number;
}

interface WorkflowResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  duration: number;
}

export class WorkflowTester {
  private steps: WorkflowStep[] = [];
  private results: WorkflowResult[] = [];

  addStep(step: WorkflowStep): void {
    this.steps.push(step);
  }

  async runWorkflow(name: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    const completedSteps: string[] = [];
    
    try {
      for (const step of this.steps) {
        const stepTimeout = step.timeout || 5000;
        const stepResult = await this.runStepWithTimeout(step, stepTimeout);
        
        if (!stepResult) {
          const result: WorkflowResult = {
            success: false,
            completedSteps,
            failedStep: step.name,
            error: `Step "${step.name}" failed or timed out`,
            duration: Date.now() - startTime
          };
          this.results.push(result);
          return result;
        }
        
        completedSteps.push(step.name);
      }
      
      const result: WorkflowResult = {
        success: true,
        completedSteps,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
      
    } catch (error) {
      const result: WorkflowResult = {
        success: false,
        completedSteps,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }
  }

  private async runStepWithTimeout(step: WorkflowStep, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      
      step.action()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(false);
        });
    });
  }

  getResults(): WorkflowResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }

  clearSteps(): void {
    this.steps = [];
  }
}

// Pre-defined workflow tests
export const createOverlayToMainWindowWorkflow = (): WorkflowTester => {
  const tester = new WorkflowTester();
  
  tester.addStep({
    name: 'Open overlay window',
    action: async () => {
      if (window.electronAPI?.toggleOverlay) {
        window.electronAPI.toggleOverlay();
        // Wait for overlay to appear
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
      return false;
    }
  });
  
  tester.addStep({
    name: 'Navigate to main window from overlay',
    action: async () => {
      if (window.electronAPI?.openMainWindow) {
        await window.electronAPI.openMainWindow({ initialTab: 'notes', fromOverlay: true });
        // Wait for main window to open
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }
      return false;
    }
  });
  
  tester.addStep({
    name: 'Verify notes tab is active',
    action: async () => {
      // Check if notes tab is active in main window
      const activeTab = document.querySelector('.mode-button.active');
      return activeTab?.textContent?.includes('Notes') || false;
    }
  });
  
  tester.addStep({
    name: 'Load notes data',
    action: async () => {
      // Wait for notes to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      const notesList = document.querySelector('.notes-list, .optimized-notes-list');
      return notesList !== null;
    }
  });
  
  return tester;
};

export const createNotesManagementWorkflow = (): WorkflowTester => {
  const tester = new WorkflowTester();
  
  tester.addStep({
    name: 'Open notes management',
    action: async () => {
      const notesPanel = document.querySelector('.notes-management-panel');
      return notesPanel !== null;
    }
  });
  
  tester.addStep({
    name: 'Test search functionality',
    action: async () => {
      const searchInput = document.querySelector('input[type="search"], .search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = 'test';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }
      return false;
    }
  });
  
  tester.addStep({
    name: 'Test mode switching',
    action: async () => {
      const modeButtons = document.querySelectorAll('.mode-button');
      if (modeButtons.length >= 2) {
        (modeButtons[1] as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 300));
        return true;
      }
      return false;
    }
  });
  
  tester.addStep({
    name: 'Test chat panel toggle',
    action: async () => {
      const chatToggle = document.querySelector('.chat-toggle-button') as HTMLElement;
      if (chatToggle) {
        chatToggle.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        const chatPanel = document.querySelector('.integrated-chat-panel');
        return chatPanel !== null;
      }
      return false;
    }
  });
  
  return tester;
};

export const createErrorHandlingWorkflow = (): WorkflowTester => {
  const tester = new WorkflowTester();
  
  tester.addStep({
    name: 'Trigger network error',
    action: async () => {
      // Simulate network error by calling invalid endpoint
      try {
        await fetch('/invalid-endpoint');
        return false;
      } catch {
        return true; // Error expected
      }
    }
  });
  
  tester.addStep({
    name: 'Verify error boundary catches errors',
    action: async () => {
      // Check if error boundary is present
      const errorBoundary = document.querySelector('.error-boundary, .error-state');
      return errorBoundary !== null;
    }
  });
  
  tester.addStep({
    name: 'Test retry functionality',
    action: async () => {
      const retryButton = document.querySelector('.retry-button, .macos-button') as HTMLElement;
      if (retryButton && retryButton.textContent?.includes('Try')) {
        retryButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }
      return false;
    }
  });
  
  return tester;
};

export const createAccessibilityWorkflow = (): WorkflowTester => {
  const tester = new WorkflowTester();
  
  tester.addStep({
    name: 'Test keyboard navigation',
    action: async () => {
      // Simulate Tab key navigation
      const focusableElements = document.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return focusableElements.length > 0;
    }
  });
  
  tester.addStep({
    name: 'Verify ARIA labels',
    action: async () => {
      const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
      return elementsWithAria.length > 0;
    }
  });
  
  tester.addStep({
    name: 'Test screen reader announcements',
    action: async () => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      return liveRegions.length > 0;
    }
  });
  
  tester.addStep({
    name: 'Verify skip links',
    action: async () => {
      const skipLinks = document.querySelectorAll('.skip-link');
      return skipLinks.length > 0;
    }
  });
  
  return tester;
};

// Utility function to run all workflows
export const runAllWorkflows = async (): Promise<{ [key: string]: WorkflowResult }> => {
  const results: { [key: string]: WorkflowResult } = {};
  
  const workflows = {
    'Overlay to Main Window': createOverlayToMainWindowWorkflow(),
    'Notes Management': createNotesManagementWorkflow(),
    'Error Handling': createErrorHandlingWorkflow(),
    'Accessibility': createAccessibilityWorkflow()
  };
  
  for (const [name, workflow] of Object.entries(workflows)) {
    try {
      results[name] = await workflow.runWorkflow(name);
    } catch (error) {
      results[name] = {
        success: false,
        completedSteps: [],
        error: error instanceof Error ? error.message : 'Workflow execution failed',
        duration: 0
      };
    }
  }
  
  return results;
};

// Performance monitoring for workflows
export const measureWorkflowPerformance = async (
  workflowName: string,
  workflow: WorkflowTester
): Promise<{ result: WorkflowResult; metrics: PerformanceMetrics }> => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const result = await workflow.runWorkflow(workflowName);
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const metrics: PerformanceMetrics = {
    duration: endTime - startTime,
    memoryUsed: endMemory - startMemory,
    stepsCompleted: result.completedSteps.length,
    success: result.success
  };
  
  return { result, metrics };
};

interface PerformanceMetrics {
  duration: number;
  memoryUsed: number;
  stepsCompleted: number;
  success: boolean;
}