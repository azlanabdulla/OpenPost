import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useToastStore } from './stores/toastStore';
import { useRequestStore } from './stores/requestStore';
import { useHistoryStore } from './stores/historyStore';
import { useThemeStore } from './stores/themeStore';

if (typeof window !== 'undefined') {
  (window as unknown as { __OPENPOST_STORES__?: unknown }).__OPENPOST_STORES__ = {
    useToastStore,
    useRequestStore,
    useHistoryStore,
    useThemeStore,
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
