import { useState, useEffect } from 'react';

export interface SystemPreferences {
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  highContrast: boolean;
  reducedTransparency: boolean;
  increasedContrast: boolean;
  voiceOverEnabled: boolean;
  accentColor?: string;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

/**
 * Detects the current system preferences
 */
function getSystemPreferences(): SystemPreferences {
  const preferences: SystemPreferences = {
    colorScheme: 'light',
    reducedMotion: false,
    highContrast: false,
    reducedTransparency: false,
    increasedContrast: false,
    voiceOverEnabled: false,
    fontSize: 'medium',
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

  // Detect increased contrast (more specific than high contrast)
  if (window.matchMedia && window.matchMedia('(prefers-contrast: more)').matches) {
    preferences.increasedContrast = true;
  }

  // Detect reduced transparency (macOS specific)
  if (window.matchMedia && window.matchMedia('(prefers-reduced-transparency: reduce)').matches) {
    preferences.reducedTransparency = true;
  }

  // Detect VoiceOver (screen reader) - this is a heuristic approach
  // We check for common screen reader indicators
  preferences.voiceOverEnabled = detectScreenReader();

  // Detect font size preference (approximation based on zoom level)
  const zoomLevel = window.devicePixelRatio || 1;
  if (zoomLevel >= 1.5) {
    preferences.fontSize = 'large';
  } else if (zoomLevel >= 2) {
    preferences.fontSize = 'extra-large';
  } else if (zoomLevel <= 0.8) {
    preferences.fontSize = 'small';
  }

  return preferences;
}

/**
 * Detects if a screen reader is likely active
 */
function detectScreenReader(): boolean {
  // Check for common screen reader indicators
  if (typeof window === 'undefined') return false;
  
  // Check for VoiceOver specific indicators
  const hasVoiceOverIndicators = 
    // Check for aria-live regions being actively monitored
    document.querySelectorAll('[aria-live]').length > 0 ||
    // Check for screen reader specific CSS
    window.getComputedStyle(document.body).getPropertyValue('speak') !== '' ||
    // Check for accessibility tree modifications
    document.body.getAttribute('role') !== null;

  // Check for reduced motion as an indicator (many screen reader users enable this)
  const hasReducedMotion = window.matchMedia && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check for high contrast as an indicator
  const hasHighContrast = window.matchMedia && 
    window.matchMedia('(prefers-contrast: high)').matches;

  return hasVoiceOverIndicators || (hasReducedMotion && hasHighContrast);
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

  // Apply increased contrast
  if (preferences.increasedContrast) {
    root.setAttribute('data-increased-contrast', 'true');
  } else {
    root.removeAttribute('data-increased-contrast');
  }

  // Apply reduced transparency
  if (preferences.reducedTransparency) {
    root.setAttribute('data-reduced-transparency', 'true');
  } else {
    root.removeAttribute('data-reduced-transparency');
  }

  // Apply VoiceOver detection
  if (preferences.voiceOverEnabled) {
    root.setAttribute('data-screen-reader', 'true');
  } else {
    root.removeAttribute('data-screen-reader');
  }

  // Apply font size preference
  root.setAttribute('data-font-size', preferences.fontSize);

  // Set CSS custom properties for dynamic adjustments
  root.style.setProperty('--accessibility-font-scale', getFontScale(preferences.fontSize));
  root.style.setProperty('--accessibility-motion-scale', preferences.reducedMotion ? '0' : '1');
  root.style.setProperty('--accessibility-transparency-scale', preferences.reducedTransparency ? '1' : '0.8');
}

/**
 * Gets the font scale multiplier for different font size preferences
 */
function getFontScale(fontSize: SystemPreferences['fontSize']): string {
  switch (fontSize) {
    case 'small': return '0.9';
    case 'medium': return '1.0';
    case 'large': return '1.1';
    case 'extra-large': return '1.25';
    default: return '1.0';
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
      window.matchMedia('(prefers-contrast: more)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
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