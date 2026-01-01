/**
 * Web-compatible environment storage using localStorage
 */

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

const ENVIRONMENTS_KEY = 'web_app_environments';

class EnvironmentStorage {
  private getEnvironments(): Environment[] {
    try {
      const stored = localStorage.getItem(ENVIRONMENTS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to get environments:', error);
      return [];
    }
  }

  private saveEnvironments(environments: Environment[]): void {
    try {
      localStorage.setItem(ENVIRONMENTS_KEY, JSON.stringify(environments));
    } catch (error) {
      console.error('[EnvironmentStorage] Failed to save environments:', error);
    }
  }

  async getAllEnvironments(): Promise<Environment[]> {
    return this.getEnvironments();
  }

  async getEnvironment(id: string): Promise<Environment | null> {
    const environments = this.getEnvironments();
    return environments.find(e => e.id === id) || null;
  }

  async getEnvironmentByKey(key: string): Promise<Environment | null> {
    const environments = this.getEnvironments();
    return environments.find(e => e.key === key) || null;
  }

  async createEnvironment(
    environment: Omit<Environment, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Environment['status'] },
  ): Promise<Environment> {
    const environments = this.getEnvironments();
    const newEnvironment: Environment = {
      ...environment,
      id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: environment.status || 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    environments.push(newEnvironment);
    this.saveEnvironments(environments);
    return newEnvironment;
  }

  async updateEnvironment(
    id: string,
    updates: Partial<Omit<Environment, 'id' | 'createdAt'>>,
  ): Promise<Environment | null> {
    const environments = this.getEnvironments();
    const index = environments.findIndex(e => e.id === id);
    if (index === -1) return null;

    environments[index] = {
      ...environments[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveEnvironments(environments);
    return environments[index];
  }

  async deleteEnvironment(id: string): Promise<boolean> {
    const environments = this.getEnvironments();
    const filtered = environments.filter(e => e.id !== id);
    if (filtered.length === environments.length) return false;
    this.saveEnvironments(filtered);
    return true;
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
