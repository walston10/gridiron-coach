/**
 * Intro Error Boundary
 *
 * Catches errors in the intro sequence and provides recovery options.
 * Never shows a broken half-state to the user.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onSkip: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class IntroErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Intro error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleSkip = () => {
    this.props.onSkip();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(139, 69, 19, 0.2) 0%, transparent 50%),
                linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 100%)
              `,
            }}
          />

          {/* Content */}
          <div className="relative z-10 text-center max-w-md px-8">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-amber-500 tracking-tighter">
                ILLEGAL MOTION
              </h1>
            </div>

            {/* Error message */}
            <div className="mb-8">
              <div className="text-red-500 text-lg mb-2">
                Something went wrong
              </div>
              <p className="text-stone-500 text-sm">
                The intro couldn't be loaded properly.
              </p>
              {this.state.error && (
                <p className="text-stone-600 text-xs mt-2 font-mono">
                  {this.state.error.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleSkip}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                Skip Intro
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default IntroErrorBoundary;
