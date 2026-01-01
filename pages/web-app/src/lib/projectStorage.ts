/**
 * Web-compatible project storage using localStorage
 */

export interface Project {
  id: string;
  name: string;
  team: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'web_app_projects';

class ProjectStorage {
  private getProjects(): Project[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('[ProjectStorage] Failed to get projects:', error);
      return [];
    }
  }

  private saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('[ProjectStorage] Failed to save projects:', error);
    }
  }

  async getAllProjects(): Promise<Project[]> {
    return this.getProjects();
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = this.getProjects();
    return projects.find(p => p.id === id) || null;
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const projects = this.getProjects();
    const newProject: Project = {
      ...project,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects.push(newProject);
    this.saveProjects(projects);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const projects = this.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveProjects(projects);
    return projects[index];
  }

  async deleteProject(id: string): Promise<boolean> {
    const projects = this.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;
    this.saveProjects(filtered);
    return true;
  }
}

export const projectStorage = new ProjectStorage();
