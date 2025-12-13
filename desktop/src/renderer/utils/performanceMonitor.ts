export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  itemCount?: number;
  memoryUsage?: number;
}

export interface PerformanceThresholds {
  search: number;
  filter: number;
  sort: number;
  render: number;
  load: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations: Map<string, number> = new Map();
  private thresholds: PerformanceThresholds = {
    search: 500,   // 500ms for search operations
    filter: 200,   // 200ms for filtering
    sort: 100,     // 100ms for sorting
    render: 50,    // 50ms for rendering
    load: 1000     // 1000ms for data loading
  };

  /**
   * Start timing an operation
   */
  startOperation(operationId: string): void {
    this.activeOperations.set(operationId, performance.now());
  }

  /**
   * End timing an operation and record metrics
   */
  endOperation(
    operationId: string, 
    operation: string, 
    itemCount?: number
  ): PerformanceMetrics | null {
    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return null;
    }

    const duration = performance.now() - startTime;
    const memoryUsage = this.getMemoryUsage();
    
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      itemCount,
      memoryUsage
    };

    this.metrics.push(metric);
    this.activeOperations.delete(operationId);

    // Check if operation exceeded threshold
    this.checkThreshold(metric);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    return metric;
  }

  /**
   * Time a synchronous operation
   */
  timeOperation<T>(
    operation: string,
    fn: () => T,
    itemCount?: number
  ): { result: T; metrics: PerformanceMetrics } {
    const startTime = performance.now();
    const result = fn();
    const duration = performance.now() - startTime;
    const memoryUsage = this.getMemoryUsage();

    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      itemCount,
      memoryUsage
    };

    this.metrics.push(metric);
    this.checkThreshold(metric);

    return { result, metrics: metric };
  }

  /**
   * Time an asynchronous operation
   */
  async timeAsyncOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    itemCount?: number
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    const memoryUsage = this.getMemoryUsage();

    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: Date.now(),
      itemCount,
      memoryUsage
    };

    this.metrics.push(metric);
    this.checkThreshold(metric);

    return { result, metrics: metric };
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string): {
    count: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalDuration: number;
    recentMetrics: PerformanceMetrics[];
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        totalDuration: 0,
        recentMetrics: []
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: filteredMetrics.length,
      averageDuration: totalDuration / filteredMetrics.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      totalDuration,
      recentMetrics: filteredMetrics.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Get performance report for debugging
   */
  getPerformanceReport(): string {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    let report = 'Performance Report:\n';
    report += '==================\n\n';

    for (const operation of operations) {
      const stats = this.getStats(operation);
      report += `${operation}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Average: ${stats.averageDuration.toFixed(2)}ms\n`;
      report += `  Max: ${stats.maxDuration.toFixed(2)}ms\n`;
      report += `  Min: ${stats.minDuration.toFixed(2)}ms\n`;
      report += `  Total: ${stats.totalDuration.toFixed(2)}ms\n\n`;
    }

    return report;
  }

  /**
   * Check if operation performance is concerning
   */
  isPerformanceConcerning(itemCount: number): {
    search: boolean;
    filter: boolean;
    sort: boolean;
    render: boolean;
  } {
    // Performance becomes concerning with large datasets
    const baseThreshold = 1000;
    const scaleFactor = Math.max(1, itemCount / baseThreshold);

    return {
      search: scaleFactor > 2,    // Concerning with 2000+ items
      filter: scaleFactor > 5,    // Concerning with 5000+ items  
      sort: scaleFactor > 3,      // Concerning with 3000+ items
      render: scaleFactor > 1.5   // Concerning with 1500+ items
    };
  }

  /**
   * Get optimization suggestions based on metrics
   */
  getOptimizationSuggestions(itemCount: number): string[] {
    const suggestions: string[] = [];
    const concerns = this.isPerformanceConcerning(itemCount);
    const searchStats = this.getStats('search');
    const filterStats = this.getStats('filter');

    if (concerns.search && searchStats.averageDuration > this.thresholds.search) {
      suggestions.push('Consider implementing search result pagination or limiting results');
    }

    if (concerns.filter && filterStats.averageDuration > this.thresholds.filter) {
      suggestions.push('Consider debouncing filter operations or using web workers');
    }

    if (concerns.render) {
      suggestions.push('Consider implementing virtual scrolling for better rendering performance');
    }

    if (itemCount > 5000) {
      suggestions.push('Consider implementing lazy loading or data virtualization');
    }

    return suggestions;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  private checkThreshold(metric: PerformanceMetrics): void {
    const operationType = metric.operation.toLowerCase();
    let threshold = 1000; // Default threshold

    // Map operation to threshold
    if (operationType.includes('search')) {
      threshold = this.thresholds.search;
    } else if (operationType.includes('filter')) {
      threshold = this.thresholds.filter;
    } else if (operationType.includes('sort')) {
      threshold = this.thresholds.sort;
    } else if (operationType.includes('render')) {
      threshold = this.thresholds.render;
    } else if (operationType.includes('load')) {
      threshold = this.thresholds.load;
    }

    if (metric.duration > threshold) {
      console.warn(
        `Performance warning: ${metric.operation} took ${metric.duration.toFixed(2)}ms ` +
        `(threshold: ${threshold}ms) with ${metric.itemCount || 'unknown'} items`
      );
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();