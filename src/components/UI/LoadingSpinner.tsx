/**
 * Loading Spinner Component
 *
 * Various loading indicators for different contexts.
 */

import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'amber' | 'white' | 'stone';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'amber',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  const colorClasses = {
    amber: 'border-amber-500',
    white: 'border-white',
    stone: 'border-stone-500',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
};

// =============================================================================
// LOADING OVERLAY
// =============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  fullScreen = false,
}) => {
  if (!isLoading) return null;

  return (
    <div
      className={`${fullScreen ? 'fixed' : 'absolute'} inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50`}
    >
      <Spinner size="lg" />
      {message && (
        <p className="text-stone-400 mt-4 text-sm">{message}</p>
      )}
    </div>
  );
};

// =============================================================================
// FOOTBALL SPINNER (Custom themed)
// =============================================================================

export const FootballSpinner: React.FC<{ size?: number; className?: string }> = ({
  size = 48,
  className = '',
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Football shape */}
      <div
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: '1s' }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="6"
            transform="rotate(45 12 12)"
            stroke="currentColor"
            strokeWidth="2"
            className="text-amber-600"
          />
          {/* Laces */}
          <line
            x1="12"
            y1="7"
            x2="12"
            y2="17"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-white"
          />
          <line x1="10" y1="9" x2="14" y2="9" stroke="currentColor" strokeWidth="1" className="text-white" />
          <line x1="10" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1" className="text-white" />
          <line x1="10" y1="15" x2="14" y2="15" stroke="currentColor" strokeWidth="1" className="text-white" />
        </svg>
      </div>
    </div>
  );
};

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
  progress: number; // 0-100
  showPercent?: boolean;
  color?: 'amber' | 'green' | 'red' | 'blue';
  height?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showPercent = false,
  color = 'amber',
  height = 'md',
  animated = true,
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4',
  };

  const colorClasses = {
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className={className}>
      <div className={`w-full ${heightClasses[height]} bg-stone-800 rounded-full overflow-hidden`}>
        <div
          className={`${heightClasses[height]} ${colorClasses[color]} ${animated ? 'transition-all duration-300' : ''} rounded-full`}
          style={{ width: `${clampedProgress}%` }}
        >
          {animated && (
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
      {showPercent && (
        <div className="text-right text-stone-500 text-xs mt-1">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SKELETON LOADER
// =============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  rounded = 'md',
  className = '',
}) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`bg-stone-800 animate-pulse ${roundedClasses[rounded]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

// =============================================================================
// CARD SKELETON
// =============================================================================

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-stone-900 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton width={48} height={48} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton height={12} />
        <Skeleton height={12} width="80%" />
      </div>
    </div>
  );
};

// =============================================================================
// PULSE DOT
// =============================================================================

export const PulseDot: React.FC<{ color?: 'amber' | 'green' | 'red'; className?: string }> = ({
  color = 'amber',
  className = '',
}) => {
  const colorClasses = {
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <span className={`relative flex h-3 w-3 ${className}`}>
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClasses[color]} opacity-75`}
      />
      <span
        className={`relative inline-flex rounded-full h-3 w-3 ${colorClasses[color]}`}
      />
    </span>
  );
};

// Animation for shimmer effect
const shimmerStyle = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`;

// Inject style if needed
if (typeof document !== 'undefined') {
  const styleId = 'loading-spinner-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyle;
    document.head.appendChild(style);
  }
}

export default Spinner;
