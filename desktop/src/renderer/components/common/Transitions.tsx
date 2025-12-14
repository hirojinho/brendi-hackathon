import React, { useState, useEffect, useRef, ReactNode } from 'react';
import './Transitions.css';

interface FadeTransitionProps {
  isVisible: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  isVisible,
  children,
  duration = 200,
  className = '',
  onEnter,
  onExit
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimating(true);
      onEnter?.();
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      setIsAnimating(false);
      onExit?.();
      
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, duration, onEnter, onExit]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`fade-transition ${isAnimating ? 'fade-transition--visible' : 'fade-transition--hidden'} ${className}`}
      style={{ 
        '--transition-duration': `${duration}ms`,
        transitionDuration: `${duration}ms`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

interface SlideTransitionProps {
  isVisible: boolean;
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  isVisible,
  children,
  direction = 'up',
  duration = 300,
  className = '',
  onEnter,
  onExit
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
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
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, duration, onEnter, onExit]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`slide-transition slide-transition--${direction} ${isAnimating ? 'slide-transition--visible' : 'slide-transition--hidden'} ${className}`}
      style={{ 
        '--transition-duration': `${duration}ms`,
        transitionDuration: `${duration}ms`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

interface ScaleTransitionProps {
  isVisible: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export const ScaleTransition: React.FC<ScaleTransitionProps> = ({
  isVisible,
  children,
  duration = 200,
  className = '',
  onEnter,
  onExit
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

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
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, duration, onEnter, onExit]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`scale-transition ${isAnimating ? 'scale-transition--visible' : 'scale-transition--hidden'} ${className}`}
      style={{ 
        '--transition-duration': `${duration}ms`,
        transitionDuration: `${duration}ms`
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

interface CollapseTransitionProps {
  isVisible: boolean;
  children: ReactNode;
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export const CollapseTransition: React.FC<CollapseTransitionProps> = ({
  isVisible,
  children,
  duration = 300,
  className = '',
  onEnter,
  onExit
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      // Measure content height
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        setHeight(0);
        
        requestAnimationFrame(() => {
          setHeight(contentHeight);
          setIsAnimating(true);
          onEnter?.();
        });
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      if (contentRef.current) {
        setHeight(contentRef.current.scrollHeight);
        
        requestAnimationFrame(() => {
          setHeight(0);
          setIsAnimating(false);
          onExit?.();
        });
      }
      
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        setHeight('auto');
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, duration, onEnter, onExit]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div 
      className={`collapse-transition ${isAnimating ? 'collapse-transition--visible' : 'collapse-transition--hidden'} ${className}`}
      style={{ 
        height: height === 'auto' ? 'auto' : `${height}px`,
        '--transition-duration': `${duration}ms`,
        transitionDuration: `${duration}ms`
      } as React.CSSProperties}
    >
      <div ref={contentRef} className="collapse-transition-content">
        {children}
      </div>
    </div>
  );
};

interface StaggeredTransitionProps {
  isVisible: boolean;
  children: ReactNode[];
  staggerDelay?: number;
  duration?: number;
  className?: string;
}

export const StaggeredTransition: React.FC<StaggeredTransitionProps> = ({
  isVisible,
  children,
  staggerDelay = 50,
  duration = 200,
  className = ''
}) => {
  return (
    <div className={`staggered-transition ${className}`}>
      {children.map((child, index) => (
        <FadeTransition
          key={index}
          isVisible={isVisible}
          duration={duration}
          className="staggered-transition-item"
          style={{
            '--stagger-delay': `${index * staggerDelay}ms`,
            animationDelay: `${index * staggerDelay}ms`
          } as React.CSSProperties}
        >
          {child}
        </FadeTransition>
      ))}
    </div>
  );
};