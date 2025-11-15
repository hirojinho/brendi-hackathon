import { useState, useEffect } from 'react';

interface HealthStatus {
  healthy: boolean;
}

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 500; // milliseconds

export function useBackendHealth() {
  const [isReady, setIsReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let retryCount = 0;

    const checkHealth = async (): Promise<boolean> => {
      try {
        const health: HealthStatus = await window.electronAPI.checkHealth();
        if (health.healthy) {
          setIsReady(true);
          setIsChecking(false);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Health check failed:', error);
        return false;
      }
    };

    const pollHealth = async () => {
      const isReady = await checkHealth();
      
      if (!isReady && retryCount < MAX_RETRIES - 1) {
        retryCount++;
        setTimeout(pollHealth, RETRY_INTERVAL);
      } else if (!isReady) {
        console.error(`Backend failed to start after ${MAX_RETRIES} attempts`);
        setIsReady(false);
        setIsChecking(false);
      }
    };

    pollHealth();
  }, []);

  return { isReady, isChecking };
}

