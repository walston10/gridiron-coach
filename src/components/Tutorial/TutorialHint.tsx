/**
 * Tutorial Hint Component
 *
 * Displays contextual hints to guide the player through the game.
 * Supports positioned tooltips and center modals.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTutorialStore, TUTORIAL_HINTS, type TutorialStep } from '../../stores/tutorialStore';
import { soundManager } from '../../utils/soundManager';

export const TutorialHint: React.FC = () => {
  const {
    currentStep,
    isHintVisible,
    highlightedElement,
    completeStep,
    skipStep,
    skipAllTutorials,
    hideHint,
    tutorialsEnabled,
    showHints,
  } = useTutorialStore();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Find and track the highlighted element
  useEffect(() => {
    if (!highlightedElement) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(highlightedElement);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Watch for resize/scroll
      const updateRect = () => {
        const newRect = element.getBoundingClientRect();
        setTargetRect(newRect);
      };

      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect, true);

      return () => {
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect, true);
      };
    }
  }, [highlightedElement]);

  const handleDismiss = useCallback(() => {
    soundManager.play('UI_CLICK');
    if (currentStep) {
      completeStep(currentStep);
    } else {
      hideHint();
    }
  }, [currentStep, completeStep, hideHint]);

  const handleSkip = useCallback(() => {
    soundManager.play('UI_BACK');
    skipStep();
  }, [skipStep]);

  const handleSkipAll = useCallback(() => {
    soundManager.play('UI_BACK');
    skipAllTutorials();
  }, [skipAllTutorials]);

  // Don't render if disabled or no current hint
  if (!isHintVisible || !currentStep) return null;
  if (!tutorialsEnabled && !showHints) return null;

  const hint = TUTORIAL_HINTS[currentStep];
  if (!hint) return null;

  const isCenter = hint.position === 'center' || !highlightedElement;

  // Center modal style
  if (isCenter) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal */}
        <div
          className="relative z-10 max-w-md w-full mx-4 bg-gradient-to-b from-stone-900 to-stone-950 rounded-lg shadow-2xl border border-amber-900/50 overflow-hidden"
          style={{ animation: 'tutorialFadeIn 0.3s ease-out' }}
        >
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-700" />

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-amber-500 mb-3">{hint.title}</h3>
            <p className="text-stone-300 leading-relaxed">{hint.content}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t border-stone-800 bg-stone-900/50">
            <button
              onClick={handleSkipAll}
              className="text-stone-600 hover:text-stone-400 text-sm transition-colors"
            >
              Skip all tips
            </button>
            <div className="flex gap-2">
              {hint.nextStep && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-stone-400 hover:text-white text-sm transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded transition-colors"
              >
                {hint.nextStep ? 'Next' : 'Got it'}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes tutorialFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  // Positioned tooltip style
  const tooltipStyle = getTooltipPosition(hint.position || 'bottom', targetRect);

  return (
    <>
      {/* Highlight overlay */}
      {targetRect && (
        <div className="fixed inset-0 z-[99] pointer-events-none">
          {/* Semi-transparent overlay with cutout */}
          <svg className="w-full h-full">
            <defs>
              <mask id="tutorial-highlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.7)"
              mask="url(#tutorial-highlight-mask)"
            />
          </svg>

          {/* Highlight border */}
          <div
            className="absolute border-2 border-amber-500 rounded-lg animate-pulse"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
            }}
          />
        </div>
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[100] max-w-sm bg-stone-900 border border-amber-900/50 rounded-lg shadow-2xl"
        style={{
          ...tooltipStyle,
          animation: 'tutorialSlideIn 0.3s ease-out',
        }}
      >
        {/* Arrow */}
        <div
          className={`absolute w-3 h-3 bg-stone-900 border-amber-900/50 transform rotate-45 ${getArrowClasses(hint.position || 'bottom')}`}
        />

        {/* Content */}
        <div className="relative p-4">
          <h4 className="text-amber-500 font-bold mb-2">{hint.title}</h4>
          <p className="text-stone-300 text-sm leading-relaxed">{hint.content}</p>
        </div>

        {/* Actions */}
        <div className="relative flex items-center justify-end gap-2 px-4 pb-4">
          <button
            onClick={handleSkip}
            className="text-stone-500 hover:text-stone-300 text-xs transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded transition-colors"
          >
            {hint.nextStep ? 'Next' : 'OK'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tutorialSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function getTooltipPosition(
  position: 'top' | 'bottom' | 'left' | 'right' | 'center',
  targetRect: DOMRect | null
): React.CSSProperties {
  if (!targetRect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const offset = 16;

  switch (position) {
    case 'top':
      return {
        bottom: window.innerHeight - targetRect.top + offset,
        left: targetRect.left + targetRect.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'bottom':
      return {
        top: targetRect.bottom + offset,
        left: targetRect.left + targetRect.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        top: targetRect.top + targetRect.height / 2,
        right: window.innerWidth - targetRect.left + offset,
        transform: 'translateY(-50%)',
      };
    case 'right':
      return {
        top: targetRect.top + targetRect.height / 2,
        left: targetRect.right + offset,
        transform: 'translateY(-50%)',
      };
    default:
      return {
        top: targetRect.bottom + offset,
        left: targetRect.left + targetRect.width / 2,
        transform: 'translateX(-50%)',
      };
  }
}

function getArrowClasses(position: 'top' | 'bottom' | 'left' | 'right' | 'center'): string {
  switch (position) {
    case 'top':
      return 'bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b';
    case 'bottom':
      return 'top-[-6px] left-1/2 -translate-x-1/2 border-l border-t';
    case 'left':
      return 'right-[-6px] top-1/2 -translate-y-1/2 border-r border-t';
    case 'right':
      return 'left-[-6px] top-1/2 -translate-y-1/2 border-l border-b';
    default:
      return 'hidden';
  }
}

// =============================================================================
// TRIGGER HOOK
// =============================================================================

/**
 * Hook to trigger tutorial hints based on game state.
 */
export function useTutorialTrigger() {
  const { showStep, hasCompletedStep, shouldShowHint } = useTutorialStore();

  const triggerHint = useCallback((step: TutorialStep, delay = 500) => {
    if (!shouldShowHint(step)) return;

    setTimeout(() => {
      showStep(step);
    }, delay);
  }, [showStep, shouldShowHint]);

  return { triggerHint, hasCompletedStep };
}

export default TutorialHint;
