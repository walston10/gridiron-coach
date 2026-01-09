/**
 * Intro Components - Barrel Export
 */

// New intro system with proper asset loading
export { LoadingScreen } from './LoadingScreen';
export { IntroSequence, getIntroBeats, TEX_INTRO_BEATS } from './IntroSequence';
export { IntroController } from './IntroController';
export { IntroErrorBoundary } from './IntroErrorBoundary';

// Existing components
export { StartScreen } from './StartScreen';
export { GMNameInput } from './GMNameInput';

// Legacy export for compatibility (deprecated - use IntroController)
export { FranchiseIntro } from './FranchiseIntro';
