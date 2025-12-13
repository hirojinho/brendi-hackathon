import { PerformanceMonitor } from '../performanceMonitor';

// Mock performance.now()
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow
  }
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    mockPerformanceNow.mockClear();
    jest.clearAllMocks();
  });

  describe('timeOperation', () => {
    it('measures operation duration correctly', () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      const result = monitor.timeOperation('test-operation', () => 'test-result', 10);

      expect(result.result).toBe('test-result');
      expect(result.metrics.operation).toBe('test-operation');
      expect(result.metrics.duration).toBe(50);
      expect(result.metrics.itemCount).toBe(10);
    });

    it('records metrics for later retrieval', () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(120);

      monitor.timeOperation('test-operation', () => 'result');

      const stats = monitor.getStats('test-operation');
      expect(stats.count).toBe(1);
      expect(stats.averageDuration).toBe(20);
    });
  });

  describe('async operations', () => {
    it('measures async operation duration', async () => {
      mockPerformanceNow.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const asyncFn = async () => {
        return new Promise(resolve => setTimeout(() => resolve('async-result'), 10));
      };

      const result = await monitor.timeAsyncOperation('async-test', asyncFn, 5);

      expect(result.result).toBe('async-result');
      expect(result.metrics.operation).toBe('async-test');
      expect(result.metrics.duration).toBe(100);
      expect(result.metrics.itemCount).toBe(5);
    });
  });

  describe('performance analysis', () => {
    it('identifies performance concerns for large datasets', () => {
      const concerns = monitor.isPerformanceConcerning(5001);

      expect(concerns.filter).toBe(true); // 5001 > 5000 threshold
      expect(concerns.search).toBe(true); // 5001 > 2000 threshold
      expect(concerns.render).toBe(true); // 5001 > 1500 threshold
    });

    it('provides optimization suggestions', () => {
      const suggestions = monitor.getOptimizationSuggestions(6000);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('lazy loading'))).toBe(true);
    });
  });

  describe('statistics', () => {
    it('calculates correct statistics', () => {
      mockPerformanceNow
        .mockReturnValueOnce(0).mockReturnValueOnce(10)  // 10ms
        .mockReturnValueOnce(20).mockReturnValueOnce(35) // 15ms
        .mockReturnValueOnce(40).mockReturnValueOnce(45); // 5ms

      monitor.timeOperation('test', () => {});
      monitor.timeOperation('test', () => {});
      monitor.timeOperation('test', () => {});

      const stats = monitor.getStats('test');
      expect(stats.count).toBe(3);
      expect(stats.averageDuration).toBe(10); // (10+15+5)/3
      expect(stats.maxDuration).toBe(15);
      expect(stats.minDuration).toBe(5);
      expect(stats.totalDuration).toBe(30);
    });

    it('returns empty stats for unknown operations', () => {
      const stats = monitor.getStats('unknown-operation');
      
      expect(stats.count).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.maxDuration).toBe(0);
      expect(stats.minDuration).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });
  });

  describe('metrics management', () => {
    it('limits stored metrics to prevent memory leaks', () => {
      mockPerformanceNow.mockImplementation(() => Date.now());

      // Add more than 100 metrics
      for (let i = 0; i < 150; i++) {
        monitor.timeOperation(`operation-${i}`, () => {});
      }

      const allStats = monitor.getStats();
      expect(allStats.count).toBe(100); // Should be capped at 100
    });

    it('clears all metrics', () => {
      mockPerformanceNow.mockReturnValueOnce(0).mockReturnValueOnce(10);
      
      monitor.timeOperation('test', () => {});
      expect(monitor.getStats().count).toBe(1);

      monitor.clearMetrics();
      expect(monitor.getStats().count).toBe(0);
    });
  });
});