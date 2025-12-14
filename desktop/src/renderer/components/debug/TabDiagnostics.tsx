import React, { useState, useEffect } from 'react';

interface TabDiagnosticsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TabDiagnostics: React.FC<TabDiagnosticsProps> = ({ activeTab, onTabChange }) => {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const addDiagnostic = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDiagnostics(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
  };

  const addError = (error: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setErrors(prev => [...prev.slice(-4), `${timestamp}: ${error}`]);
  };

  useEffect(() => {
    addDiagnostic(`Tab changed to: ${activeTab}`);
  }, [activeTab]);

  const testTab = async (tabName: string) => {
    try {
      addDiagnostic(`Testing tab: ${tabName}`);
      
      // Test if the tab change causes any immediate errors
      onTabChange(tabName);
      
      // Wait a bit to see if any async errors occur
      await new Promise(resolve => setTimeout(resolve, 100));
      
      addDiagnostic(`Tab ${tabName} loaded successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addError(`Tab ${tabName} failed: ${errorMessage}`);
    }
  };

  const testAllTabs = async () => {
    const tabs = ['chat', 'notes', 'zettelkasten', 'review', 'documents'];
    for (const tab of tabs) {
      await testTab(tab);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait between tests
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '300px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 10000,
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <h3>Tab Diagnostics</h3>
      <p>Current Tab: <strong>{activeTab}</strong></p>
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={testAllTabs}
          style={{
            background: '#007AFF',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Test All Tabs
        </button>
      </div>

      <div>
        <h4>Recent Activity:</h4>
        <div style={{ maxHeight: '150px', overflow: 'auto' }}>
          {diagnostics.map((diag, i) => (
            <div key={i} style={{ fontSize: '10px', marginBottom: '2px' }}>
              {diag}
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div>
          <h4 style={{ color: '#FF3B30' }}>Errors:</h4>
          <div style={{ maxHeight: '100px', overflow: 'auto' }}>
            {errors.map((error, i) => (
              <div key={i} style={{ fontSize: '10px', marginBottom: '2px', color: '#FF3B30' }}>
                {error}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        Press Escape to hide this panel
      </div>
    </div>
  );
};