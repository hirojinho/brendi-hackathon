import React, { useEffect, useRef } from 'react';

interface TabDiagnosticsProps {
  activeTab: string;
  isVisible: boolean;
}

export const TabDiagnostics: React.FC<TabDiagnosticsProps> = ({ activeTab, isVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const diagnostics = {
      activeTab,
      isVisible,
      timestamp: new Date().toISOString(),
      containerExists: !!containerRef.current,
      containerStyles: containerRef.current ? window.getComputedStyle(containerRef.current) : null,
      cssVariables: {
        backgroundPrimary: getComputedStyle(document.documentElement).getPropertyValue('--color-background-primary'),
        textPrimary: getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary'),
        surfaceSecondary: getComputedStyle(document.documentElement).getPropertyValue('--color-surface-secondary'),
      },
      containerDimensions: containerRef.current ? {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
        clientWidth: containerRef.current.clientWidth,
        clientHeight: containerRef.current.clientHeight,
      } : null,
      children: containerRef.current ? {
        childCount: containerRef.current.children.length,
        firstChild: containerRef.current.firstElementChild?.tagName,
        firstChildClasses: containerRef.current.firstElementChild?.className,
      } : null,
    };

    console.log('[TabDiagnostics]', activeTab, diagnostics);
  }, [activeTab, isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 9999,
        maxWidth: '300px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Diagnostics</div>
      <div>Tab: {activeTab}</div>
      <div>Visible: {isVisible ? 'Yes' : 'No'}</div>
      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.8 }}>
        Check console for details
      </div>
    </div>
  );
};
