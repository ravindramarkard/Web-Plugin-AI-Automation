/**
 * Server-side environment storage using API
 */

import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from './apiConfig.js';
import { apiCache } from './apiCache.js';

export interface Environment {
  id: string;
  name: string;
  key: string;
  description: string;
  baseUrl: string;
  apiUrl?: string;
  username?: string;
  password?: string;
  timeout: number; // in milliseconds
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  jiraEnabled: boolean;
  jiraUrl?: string;
  jiraUsername?: string;
  jiraPassword?: string;
  jiraProjectKey?: string;
  llmEnabled: boolean;
  llmProvider?: string;
  llmModel?: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  authorizationEnabled: boolean;
  authType?: 'Bearer Token' | 'API Key' | 'Basic Auth' | 'OAuth2';
  authToken?: string;
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}

class EnvironmentStorage {
  async getAllEnvironments(): Promise<Environment[]> {
    try {
      const environments = await apiGet<Environment[]>(API_ENDPOINTS.environments);
      return Array.isArray(environments) ? environments : [];
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environments:', error);
      return [];
    }
  }

  async getEnvironment(id: string): Promise<Environment | null> {
    try {
      return await apiGet<Environment>(`${API_ENDPOINTS.environments}/${id}`);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environment:', error);
      return null;
    }
  }

  async getEnvironmentByKey(key: string): Promise<Environment | null> {
    try {
      return await apiGet<Environment>(`${API_ENDPOINTS.environments}/key/${key}`);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environment by key:', error);
      return null;
    }
  }

  async createEnvironment(
    environment: Omit<Environment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Environment['status'] },
  ): Promise<Environment> {
    try {
      return await apiPost<Environment>(
        API_ENDPOINTS.environments,
        {
          ...environment,
          status: environment.status || 'active',
        },
        API_ENDPOINTS.environments,
      );
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to create environment:', error);
      throw error;
    }
  }

  async updateEnvironment(
    id: string,
    updates: Partial<Omit<Environment, 'id' | 'createdAt'>>,
  ): Promise<Environment | null> {
    try {
      return await apiPut<Environment>(`${API_ENDPOINTS.environments}/${id}`, updates, API_ENDPOINTS.environments);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to update environment:', error);
      return null;
    }
  }

  async deleteEnvironment(id: string): Promise<boolean> {
    try {
      await apiDelete<{ success: boolean }>(`${API_ENDPOINTS.environments}/${id}`, API_ENDPOINTS.environments);
      return true;
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to delete environment:', error);
      return false;
    }
  }

  async testEnvironment(id: string): Promise<{ success: boolean; message: string }> {
    const environment = await this.getEnvironment(id);
    if (!environment) {
      return { success: false, message: 'Environment not found' };
    }

    try {
      // Test the base URL
      const response = await fetch(environment.baseUrl, { method: 'HEAD', mode: 'no-cors' });
      return { success: true, message: 'Environment connection test successful' };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const environmentStorage = new EnvironmentStorage();
