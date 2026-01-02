/**
 * Server-side project storage using API
 */

import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from './apiConfig.js';
import { apiCache } from './apiCache.js';

export interface Project {
  id: string;
  name: string;
  team: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

class ProjectStorage {
  async getAllProjects(): Promise<Project[]> {
    try {
      const projects = await apiGet<Project[]>(API_ENDPOINTS.projects);
      return Array.isArray(projects) ? projects : [];
    } catch (error) {
      console.error('[ProjectStorage] Failed to get projects:', error);
      return [];
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      return await apiGet<Project>(`${API_ENDPOINTS.projects}/${id}`);
    } catch (error) {
      console.error('[ProjectStorage] Failed to get project:', error);
      return null;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      return await apiPost<Project>(API_ENDPOINTS.projects, project, API_ENDPOINTS.projects);
    } catch (error) {
      console.error('[ProjectStorage] Failed to create project:', error);
      throw error;
    }
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    try {
      return await apiPut<Project>(`${API_ENDPOINTS.projects}/${id}`, updates, API_ENDPOINTS.projects);
    } catch (error) {
      console.error('[ProjectStorage] Failed to update project:', error);
      return null;
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    try {
      await apiDelete<{ success: boolean }>(`${API_ENDPOINTS.projects}/${id}`, API_ENDPOINTS.projects);
      return true;
    } catch (error) {
      console.error('[ProjectStorage] Failed to delete project:', error);
      return false;
    }
  }
}

export const projectStorage = new ProjectStorage();
