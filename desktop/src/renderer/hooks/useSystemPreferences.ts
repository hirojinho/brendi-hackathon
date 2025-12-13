import { useState, useEffect } from 'react';

export interface SystemPreferences {
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  highContrast: boolean;
  accentColor?: string;
}

/**
 * Detects the current system preferences
 */
function getSystemPreferences(): SystemPreferences {
  const preferences: SystemPreferences = {
    colorScheme: 'light',
    reducedMotion: false,
    highContrast: false,
  };

  // Detect color scheme
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    preferences.colorScheme = 'dark';
  }

  // Detect reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preferences.reducedMotion = true;
  }

  // Detect high contrast preference
  if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
    preferences.highContrast = true;
  }

  return preferences;
}

/**
 * Applies system preferences to the document
 */
function applySystemPreferences(preferences: SystemPreferences): void {
  const root = document.documentElement;

  // Apply color scheme
  root.setAttribute('data-theme', preferences.colorScheme);

  // Apply reduced motion
  if (preferences.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }

  // Apply high contrast
  if (preferences.highContrast) {
    root.setAttribute('data-high-contrast', 'true');
  } else {
    root.removeAttribute('data-high-contrast');
  }
}

/**
 * Hook for using system preferences in React components
 */
export function useSystemPreferences() {
  const [preferences, setPreferences] = useState<SystemPreferences>(getSystemPreferences);

  useEffect(() => {
    // Apply initial preferences
    applySystemPreferences(preferences);

    const mediaQueries = [
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
    ];

    const handleChange = () => {
      const newPreferences = getSystemPreferences();
      setPreferences(newPreferences);
      applySystemPreferences(newPreferences);
    };

    // Add listeners
    mediaQueries.forEach(mq => {
      if (mq.addEventListener) {
        mq.addEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mq.addListener(handleChange);
      }
    });

    // Cleanup function
    return () => {
      mediaQueries.forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', handleChange);
        } else {
          // Fallback for older browsers
          mq.removeListener(handleChange);
        }
      });
    };
  }, []);

  return preferences;
}