/**
 * Web-compatible storage adapter that mimics Chrome storage API
 * Uses localStorage for persistence
 *
 * IMPORTANT: This module MUST be imported before any @extension/storage imports
 * to ensure chrome.storage is available when storage packages load.
 */

export interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

export interface StorageArea {
  get: (keys?: string | string[] | { [key: string]: unknown } | null) => Promise<{ [key: string]: unknown }>;
  set: (items: { [key: string]: unknown }) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
  onChanged: {
    addListener: (callback: (changes: { [key: string]: StorageChange }, areaName: string) => void) => void;
    removeListener: (callback: (changes: { [key: string]: StorageChange }, areaName: string) => void) => void;
  };
}

class WebStorageArea implements StorageArea {
  private prefix: string;
  private listeners: Array<(changes: { [key: string]: StorageChange }, areaName: string) => void> = [];

  constructor(areaName: string) {
    this.prefix = `web_storage_${areaName}_`;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(keys?: string | string[] | { [key: string]: unknown } | null): Promise<{ [key: string]: unknown }> {
    const result: { [key: string]: unknown } = {};

    if (keys === null || keys === undefined) {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          const originalKey = key.substring(this.prefix.length);
          allKeys.push(originalKey);
        }
      }
      for (const key of allKeys) {
        const value = localStorage.getItem(this.getKey(key));
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      }
      return result;
    }

    if (typeof keys === 'string') {
      const value = localStorage.getItem(this.getKey(keys));
      if (value !== null) {
        try {
          result[keys] = JSON.parse(value);
        } catch {
          result[keys] = value;
        }
      }
      return result;
    }

    if (Array.isArray(keys)) {
      for (const key of keys) {
        const value = localStorage.getItem(this.getKey(key));
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      }
      return result;
    }

    for (const key of Object.keys(keys)) {
      const value = localStorage.getItem(this.getKey(key));
      if (value !== null) {
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      } else if (keys[key] !== undefined) {
        result[key] = keys[key];
      }
    }
    return result;
  }

  async set(items: { [key: string]: unknown }): Promise<void> {
    const changes: { [key: string]: StorageChange } = {};

    for (const [key, value] of Object.entries(items)) {
      const storageKey = this.getKey(key);
      const oldValueStr = localStorage.getItem(storageKey);
      let oldValue: unknown = undefined;
      if (oldValueStr !== null) {
        try {
          oldValue = JSON.parse(oldValueStr);
        } catch {
          oldValue = oldValueStr;
        }
      }

      const newValueStr = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(storageKey, newValueStr);

      changes[key] = {
        oldValue,
        newValue: value,
      };
    }

    if (Object.keys(changes).length > 0) {
      this.listeners.forEach(listener => {
        try {
          listener(changes, this.prefix);
        } catch (error) {
          console.error('Error in storage change listener:', error);
        }
      });
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const changes: { [key: string]: StorageChange } = {};

    for (const key of keyArray) {
      const storageKey = this.getKey(key);
      const oldValueStr = localStorage.getItem(storageKey);
      let oldValue: unknown = undefined;
      if (oldValueStr !== null) {
        try {
          oldValue = JSON.parse(oldValueStr);
        } catch {
          oldValue = oldValueStr;
        }
        localStorage.removeItem(storageKey);
        changes[key] = {
          oldValue,
          newValue: undefined,
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      this.listeners.forEach(listener => {
        try {
          listener(changes, this.prefix);
        } catch (error) {
          console.error('Error in storage change listener:', error);
        }
      });
    }
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key.substring(this.prefix.length));
      }
    }
    await this.remove(keysToRemove);
  }

  onChanged = {
    addListener: (callback: (changes: { [key: string]: StorageChange }, areaName: string) => void) => {
      this.listeners.push(callback);
    },
    removeListener: (callback: (changes: { [key: string]: StorageChange }, areaName: string) => void) => {
      this.listeners = this.listeners.filter(l => l !== callback);
    },
  };
}

// Create web storage API that mimics Chrome storage
export const webStorage = {
  local: new WebStorageArea('local') as StorageArea,
  sync: new WebStorageArea('sync') as StorageArea,
  session: new WebStorageArea('session') as StorageArea,
  managed: new WebStorageArea('managed') as StorageArea,
};

// Polyfill Chrome storage - MUST run synchronously at module load time
// This ensures chrome.storage is available before any storage packages are imported
(function initializeChromeStoragePolyfill() {
  'use strict';
  const global = globalThis as unknown as { chrome?: { storage?: typeof webStorage } };

  // Initialize chrome object if it doesn't exist
  if (!global.chrome) {
    global.chrome = {} as { storage: typeof webStorage };
  }

  // Always set up storage polyfill (even if chrome exists, ensure storage is set)
  // This handles cases where chrome exists but chrome.storage doesn't
  if (!global.chrome.storage) {
    global.chrome.storage = webStorage;
  } else {
    // If storage already exists, merge our polyfill methods
    // This ensures our polyfill is used even if something else set chrome.storage
    global.chrome.storage = webStorage;
  }

  // Verify it was set correctly
  if (!global.chrome.storage) {
    console.error('[WebStorage] Failed to initialize chrome.storage polyfill');
  }
})();
