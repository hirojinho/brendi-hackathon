import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useSystemPreferences } from '../../hooks/useSystemPreferences';
import './EnhancedTransitions.css';

interface MacOSTransitionProps {
  isVisible: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
  respectMotionPreference?: boolean;
}

/**
 * Enhanced fade transition with macOS-style easing and motion preferences
 */
export const MacOSFadeTransition: React.FC<MacOSTransitionProps> = ({
  isVisible,
  children,
  duration = 250,
  className = '',
  onEnter,
  onExit,
  respectMotionPreference = true
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(isVisible);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number>();
  // Memoize system preferences to avoid re-renders
  const systemPreferences = useSystemPreferences();
  const effectiveDuration = respectMotionPreference && systemPreferences.reducedMotion ? 0 : duration;

  useEffect(() => {
    // Clear any pending timeouts/animations
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    if (isVisible) {
      setShouldRender(true);
      // If mounting with isVisible=true, show immediately; otherwise animate in
      if (!shouldRender) {
        // Component was hidden, animate in
        rafRef.current = requestAnimationFrame(() => {
          setIsAnimating(true);
          onEnter?.();
        });
      } else {
        // Already rendered, ensure it's visible
        setIsAnimating(true);
      }
    } else {
      setIsAnimating(false);
      onExit?.();
      
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, effectiveDuration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isVisible, effectiveDuration, onEnter, onExit, shouldRender]);

  // Don't render at all if not visible and not animating out
  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`macos-fade-transition ${isAnimating ? 'macos-fade-transition--visible' : 'macos-fade-transition--hidden'} ${className}`}
      style={{ 
        '--transition-duration': `${effectiveDuration}ms`,
        transitionDuration: `${effectiveDuration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)', // macOS easing
        pointerEvents: isAnimating ? 'auto' : 'none'
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

/**
 * Enhanced slide transition with spring physics
 */
interface MacOSSlideTransitionProps extends MacOSTransitionProps {
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export const MacOSSlideTransition: React.FC<MacOSSlideTransitionProps> = ({
  isVisible,
  children,
  direction = 'up',
  distance = 20,
  duration = 350,
  className = '',
  onEnter,
  onExit,
  respectMotionPreference = true
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const systemPreferences = useSystemPreferences();

  const effectiveDuration = respectMotionPreference && systemPreferences.reducedMotion ? 0 : duration;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
        onEnter?.();
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      setIsAnimating(false);
      onExit?.();
      
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, effectiveDuration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, effectiveDuration, onEnter, onExit]);

  if (!shouldRender) {
    return null;
  }

  const getTransform = () => {
    if (systemPreferences.reducedMotion) return 'none';
    
    const transforms = {
      up: `translateY(${distance}px)`,
      down: `translateY(-${distance}px)`,
      left: `translateX(${distance}px)`,
      right: `translateX(-${distance}px)`
    };
    return transforms[direction];
  };

  return (
    <div 
      className={`macos-slide-transition macos-slide-transition--${direction} ${isAnimating ? 'macos-slide-transition--visible' : 'macos-slide-transition--hidden'} ${className}`}
      style={{ 
        '--transition-duration': `${effectiveDuration}ms`,
        '--slide-distance': getTransform(),
        transitionDuration: `${effectiveDuration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)'
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

/**
 * Spring-based scale transition for modal-like components
 */
export const MacOSSpringTransition: React.FC<MacOSTransitionProps> = ({
  isVisible,
  children,
  duration = 400,
  className = '',
  onEnter,
  onExit,
  respectMotionPreference = true
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const systemPreferences = useSystemPreferences();

  const effectiveDuration = respectMotionPreference && systemPreferences.reducedMotion ? 0 : duration;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
        onEnter?.();
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      setIsAnimating(false);
      onExit?.();
      
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, effectiveDuration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, effectiveDuration, onEnter, onExit]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`macos-spring-transition ${isAnimating ? 'macos-spring-transition--visible' : 'macos-spring-transition--hidden'} ${className}`}
      style={{ 
        '--transition-duration': `${effectiveDuration}ms`,
        transitionDuration: `${effectiveDuration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Spring easing
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

/**
 * Staggered list animation for multiple items
 */
interface StaggeredListTransitionProps {
  isVisible: boolean;
  children: ReactNode[];
  staggerDelay?: number;
  duration?: number;
  className?: string;
  respectMotionPreference?: boolean;
}

export const StaggeredListTransition: React.FC<StaggeredListTransitionProps> = ({
  isVisible,
  children,
  staggerDelay = 50,
  duration = 300,
  className = '',
  respectMotionPreference = true
}) => {
  const systemPreferences = useSystemPreferences();
  const effectiveStaggerDelay = respectMotionPreference && systemPreferences.reducedMotion ? 0 : staggerDelay;
  const effectiveDuration = respectMotionPreference && systemPreferences.reducedMotion ? 0 : duration;

  return (
    <div className={`staggered-list-transition ${className}`}>
      {children.map((child, index) => (
        <MacOSFadeTransition
          key={index}
          isVisible={isVisible}
          duration={effectiveDuration}
          className="staggered-list-item"
          respectMotionPreference={respectMotionPreference}
          onEnter={() => {
            // Add stagger delay via CSS animation-delay
            const element = document.querySelector(`.staggered-list-item:nth-child(${index + 1})`);
            if (element && !systemPreferences.reducedMotion) {
              (element as HTMLElement).style.animationDelay = `${index * effectiveStaggerDelay}ms`;
            }
          }}
        >
          {child}
        </MacOSFadeTransition>
      ))}
    </div>
  );
};

/**
 * Page transition for tab switching
 */
interface PageTransitionProps {
  currentPage: string;
  children: { [key: string]: ReactNode };
  direction?: 'horizontal' | 'vertical';
  duration?: number;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  currentPage,
  children,
  direction = 'horizontal',
  duration = 300,
  className = ''
}) => {
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const systemPreferences = useSystemPreferences();

  const effectiveDuration = systemPreferences.reducedMotion ? 0 : duration;

  useEffect(() => {
    if (previousPage && previousPage !== currentPage) {
      setIsTransitioning(true);
      
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousPage(currentPage);
      }, effectiveDuration);

      return () => clearTimeout(timeout);
    } else {
      setPreviousPage(currentPage);
    }
  }, [currentPage, previousPage, effectiveDuration]);

  return (
    <div className={`page-transition page-transition--${direction} ${className}`}>
      {Object.entries(children).map(([pageKey, pageContent]) => {
        const isActive = pageKey === currentPage;
        const isPrevious = pageKey === previousPage && isTransitioning;
        
        if (!isActive && !isPrevious) {
          return null;
        }

        return (
          <div
            key={pageKey}
            className={`page-transition-content ${isActive ? 'page-transition-content--active' : 'page-transition-content--previous'}`}
            style={{
              '--transition-duration': `${effectiveDuration}ms`,
              transitionDuration: `${effectiveDuration}ms`,
              transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)'
            } as React.CSSProperties}
          >
            {pageContent}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Morphing transition for dynamic content
 */
interface MorphTransitionProps {
  children: ReactNode;
  morphKey: string | number;
  duration?: number;
  className?: string;
}

export const MorphTransition: React.FC<MorphTransitionProps> = ({
  children,
  morphKey,
  duration = 250,
  className = ''
}) => {
  const [currentContent, setCurrentContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousKeyRef = useRef(morphKey);
  const systemPreferences = useSystemPreferences();

  const effectiveDuration = systemPreferences.reducedMotion ? 0 : duration;

  useEffect(() => {
    if (previousKeyRef.current !== morphKey) {
      setIsTransitioning(true);
      
      const timeout = setTimeout(() => {
        setCurrentContent(children);
        setIsTransitioning(false);
        previousKeyRef.current = morphKey;
      }, effectiveDuration / 2);

      return () => clearTimeout(timeout);
    }
  }, [morphKey, children, effectiveDuration]);

  return (
    <div 
      className={`morph-transition ${isTransitioning ? 'morph-transition--transitioning' : ''} ${className}`}
      style={{
        '--transition-duration': `${effectiveDuration}ms`,
        transitionDuration: `${effectiveDuration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)'
      } as React.CSSProperties}
    >
      {currentContent}
    </div>
  );
};

/**
 * Parallax scroll transition
 */
interface ParallaxTransitionProps {
  children: ReactNode;
  speed?: number;
  className?: string;
  disabled?: boolean;
}

export const ParallaxTransition: React.FC<ParallaxTransitionProps> = ({
  children,
  speed = 0.5,
  className = '',
  disabled = false
}) => {
  const [scrollY, setScrollY] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const systemPreferences = useSystemPreferences();

  const isDisabled = disabled || systemPreferences.reducedMotion;

  useEffect(() => {
    if (isDisabled) return;

    const handleScroll = () => {
      if (elementRef.current) {
        elementRef.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * speed;
        setScrollY(rate);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, isDisabled]);

  return (
    <div 
      ref={elementRef}
      className={`parallax-transition ${className}`}
      style={{
        transform: isDisabled ? 'none' : `translateY(${scrollY}px)`,
        willChange: isDisabled ? 'auto' : 'transform'
      }}
    >
      {children}
    </div>
  );
};