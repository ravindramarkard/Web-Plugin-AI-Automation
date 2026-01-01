/**
 * Action Tracker
 * Tracks navigator actions during execution for Playwright script generation
 */

export interface NavigatorStep {
  action: string;
  params: Record<string, any>;
  timestamp: number;
  success: boolean;
  error?: string;
}

class ActionTracker {
  private steps: NavigatorStep[] = [];
  private currentTaskId: string | null = null;
  private prompt: string = '';
  private baseUrl: string = '';

  /**
   * Start tracking actions for a new task
   */
  startTracking(taskId: string, prompt: string, baseUrl?: string) {
    console.log('[ActionTracker] ========== STARTING TRACKING ==========');
    console.log('[ActionTracker] TaskId:', taskId);
    console.log('[ActionTracker] Prompt:', prompt.substring(0, 100));
    console.log('[ActionTracker] BaseUrl:', baseUrl);
    this.currentTaskId = taskId;
    this.prompt = prompt;
    this.baseUrl = baseUrl || '';
    this.steps = [];
    console.log('[ActionTracker] Tracking initialized, steps cleared');
  }

  /**
   * Add a navigator step
   */
  addStep(action: string, params: Record<string, any>, success: boolean = true, error?: string) {
    if (!this.currentTaskId) {
      console.warn('[ActionTracker] No active task to track, ignoring step:', action);
      return;
    }

    const step: NavigatorStep = {
      action,
      params,
      timestamp: Date.now(),
      success,
      error,
    };

    this.steps.push(step);
    console.log('[ActionTracker] Added step:', {
      action,
      params: JSON.stringify(params).substring(0, 100),
      success,
      totalSteps: this.steps.length,
    });
  }

  /**
   * Get all tracked steps
   */
  getSteps(): NavigatorStep[] {
    console.log('[ActionTracker] Getting steps, total count:', this.steps.length);
    return [...this.steps];
  }

  /**
   * Get the current task ID
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  /**
   * Get the prompt
   */
  getPrompt(): string {
    return this.prompt;
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Clear tracking data
   */
  clear() {
    this.steps = [];
    this.currentTaskId = null;
    this.prompt = '';
    this.baseUrl = '';
  }

  /**
   * Check if there are tracked steps
   */
  hasSteps(): boolean {
    return this.steps.length > 0;
  }
}

export const actionTracker = new ActionTracker();
