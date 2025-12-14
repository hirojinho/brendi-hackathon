import React, { Suspense, lazy, useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface LazyTabLoaderProps {
  tabName: string;
  isActive: boolean;
  componentPath: string;
  fallbackComponent?: React.ComponentType<any>;
  props?: any;
}

// Create a cache for loaded components
const componentCache = new Map<string, React.LazyExoticComponent<any>>();

// Fallback component for when tabs fail to load
const TabFallback: React.FC<{ tabName: string; error?: string }> = ({ tabName, error }) => (
  <div className="desktop-panel">
    <div className="panel-header">
      <h1>{tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h1>
    </div>
    <div className="panel-content">
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <h2>{tabName.charAt(0).toUpperCase() + tabName.slice(1)} Panel</h2>
        <p>This panel is temporarily unavailable.</p>
        {error && (
          <div className="error-details" style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}
        <button 
          onClick={() => window.location.reload()}
          className="macos-button macos-button--primary macos-button--medium"
          style={{ marginTop: '1rem' }}
        >
          Reload Application
        </button>
      </div>
    </div>
  </div>
);

// Loading component
const TabLoading: React.FC<{ tabName: string }> = ({ tabName }) => (
  <div className="desktop-panel">
    <div className="panel-header">
      <h1>{tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h1>
    </div>
    <div className="panel-content">
      <div className="empty-state">
        <div className="empty-icon">⏳</div>
        <h2>Loading {tabName.charAt(0).toUpperCase() + tabName.slice(1)}...</h2>
        <p>Please wait while the panel loads.</p>
      </div>
    </div>
  </div>
);

export const LazyTabLoader: React.FC<LazyTabLoaderProps> = ({
  tabName,
  isActive,
  componentPath,
  fallbackComponent: FallbackComponent,
  props = {}
}) => {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Only load the component when the tab becomes active for the first time
  useEffect(() => {
    if (isActive && !hasLoaded && !componentCache.has(componentPath)) {
      try {
        // Dynamically import the component
        const LazyComponent = lazy(() => 
          import(componentPath).catch(error => {
            console.error(`Failed to load component ${componentPath}:`, error);
            setLoadError(error.message || 'Failed to load component');
            // Return a fallback component
            return { 
              default: FallbackComponent || (() => <TabFallback tabName={tabName} error={error.message} />)
            };
          })
        );
        
        componentCache.set(componentPath, LazyComponent);
        setHasLoaded(true);
      } catch (error) {
        console.error(`Error setting up lazy loading for ${componentPath}:`, error);
        setLoadError(error instanceof Error ? error.message : 'Setup error');
      }
    }
  }, [isActive, hasLoaded, componentPath, tabName, FallbackComponent]);

  // Don't render anything if the tab is not active and hasn't been loaded yet
  if (!isActive && !hasLoaded) {
    return null;
  }

  // If there's a load error and no fallback, show error state
  if (loadError && !FallbackComponent) {
    return <TabFallback tabName={tabName} error={loadError} />;
  }

  // Get the cached component
  const LazyComponent = componentCache.get(componentPath);

  if (!LazyComponent) {
    return <TabLoading tabName={tabName} />;
  }

  return (
    <ErrorBoundary
      fallback={<TabFallback tabName={tabName} error="Component crashed" />}
      onError={(error) => {
        console.error(`Error in ${tabName} tab:`, error);
        setLoadError(error.message);
      }}
    >
      <Suspense fallback={<TabLoading tabName={tabName} />}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Helper function to create lazy tab loaders
export const createLazyTab = (
  tabName: string,
  componentPath: string,
  fallbackComponent?: React.ComponentType<any>
) => {
  return (props: { isActive: boolean; [key: string]: any }) => (
    <LazyTabLoader
      tabName={tabName}
      componentPath={componentPath}
      fallbackComponent={fallbackComponent}
      {...props}
    />
  );
};