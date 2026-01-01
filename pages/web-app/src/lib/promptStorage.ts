/**
 * Web-compatible prompt storage using localStorage
 * Each prompt belongs to a project
 */

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

const PROMPTS_KEY = 'web_app_prompts';

class PromptStorage {
  private getPrompts(): Prompt[] {
    try {
      const stored = localStorage.getItem(PROMPTS_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('[PromptStorage] Failed to get prompts:', error);
      return [];
    }
  }

  private savePrompts(prompts: Prompt[]): void {
    try {
      localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts));
    } catch (error) {
      console.error('[PromptStorage] Failed to save prompts:', error);
    }
  }

  async getPromptsByProject(projectId: string): Promise<Prompt[]> {
    const prompts = this.getPrompts();
    return prompts.filter(p => p.projectId === projectId);
  }

  async getPrompt(id: string): Promise<Prompt | null> {
    const prompts = this.getPrompts();
    return prompts.find(p => p.id === id) || null;
  }

  async createPrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prompt> {
    const prompts = this.getPrompts();
    const newPrompt: Prompt = {
      ...prompt,
      id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    prompts.push(newPrompt);
    this.savePrompts(prompts);
    return newPrompt;
  }

  async updatePrompt(id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Promise<Prompt | null> {
    const prompts = this.getPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index === -1) return null;

    prompts[index] = {
      ...prompts[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.savePrompts(prompts);
    return prompts[index];
  }

  async deletePrompt(id: string): Promise<boolean> {
    const prompts = this.getPrompts();
    const filtered = prompts.filter(p => p.id !== id);
    if (filtered.length === prompts.length) return false;
    this.savePrompts(filtered);
    return true;
  }

  async duplicatePrompt(id: string, newProjectId?: string): Promise<Prompt | null> {
    const prompt = await this.getPrompt(id);
    if (!prompt) return null;

    const duplicated: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'> = {
      ...prompt,
      projectId: newProjectId || prompt.projectId,
      title: `${prompt.title} (Copy)`,
    };
    return this.createPrompt(duplicated);
  }
}

export const promptStorage = new PromptStorage();
