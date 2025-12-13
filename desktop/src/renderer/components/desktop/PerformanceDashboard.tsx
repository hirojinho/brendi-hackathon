import React, { useState, useEffect } from 'react';
import { performanceMonitor, PerformanceMetrics } from '../../utils/performanceMonitor';
import './PerformanceDashboard.css';

export interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  itemCount: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onClose,
  itemCount
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      // Initial load
      updateMetrics();
      
      // Set up refresh interval
      const interval = setInterval(updateMetrics, 2000);
      setRefreshInterval(interval);
      
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [isVisible]);

  const updateMetrics = () => {
    // Get recent metrics from performance monitor
    const allStats = performanceMonitor.getStats();
    setMetrics(allStats.recentMetrics);
  };

  const getOperationStats = (operation: string) => {
    return performanceMonitor.getStats(operation);
  };

  const getPerformanceStatus = () => {
    const concerns = performanceMonitor.isPerformanceConcerning(itemCount);
    const hasAnyIssues = Object.values(concerns).some(Boolean);
    
    if (hasAnyIssues) {
      return { status: 'warning', message: 'Performance may be impacted with current data size' };
    }
    
    return { status: 'good', message: 'Performance is optimal' };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes: number) => {
    if (bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  if (!isVisible) return null;

  const performanceStatus = getPerformanceStatus();
  const searchStats = getOperationStats('search-notes');
  const filterStats = getOperationStats('filter-and-sort-notes');
  const loadStats = getOperationStats('load-notes-data');
  const renderStats = getOperationStats('render-notes-list');
  const suggestions = performanceMonitor.getOptimizationSuggestions(itemCount);

  return (
    <div className="performance-dashboard-overlay">
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <h2>Performance Dashboard</h2>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="dashboard-content">
          {/* Overall Status */}
          <div className="performance-status">
            <div className={`status-indicator ${performanceStatus.status}`}>
              <span className="status-icon">
                {performanceStatus.status === 'good' ? '✅' : '⚠️'}
              </span>
              <span className="status-message">{performanceStatus.message}</span>
            </div>
            <div className="item-count">
              Managing {itemCount} notes
            </div>
          </div>

          {/* Operation Statistics */}
          <div className="operation-stats">
            <h3>Operation Performance</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Search</h4>
                <div className="stat-value">
                  {searchStats.count > 0 ? formatDuration(searchStats.averageDuration) : 'N/A'}
                </div>
                <div className="stat-detail">
                  {searchStats.count} operations
                </div>
              </div>

              <div className="stat-card">
                <h4>Filter & Sort</h4>
                <div className="stat-value">
                  {filterStats.count > 0 ? formatDuration(filterStats.averageDuration) : 'N/A'}
                </div>
                <div className="stat-detail">
                  {filterStats.count} operations
                </div>
              </div>

              <div className="stat-card">
                <h4>Data Loading</h4>
                <div className="stat-value">
                  {loadStats.count > 0 ? formatDuration(loadStats.averageDuration) : 'N/A'}
                </div>
                <div className="stat-detail">
                  {loadStats.count} operations
                </div>
              </div>

              <div className="stat-card">
                <h4>Rendering</h4>
                <div className="stat-value">
                  {renderStats.count > 0 ? formatDuration(renderStats.averageDuration) : 'N/A'}
                </div>
                <div className="stat-detail">
                  {renderStats.count} operations
                </div>
              </div>
            </div>
          </div>

          {/* Recent Metrics */}
          <div className="recent-metrics">
            <h3>Recent Operations</h3>
            <div className="metrics-list">
              {metrics.slice(-5).reverse().map((metric, index) => (
                <div key={index} className="metric-item">
                  <div className="metric-operation">{metric.operation}</div>
                  <div className="metric-duration">{formatDuration(metric.duration)}</div>
                  <div className="metric-items">
                    {metric.itemCount ? `${metric.itemCount} items` : ''}
                  </div>
                  <div className="metric-memory">
                    {formatMemory(metric.memoryUsage || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Suggestions */}
          {suggestions.length > 0 && (
            <div className="optimization-suggestions">
              <h3>Optimization Suggestions</h3>
              <ul className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="suggestion-item">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="dashboard-actions">
            <button 
              onClick={() => performanceMonitor.clearMetrics()}
              className="clear-metrics-button"
            >
              Clear Metrics
            </button>
            <button 
              onClick={() => {
                const report = performanceMonitor.getPerformanceReport();
                console.log(report);
                navigator.clipboard?.writeText(report);
              }}
              className="export-report-button"
            >
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};