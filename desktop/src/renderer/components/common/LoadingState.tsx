import React from 'react';
import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton' | 'pulse';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'medium',
  variant = 'spinner',
  className = ''
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={`loading-skeleton loading-skeleton--${size} ${className}`}>
        <div className="skeleton-line skeleton-line--title"></div>
        <div className="skeleton-line skeleton-line--subtitle"></div>
        <div className="skeleton-line skeleton-line--content"></div>
        <div className="skeleton-line skeleton-line--content skeleton-line--short"></div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`loading-pulse loading-pulse--${size} ${className}`}>
        <div className="pulse-circle"></div>
        <div className="pulse-circle pulse-circle--delayed"></div>
        <div className="pulse-circle pulse-circle--more-delayed"></div>
      </div>
    );
  }

  return (
    <div className={`loading-state loading-state--${size} ${className}`} role="status" aria-live="polite">
      <div className={`loading-spinner loading-spinner--${size}`} aria-hidden="true">
        <div className="spinner-ring"></div>
        <div className="spinner-ring spinner-ring--delayed"></div>
      </div>
      <span className="loading-message">{message}</span>
      <span className="sr-only">Loading content, please wait</span>
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  children
}) => {
  return (
    <div className="loading-overlay-container">
      {children}
      {isVisible && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-overlay-content">
            <LoadingState message={message} size="large" />
          </div>
        </div>
      )}
    </div>
  );
};

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1em',
  borderRadius = 'var(--radius-medium)',
  className = ''
}) => {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div 
      className={`skeleton ${className}`} 
      style={style}
      aria-hidden="true"
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`skeleton-text ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height="1.2em"
          width={index === lines - 1 ? '60%' : '100%'}
          className="skeleton-text-line"
        />
      ))}
    </div>
  );
};