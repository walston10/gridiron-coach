/**
 * Global Error Boundary
 *
 * Catches unhandled errors and provides recovery options.
 * Prevents the entire app from crashing on errors.
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Global error caught:', error, errorInfo);
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log to analytics/monitoring (if available)
    this.logError(error, errorInfo);
  }

  logError(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Store locally for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('illegal-motion-errors') || '[]');
      existingErrors.push(errorData);
      // Keep only last 10 errors
      const trimmed = existingErrors.slice(-10);
      localStorage.setItem('illegal-motion-errors', JSON.stringify(trimmed));
    } catch {
      // localStorage might be full or unavailable
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    // Clear all stored data and reload
    if (window.confirm('This will clear all saved data and start fresh. Are you sure?')) {
      try {
        localStorage.clear();
        // Clear IndexedDB
        indexedDB.deleteDatabase('illegal-motion-saves');
      } catch {
        // Ignore errors during cleanup
      }
      window.location.reload();
    }
  };

  handleMainMenu = () => {
    // Try to reset to main menu
    try {
      useGameStore.getState().resetFranchise();
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    } catch {
      // If that fails, just reload
      this.handleReload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // If we've had too many errors, suggest a full reset
      const tooManyErrors = this.state.errorCount >= 3;

      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(220, 38, 38, 0.2) 0%, transparent 50%),
                linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)
              `,
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center max-w-lg px-8">
            {/* Icon */}
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black text-red-500 mb-2">
              Something Went Wrong
            </h1>
            <p className="text-stone-400 mb-8">
              {tooManyErrors
                ? 'Multiple errors have occurred. A fresh start may be needed.'
                : 'An unexpected error occurred. Your progress may not be affected.'
              }
            </p>

            {/* Error details (collapsed by default) */}
            <details className="mb-8 text-left">
              <summary className="text-stone-600 cursor-pointer hover:text-stone-400 text-sm">
                Technical Details
              </summary>
              <div className="mt-4 p-4 bg-stone-900 rounded border border-stone-800 overflow-auto max-h-40">
                <p className="text-red-400 font-mono text-xs">
                  {this.state.error?.message || 'Unknown error'}
                </p>
                {this.state.error?.stack && (
                  <pre className="text-stone-600 font-mono text-xs mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            </details>

            {/* Actions */}
            <div className="space-y-3">
              {!tooManyErrors && (
                <button
                  onClick={this.handleRetry}
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded transition-colors"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={this.handleMainMenu}
                className="w-full px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded transition-colors"
              >
                Return to Main Menu
              </button>

              <button
                onClick={this.handleReload}
                className="w-full px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded transition-colors"
              >
                Reload Game
              </button>

              {tooManyErrors && (
                <button
                  onClick={this.handleReset}
                  className="w-full px-6 py-3 bg-red-900/50 hover:bg-red-900 text-red-400 font-bold rounded border border-red-900 transition-colors"
                >
                  Clear Data & Start Fresh
                </button>
              )}
            </div>

            {/* Help text */}
            <p className="text-stone-700 text-xs mt-8">
              If this keeps happening, please{' '}
              <a
                href="https://github.com/walston10/gridiron-coach/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 hover:text-stone-400 underline"
              >
                report the issue
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// ASYNC ERROR HANDLER
// =============================================================================

/**
 * Hook for handling async errors that aren't caught by boundaries.
 */
export function useAsyncErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Async error${context ? ` in ${context}` : ''}:`, error);

    // Show toast notification or modal
    // For now, just log it
  }, []);

  return { handleError };
}

// =============================================================================
// PROMISE ERROR WRAPPER
// =============================================================================

/**
 * Wrap a promise to catch and handle errors.
 */
export async function withErrorHandling<T>(
  promise: Promise<T>,
  onError?: (error: Error) => void
): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    console.error('Promise error:', err);
    return null;
  }
}

export default GlobalErrorBoundary;
