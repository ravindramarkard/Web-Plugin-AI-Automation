/**
 * Initialize Chrome polyfills BEFORE any other imports
 * This file should be imported first in the entry point
 */

// Import and execute polyfills in order
import './webStorage'; // Must be first - storage is used by other packages
import './webI18n'; // Must be before i18n imports

// Polyfill chrome.runtime to prevent errors from Chrome extension content scripts
(function initializeChromeRuntimePolyfill() {
  'use strict';
  const global = globalThis as unknown as { chrome?: { runtime?: any } };

  if (!global.chrome) {
    global.chrome = {} as any;
  }

  // Only polyfill runtime if it doesn't exist
  // If the Chrome extension is installed, we want to use the real runtime
  // But we'll add safe defaults to prevent errors
  if (!global.chrome.runtime) {
    global.chrome.runtime = {
      sendMessage: () => {
        console.warn('[WebApp] chrome.runtime.sendMessage called but not available in web app');
        return Promise.resolve();
      },
      onMessage: {
        addListener: () => {
          console.warn('[WebApp] chrome.runtime.onMessage.addListener called but not available in web app');
        },
        removeListener: () => {},
        hasListener: () => false,
      },
      connect: () => {
        console.warn('[WebApp] chrome.runtime.connect called but not available in web app');
        return {
          postMessage: () => {},
          onMessage: { addListener: () => {}, removeListener: () => {} },
          onDisconnect: { addListener: () => {}, removeListener: () => {} },
          disconnect: () => {},
        };
      },
      id: 'web-app',
    };
  } else {
    // If runtime exists (Chrome extension is installed), ensure onMessage listeners
    // don't cause issues by wrapping them
    const originalOnMessage = global.chrome.runtime.onMessage;
    if (originalOnMessage && originalOnMessage.addListener) {
      const originalAddListener = originalOnMessage.addListener.bind(originalOnMessage);
      originalOnMessage.addListener = function (listener: any) {
        // Wrap the listener to ensure it never returns true for async responses
        // unless it actually sends a response
        const wrappedListener = function (message: any, sender: any, sendResponse: any) {
          try {
            const result = listener(message, sender, sendResponse);
            // If listener returns true, ensure sendResponse is called
            if (result === true && sendResponse) {
              // Set a timeout to call sendResponse if it's not called within 100ms
              setTimeout(() => {
                try {
                  sendResponse({ error: 'No response sent' });
                } catch (e) {
                  // Response already sent or channel closed
                }
              }, 100);
            }
            return result;
          } catch (error) {
            console.error('[WebApp] Error in chrome.runtime.onMessage listener:', error);
            if (sendResponse) {
              try {
                sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
              } catch (e) {
                // Response already sent or channel closed
              }
            }
            return false;
          }
        };
        return originalAddListener(wrappedListener);
      };
    }
  }
})();

// The polyfill modules' IIFEs will have already run by this point
// This import ensures the modules are loaded and executed
