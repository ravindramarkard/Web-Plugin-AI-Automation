/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

import { apiCache } from './apiCache.js';

// Use relative URL in dev (Vite proxy) or absolute URL in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

export const API_ENDPOINTS = {
  projects: `${API_BASE_URL}/projects`,
  testSuites: `${API_BASE_URL}/test-suites`,
  testCases: `${API_BASE_URL}/test-cases`,
  prompts: `${API_BASE_URL}/prompts`,
  environments: `${API_BASE_URL}/environments`,
  execution: `${API_BASE_URL}/execution`,
  testGen: `${API_BASE_URL}/test-gen`,
  settings: `${API_BASE_URL}/settings`,
} as const;

/**
 * Generic API request handler with caching support
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  useCache = true,
  cacheTTL?: number,
): Promise<T> {
  // Check cache for GET requests
  if ((useCache && options.method === undefined) || options.method === 'GET') {
    const cached = apiCache.get<T>(endpoint);
    if (cached !== null) {
      return cached;
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
        // If all else fails, use status-based message
        if (response.status === 404) {
          errorMessage = 'API endpoint not found. Is the server running?';
        } else if (response.status === 0 || response.status >= 500) {
          errorMessage = 'Server error. Is the API server running on http://localhost:3001?';
        }
      }
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Cache successful GET responses
  if (useCache && (options.method === undefined || options.method === 'GET')) {
    apiCache.set(endpoint, data, cacheTTL);
  }

  return data;
}

export async function apiGet<T>(endpoint: string, useCache = true, cacheTTL?: number): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' }, useCache, cacheTTL);
}

export async function apiPost<T>(endpoint: string, data: unknown, invalidateCache?: string): Promise<T> {
  const result = await apiRequest<T>(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    false,
  );

  // Invalidate related cache entries
  if (invalidateCache) {
    apiCache.invalidatePattern(invalidateCache);
  }

  return result;
}

export async function apiPut<T>(endpoint: string, data: unknown, invalidateCache?: string): Promise<T> {
  const result = await apiRequest<T>(
    endpoint,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    false,
  );

  // Invalidate related cache entries
  if (invalidateCache) {
    apiCache.invalidatePattern(invalidateCache);
  }

  return result;
}

export async function apiDelete<T>(endpoint: string, invalidateCache?: string): Promise<T> {
  const result = await apiRequest<T>(endpoint, { method: 'DELETE' }, false);

  // Invalidate related cache entries
  if (invalidateCache) {
    apiCache.invalidatePattern(invalidateCache);
  }

  return result;
}

// Export cache for manual invalidation
export { apiCache };
