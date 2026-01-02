/**
 * Server-side prompt storage using API
 * Each prompt belongs to a project
 */

import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from './apiConfig.js';
import { apiCache } from './apiCache.js';

export interface Prompt {
  id: string;
  projectId: string;
  title: string;
  description: string;
  promptContent: string; // The actual automation prompt
  testType: 'UI Test' | 'API Test' | 'Integration Test' | 'E2E Test';
  tags: string[]; // Array of tags
  additionalContext?: string;
  baseUrl?: string;
  additionalInformation?: string;
  createdAt: number;
  updatedAt: number;
}

class PromptStorage {
  async getPromptsByProject(projectId: string): Promise<Prompt[]> {
    try {
      return await apiGet<Prompt[]>(`${API_ENDPOINTS.prompts}/project/${projectId}`);
    } catch (error) {
      console.error('[PromptStorage] Failed to get prompts:', error);
      return [];
    }
  }

  async getPrompt(id: string): Promise<Prompt | null> {
    try {
      return await apiGet<Prompt>(`${API_ENDPOINTS.prompts}/${id}`);
    } catch (error) {
      console.error('[PromptStorage] Failed to get prompt:', error);
      return null;
    }
  }

  async createPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    try {
      return await apiPost<Prompt>(API_ENDPOINTS.prompts, prompt, API_ENDPOINTS.prompts);
    } catch (error) {
      console.error('[PromptStorage] Failed to create prompt:', error);
      throw error;
    }
  }

  async updatePrompt(id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Promise<Prompt | null> {
    try {
      return await apiPut<Prompt>(`${API_ENDPOINTS.prompts}/${id}`, updates, API_ENDPOINTS.prompts);
    } catch (error) {
      console.error('[PromptStorage] Failed to update prompt:', error);
      return null;
    }
  }

  async deletePrompt(id: string): Promise<boolean> {
    try {
      await apiDelete<{ success: boolean }>(`${API_ENDPOINTS.prompts}/${id}`, API_ENDPOINTS.prompts);
      return true;
    } catch (error) {
      console.error('[PromptStorage] Failed to delete prompt:', error);
      return false;
    }
  }

  async duplicatePrompt(id: string, newProjectId?: string): Promise<Prompt | null> {
    try {
      return await apiPost<Prompt>(
        `${API_ENDPOINTS.prompts}/${id}/duplicate`,
        {
          projectId: newProjectId,
        },
        API_ENDPOINTS.prompts,
      );
    } catch (error) {
      console.error('[PromptStorage] Failed to duplicate prompt:', error);
      return null;
    }
  }
}

export const promptStorage = new PromptStorage();
