import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Root error overlay — pure-DOM diagnostic that ALWAYS shows error text on
 * screen (not just in console). Critical for mobile debugging where dev tools
 * aren't accessible. Captures both React render errors and sync window errors.
 *
 * No store imports, no dependencies — must work even if everything else fails.
 */
class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Root error:', error, info);
  }
  render() {
    if (this.state.error) {
      return renderErrorOverlay(this.state.error.message, this.state.error.stack ?? '');
    }
    return this.props.children;
  }
}

function renderErrorOverlay(message: string, stack: string) {
  return (
    <div style={{
      position: 'fixed', inset: 0, padding: 16, backgroundColor: '#0f172a', color: '#fecaca',
      fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12,
      overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', zIndex: 99999,
    }}>
      <div style={{ color: '#f87171', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
        Runtime error — please screenshot
      </div>
      <div style={{ color: '#fef3c7', fontSize: 13, marginBottom: 12 }}>
        {message}
      </div>
      <div style={{ fontSize: 11, opacity: 0.85 }}>
        {stack}
      </div>
    </div>
  );
}

// Catch sync errors that happen during boot before React is mounted (e.g.
// module-level throws). Inject the overlay directly into the DOM.
if (typeof window !== 'undefined') {
  const showBootError = (msg: string, stack: string) => {
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = '';
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;padding:16px;background:#0f172a;color:#fecaca;font-family:monospace;font-size:12px;overflow:auto;white-space:pre-wrap;word-break:break-word;z-index:99999';
    el.innerHTML = `<div style="color:#f87171;font-weight:700;font-size:16px;margin-bottom:8px">Boot error — please screenshot</div><div style="color:#fef3c7;font-size:13px;margin-bottom:12px"></div><div style="font-size:11px;opacity:0.85"></div>`;
    (el.children[1] as HTMLElement).textContent = msg;
    (el.children[2] as HTMLElement).textContent = stack;
    root.appendChild(el);
  };
  window.addEventListener('error', (e) => {
    showBootError(e.message ?? 'Unknown error', e.error?.stack ?? '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    showBootError(
      reason?.message ?? String(reason),
      reason?.stack ?? '',
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);