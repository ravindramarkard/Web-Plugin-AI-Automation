/**
 * Server-side environment storage using API
 */

import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from './apiConfig.js';
import { apiCache } from './apiCache.js';
import { webStorage } from './webStorage';

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
  authKey?: string;
  authValue?: string;
  authLocation?: 'header' | 'query';
  authUsername?: string;
  authPassword?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthTokenUrl?: string;
  oauthScope?: string;
  status: 'active' | 'inactive';
  variables?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

class EnvironmentStorage {
  private getProjectKey(projectId: string) {
    return `environments-${projectId}`;
  }

  async getAllEnvironments(projectId?: string): Promise<Environment[]> {
    try {
      const url = projectId
        ? `${API_ENDPOINTS.environments}?projectId=${encodeURIComponent(projectId)}`
        : API_ENDPOINTS.environments;
      const environments = await apiGet<Environment[]>(url);
      return Array.isArray(environments) ? environments : [];
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environments:', error);
      return [];
    }
  }

  async getEnvironment(id: string, projectId?: string): Promise<Environment | null> {
    try {
      return await apiGet<Environment>(`${API_ENDPOINTS.environments}/${id}`);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environment:', error);
      return null;
    }
  }

  async getEnvironmentByKey(key: string, projectId?: string): Promise<Environment | null> {
    try {
      return await apiGet<Environment>(`${API_ENDPOINTS.environments}/key/${key}`);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environment by key:', error);
      return null;
    }
  }

  async createEnvironment(
    environment: Omit<Environment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Environment['status'] },
    projectId?: string,
  ): Promise<Environment> {
    try {
      return await apiPost<Environment>(
        API_ENDPOINTS.environments,
        {
          ...environment,
          projectId,
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
    projectId?: string,
  ): Promise<Environment | null> {
    try {
      return await apiPut<Environment>(`${API_ENDPOINTS.environments}/${id}`, updates, API_ENDPOINTS.environments);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to update environment:', error);
      return null;
    }
  }

  async deleteEnvironment(id: string, projectId?: string): Promise<boolean> {
    try {
      await apiDelete<{ success: boolean }>(`${API_ENDPOINTS.environments}/${id}`, API_ENDPOINTS.environments);
      return true;
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to delete environment:', error);
      return false;
    }
  }

  async testEnvironment(id: string, projectId?: string): Promise<{ success: boolean; message: string }> {
    const environment = await this.getEnvironment(id, projectId);
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
