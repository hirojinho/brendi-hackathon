import { useState, useCallback, useEffect } from 'react';
import { reviewRepository } from '../data/reviewRepository';
import type { ReviewStatus } from '../../../types/review';

/**
 * Hook for fetching review status
 * Provides cached status with manual refresh capability
 */
export function useReviewStatus(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = false } = options;

  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await reviewRepository.getStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load review status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadStatus();
    }
  }, [autoLoad, loadStatus]);

  return {
    status,
    isLoading,
    error,
    loadStatus,
    clearError: () => setError(null),
  };
}
