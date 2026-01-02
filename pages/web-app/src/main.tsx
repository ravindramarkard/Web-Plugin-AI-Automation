// IMPORTANT: Initialize web storage polyfill FIRST, before any other imports
// This ensures chrome.storage is available when storage packages are loaded
import './lib/initPolyfill';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Defer non-critical initialization
function init() {
  const rootElement = document.querySelector('#root');
  if (!rootElement) {
    throw new Error('Cannot find #root element');
  }
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Initialize non-critical code after render
  Promise.all([
    import('./lib/initEnvConfig').then(m => m.initializeAllFromEnv()),
    import('./lib/testCaseAPI'), // Initialize Test Case API for console access
  ]).catch(error => {
    console.error('[App] Failed to initialize:', error);
  });
}

init();
