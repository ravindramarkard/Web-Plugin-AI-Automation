/**
 * Web-compatible i18n polyfill that mimics Chrome i18n API
 * Uses the same locale files as the extension
 */

import { defaultLocale, getMessageFromLocale } from '@extension/i18n/lib/getMessageFromLocale';

type I18nValue = {
  message: string;
  placeholders?: Record<string, { content?: string; example?: string }>;
};

/**
 * Get the browser's preferred locale
 */
function getBrowserLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.toLowerCase();
    // Map browser locales to supported locales
    if (lang.startsWith('pt')) {
      return 'pt_BR';
    }
    if (lang.startsWith('zh')) {
      return 'zh_TW';
    }
    // Default to English
    return 'en';
  }
  return defaultLocale;
}

/**
 * Translate a message key with optional substitutions
 */
function getMessage(key: string, substitutions?: string | string[]): string {
  const locale = getBrowserLocale();
  const messages = getMessageFromLocale(locale);
  const value = messages[key as keyof typeof messages] as I18nValue | undefined;

  if (!value || !value.message) {
    // Fallback to key if message not found
    console.warn(`[i18n] Message key "${key}" not found for locale "${locale}"`);
    return key;
  }

  let message = value.message;

  // Handle placeholders (e.g., $NAME$)
  if (value.placeholders) {
    Object.entries(value.placeholders).forEach(([placeholderKey, { content }]) => {
      if (!content) {
        return;
      }
      // Replace $PLACEHOLDER$ with the content (which might be $1, $2, etc.)
      message = message.replace(new RegExp(`\\$${placeholderKey}\\$`, 'gi'), content);
    });
  }

  // Handle substitutions
  if (substitutions) {
    if (Array.isArray(substitutions)) {
      // Replace $1, $2, etc. with array values
      return substitutions.reduce((acc, cur, idx) => acc.replace(`$${idx + 1}`, cur), message);
    } else {
      // Replace $1 with single substitution
      return message.replace(/\$1/, substitutions);
    }
  }

  // Remove any remaining placeholders that weren't replaced
  return message.replace(/\$\d+/g, '');
}

/**
 * Get the UI language (locale)
 */
function getUILanguage(): string {
  return getBrowserLocale();
}

// Polyfill Chrome i18n API - MUST run synchronously at module load time
// This ensures chrome.i18n is available before any i18n packages are imported
(function initializeChromeI18nPolyfill() {
  'use strict';
  const global = globalThis as unknown as {
    chrome?: {
      i18n?: {
        getMessage: typeof getMessage;
        getUILanguage: typeof getUILanguage;
      };
    };
  };

  // Initialize chrome object if it doesn't exist
  if (!global.chrome) {
    global.chrome = {} as {
      i18n: {
        getMessage: typeof getMessage;
        getUILanguage: typeof getUILanguage;
      };
    };
  }

  // Always set up i18n polyfill (even if chrome exists, ensure i18n is set)
  if (!global.chrome.i18n) {
    global.chrome.i18n = {
      getMessage,
      getUILanguage,
    };
  } else {
    // Ensure methods are set even if i18n exists
    global.chrome.i18n.getMessage = getMessage;
    global.chrome.i18n.getUILanguage = getUILanguage;
  }

  // Verify it was set correctly
  if (!global.chrome.i18n || !global.chrome.i18n.getMessage) {
    console.error('[WebI18n] Failed to initialize chrome.i18n polyfill');
  }
})();
