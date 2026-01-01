/**
 * Web-compatible agent types
 * Defines types needed for web app without importing from chrome-extension
 */

export interface ActionResult {
  isDone: boolean;
  success: boolean;
  extractedContent: string | null;
  error: string | null;
  includeInMemory: boolean;
  interactedElement: {
    tagName: string;
    text: string;
    attributes: Record<string, string>;
    xpath: string;
  } | null;
}

export interface AgentContext {
  taskId: string;
  browserContext: any;
  messageManager: any;
  eventManager: any;
  options: {
    maxSteps: number;
    maxFailures: number;
    maxActionsPerStep: number;
    useVision: boolean;
    useVisionForPlanner: boolean;
    planningInterval: number;
  };
  nSteps: number;
  consecutiveFailures: number;
  paused: boolean;
  stopped: boolean;
  controller: AbortController;
  emitEvent: (actor: string, state: string, details: string) => Promise<void>;
  stop: () => Promise<void>;
}

export interface AgentEvent {
  actor: string;
  state: string;
  data: {
    taskId: string;
    step: number;
    maxSteps: number;
    details: string;
  };
  timestamp: number;
  type: string;
}

export enum ExecutionState {
  TASK_START = 'task_start',
  TASK_OK = 'task_ok',
  TASK_FAIL = 'task_fail',
  TASK_CANCEL = 'task_cancel',
  STEP_START = 'step_start',
  STEP_OK = 'step_ok',
  STEP_FAIL = 'step_fail',
  ACT_START = 'act_start',
  ACT_OK = 'act_ok',
  ACT_FAIL = 'act_fail',
}

export enum Actors {
  SYSTEM = 'system',
  NAVIGATOR = 'navigator',
  PLANNER = 'planner',
  VALIDATOR = 'validator',
}

export enum EventType {
  EXECUTION = 'execution',
}
