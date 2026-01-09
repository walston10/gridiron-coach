/**
 * Screen Transition Component
 *
 * Provides smooth transitions between major screens/phases.
 * Handles fade, slide, and wipe effects.
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'wipe' | 'none';

interface ScreenTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  type?: TransitionType;
  duration?: number;
  onExitComplete?: () => void;
  className?: string;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  children,
  isVisible,
  type = 'fade',
  duration = 300,
  onExitComplete,
  className = '',
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);
  const { settings } = useSettingsStore();

  // Respect reduced motion
  const actualType = settings.reducedMotion ? 'none' : type;
  const actualDuration = settings.reducedMotion || settings.skipAnimations ? 0 : duration;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, actualDuration);

      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);

      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
        onExitComplete?.();
      }, actualDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, actualDuration, onExitComplete]);

  if (!shouldRender) return null;

  const getStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      transition: `all ${actualDuration}ms ease-in-out`,
    };

    if (actualType === 'none') {
      return baseStyles;
    }

    const entering = isVisible && isAnimating;
    const exiting = !isVisible && isAnimating;
    const visible = isVisible && !isAnimating;

    switch (actualType) {
      case 'fade':
        return {
          ...baseStyles,
          opacity: visible ? 1 : entering ? 1 : 0,
        };

      case 'slide-left':
        return {
          ...baseStyles,
          opacity: visible || entering ? 1 : 0,
          transform: visible ? 'translateX(0)' : entering ? 'translateX(0)' : exiting ? 'translateX(-100%)' : 'translateX(100%)',
        };

      case 'slide-right':
        return {
          ...baseStyles,
          opacity: visible || entering ? 1 : 0,
          transform: visible ? 'translateX(0)' : entering ? 'translateX(0)' : exiting ? 'translateX(100%)' : 'translateX(-100%)',
        };

      case 'slide-up':
        return {
          ...baseStyles,
          opacity: visible || entering ? 1 : 0,
          transform: visible ? 'translateY(0)' : entering ? 'translateY(0)' : 'translateY(20px)',
        };

      case 'wipe':
        return {
          ...baseStyles,
          clipPath: visible || entering ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
        };

      default:
        return baseStyles;
    }
  };

  return (
    <div className={className} style={getStyles()}>
      {children}
    </div>
  );
};

// =============================================================================
// PAGE TRANSITION WRAPPER
// =============================================================================

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pageKey,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(pageKey);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (pageKey !== currentPage) {
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setCurrentPage(pageKey);
        setIsTransitioning(false);
      }, settings.reducedMotion ? 0 : 200);

      return () => clearTimeout(timer);
    }
  }, [pageKey, currentPage, settings.reducedMotion]);

  return (
    <div
      className={`${className} transition-opacity duration-200`}
      style={{
        opacity: isTransitioning ? 0 : 1,
      }}
    >
      {children}
    </div>
  );
};

// =============================================================================
// OVERLAY TRANSITION
// =============================================================================

interface OverlayTransitionProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export const OverlayTransition: React.FC<OverlayTransitionProps> = ({
  children,
  isOpen,
  onClose,
  className = '',
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const { settings } = useSettingsStore();
  const duration = settings.reducedMotion ? 0 : 200;

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity ${isOpen ? 'opacity-70' : 'opacity-0'}`}
        style={{ transitionDuration: `${duration}ms` }}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={`relative z-10 h-full transition-all ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${className}`}
        style={{ transitionDuration: `${duration}ms` }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScreenTransition;
