/**
 * Orientation Prompt
 *
 * Shown when device is in portrait mode but landscape is required.
 * Mobile-first design requirement for gameplay.
 */

import React, { useEffect, useState } from 'react';

interface OrientationPromptProps {
  /** Whether to show the prompt */
  forceShow?: boolean;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  forceShow = false,
}) => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if we're on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (!isMobile) {
        setShowPrompt(false);
        return;
      }

      // Check orientation
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowPrompt(isPortrait);
    };

    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!showPrompt && !forceShow) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      {/* Rotating phone icon */}
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1.5rem',
          animation: 'rotatePhone 1.5s ease-in-out infinite',
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: 'rotate(-90deg)',
          }}
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12" y2="18" />
        </svg>
      </div>

      <h2
        style={{
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '0.75rem',
        }}
      >
        Rotate Your Device
      </h2>

      <p
        style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1rem',
          maxWidth: '280px',
          lineHeight: 1.5,
        }}
      >
        Gridiron Coach plays best in landscape mode. Please rotate your device
        to continue.
      </p>

      {/* Animated arrow */}
      <div
        style={{
          marginTop: '2rem',
          color: 'rgba(255, 255, 255, 0.5)',
          animation: 'bounce 1s ease-in-out infinite',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
          <polyline points="21 3 21 12 12 12" />
        </svg>
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes rotatePhone {
            0%, 100% {
              transform: rotate(0deg);
            }
            50% {
              transform: rotate(-90deg);
            }
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>
    </div>
  );
};

export default OrientationPrompt;
