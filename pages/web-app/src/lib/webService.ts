/**
 * Web-compatible service layer for agent execution
 * This replaces Chrome runtime messaging with a web-compatible approach
 */

import type { Message, Actors } from '@extension/storage';
import { EventType, ExecutionState, type AgentEvent, type EventData } from '../types/event';
import { generateNewTaskId } from '../utils';
import { setupWebExecutorSimple } from './webExecutorSimple';

export interface WebServiceMessage {
  type: string;
  task?: string;
  taskId?: string;
  tabId?: string | number;
  audio?: string;
  sessionId?: string;
  projectId?: string;
}

export interface WebServiceResponse {
  type: string;
  error?: string;
  text?: string;
  event?: AgentEvent;
  [key: string]: unknown;
}

type MessageHandler = (message: WebServiceMessage) => Promise<WebServiceResponse | void>;
type EventCallback = (event: AgentEvent) => void;

class WebService {
  private handlers: Map<string, MessageHandler> = new Map();
  private eventCallbacks: Set<EventCallback> = new Set();
  private currentTaskId: string | null = null;
  private isExecuting = false;
  private currentExecutor: any | null = null;

  constructor() {
    // Register default handlers
    this.registerHandler('heartbeat', async () => {
      return { type: 'heartbeat_ack' };
    });

    this.registerHandler('new_task', async message => {
      if (!message.task) {
        return { type: 'error', error: 'No task provided' };
      }

      this.currentTaskId = message.taskId || generateNewTaskId();
      this.isExecuting = true;

      // Start tracking actions for Playwright generation
      const { actionTracker } = await import('./actionTracker');
      const baseUrl = this.extractBaseUrl(message.task);
      actionTracker.startTracking(this.currentTaskId, message.task, baseUrl);

      try {
        // Check if extension is available - if so, delegate to extension
        const { extensionBridge } = await import('./extensionBridge');
        const isExtensionAvailable = await extensionBridge.isExtensionAvailable();

        if (isExtensionAvailable) {
          try {
            // Check if LLM is configured in extension
            let llmCheckResponse = await extensionBridge.checkLLMConfigured();

            // Always sync settings for the current project to ensure extension has the correct context
            // This is crucial for project independence
            console.log('[WebService] Syncing project settings to extension for project:', message.projectId);

            try {
              const { llmProviderStore, agentModelStore, AgentNameEnum } = await import('@extension/storage');
              const providers = await llmProviderStore.getAllProviders(message.projectId);
              const agentModels = await agentModelStore.getAllAgentModels(message.projectId);

              console.log('[WebService] Syncing providers:', Object.keys(providers));
              console.log('[WebService] Syncing agent models:', Object.keys(agentModels));

              // Sync all providers
              for (const [providerId, providerConfig] of Object.entries(providers)) {
                try {
                  const syncResponse = await extensionBridge.syncLLMProvider(providerId, providerConfig);
                  if (syncResponse.success) {
                    console.log(`[WebService] Successfully synced provider: ${providerId}`);
                  } else {
                    console.error(`[WebService] Failed to sync provider ${providerId}:`, syncResponse.error);
                  }
                } catch (error) {
                  console.error(`[WebService] Exception syncing provider ${providerId}:`, error);
                }
              }

              // Sync all agent models
              for (const [agentName, modelConfig] of Object.entries(agentModels)) {
                try {
                  const syncResponse = await extensionBridge.syncAgentModel(agentName, modelConfig);
                  if (syncResponse.success) {
                    console.log(`[WebService] Successfully synced agent model: ${agentName}`, modelConfig);
                  } else {
                    console.error(`[WebService] Failed to sync agent model ${agentName}:`, syncResponse.error);
                  }
                } catch (error) {
                  console.error(`[WebService] Exception syncing agent model ${agentName}:`, error);
                }
              }

              // Wait a bit for storage to persist
              await new Promise(resolve => setTimeout(resolve, 500));

              // Check again after sync
              llmCheckResponse = await extensionBridge.checkLLMConfigured();
              console.log('[WebService] Recheck after sync:', llmCheckResponse.data);

              if (!llmCheckResponse.success || !llmCheckResponse.data?.configured) {
                const errorDetails = llmCheckResponse.data || {};
                let errorMessage = 'LLM not configured in extension after sync attempt. ';

                if (!errorDetails.hasProviders) {
                  errorMessage +=
                    'No providers found. Please configure at least one LLM provider in Settings → Models. ';
                }
                if (!errorDetails.hasNavigatorModel) {
                  errorMessage +=
                    'Navigator model not configured. Please configure the Navigator model in Settings → Models. ';
                }

                errorMessage +=
                  'After configuring, go to Settings → Extension and click "Save & Check" to sync the settings.';

                // Log detailed debug info
                console.error('[WebService] LLM configuration check failed:', {
                  hasProviders: errorDetails.hasProviders,
                  hasNavigatorModel: errorDetails.hasNavigatorModel,
                  providerCount: errorDetails.providerCount,
                  webAppProviders: Object.keys(providers),
                  webAppAgentModels: Object.keys(agentModels),
                });

                throw new Error(errorMessage);
              } else {
                console.log('[WebService] LLM configured after sync, proceeding with task');
              }
            } catch (syncError) {
              console.error('[WebService] Failed to sync or recheck LLM config:', syncError);
              throw syncError;
            }

            // Set up event listener for extension events FIRST (before sending task)
            console.log('[WebService] Attempting to connect to extension port...');
            const port = extensionBridge.connect('web-app-connection');
            console.log('[WebService] Port connection result:', port ? 'SUCCESS' : 'FAILED');
            if (port) {
              console.log('[WebService] ✅ Port connected, setting up message listener');

              // Handle port disconnection
              port.onDisconnect.addListener(() => {
                console.log('[WebService] ========== Port onDisconnect triggered ==========');
                // Check for lastError only if chrome.runtime is available
                // onDisconnect doesn't always have a lastError, so we check safely
                let errorMessage = 'Extension port disconnected';
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                  const lastError = chrome.runtime.lastError;
                  errorMessage = lastError.message || errorMessage;
                  // Only log as warning if it's an actual error, not a normal disconnect
                  if (lastError.message && !lastError.message.includes('Receiving end does not exist')) {
                    console.warn('[WebService] Extension port disconnected:', lastError.message);
                  } else {
                    console.log('[WebService] Extension port disconnected (normal disconnect)');
                  }
                } else {
                  console.log('[WebService] Extension port disconnected (no error)');
                }

                console.log('[WebService] Cleaning up executor state');
                this.isExecuting = false;
                this.currentExecutor = null;
              });

              port.onMessage.addListener(async (msg: any) => {
                console.log('[WebService] ========== Received event from extension ==========');
                console.log('[WebService] Raw message:', JSON.stringify(msg, null, 2));
                console.log('[WebService] Message keys:', Object.keys(msg));
                console.log('[WebService] Message type:', msg.type);
                console.log('[WebService] Message actor:', msg.actor);
                console.log('[WebService] Message state:', msg.state);
                console.log('[WebService] Message data:', msg.data);

                if (msg.type === EventType.EXECUTION || msg.actor || msg.state) {
                  // Ensure the event has the correct format
                  // Normalize actor to match Actors enum (lowercase string)
                  let normalizedActor = msg.actor || 'system';
                  if (typeof normalizedActor === 'string') {
                    normalizedActor = normalizedActor.toLowerCase() as Actors;
                  }

                  // Extract content from multiple possible locations
                  const content =
                    msg.data?.details ||
                    msg.data?.message ||
                    msg.data?.content ||
                    msg.content ||
                    msg.message ||
                    msg.details ||
                    '';

                  const event: AgentEvent = {
                    actor: normalizedActor,
                    state: msg.state || ExecutionState.TASK_START,
                    data: {
                      taskId: msg.data?.taskId || msg.taskId || this.currentTaskId || '',
                      step: msg.data?.step || msg.step || 0,
                      maxSteps: msg.data?.maxSteps || msg.maxSteps || 50,
                      details: content,
                      message: content,
                      content: content,
                      ...msg.data, // Include any other data fields
                    },
                    timestamp: msg.timestamp || Date.now(),
                    type: msg.type || EventType.EXECUTION,
                  };
                  console.log('[WebService] ========== Formatted event ==========');
                  console.log('[WebService] Raw actor:', msg.actor);
                  console.log('[WebService] Normalized actor:', normalizedActor);
                  console.log('[WebService] Event state:', event.state);
                  console.log('[WebService] Event details:', event.data?.details);
                  console.log('[WebService] Full event:', JSON.stringify(event, null, 2));

                  // Track actions from extension events
                  console.log('[WebService] Checking if should track action:', {
                    actor: event.actor,
                    state: event.state,
                    isNavigator: event.actor === 'navigator',
                    isActOk: event.state === ExecutionState.ACT_OK,
                    ExecutionState_ACT_OK: ExecutionState.ACT_OK,
                  });

                  // Handle testCodeGenerated event from extension
                  if (event.type === 'testCodeGenerated' && event.data?.testCode) {
                    console.log('[WebService] ✅ Received Playwright code from extension');
                    try {
                      const { testSuiteStorage } = await import('./testSuiteStorage');
                      const { promptStorage } = await import('./promptStorage');
                      const { projectStorage } = await import('./projectStorage');

                      const testCode = event.data.testCode;
                      const testName = event.data.testName || 'Generated Test';
                      const baseUrl = event.data.baseUrl || '';
                      const prompt = event.data.prompt || '';

                      console.log('[WebService] Test code length:', testCode.length);
                      console.log('[WebService] Test name:', testName);
                      console.log('[WebService] Base URL:', baseUrl);
                      console.log('[WebService] Prompt:', prompt.substring(0, 100));

                      // Find matching prompt and project
                      let matchingPrompt = null;
                      let projectId = '';
                      const allProjects = await projectStorage.getAllProjects();

                      for (const project of allProjects) {
                        const projectPrompts = await promptStorage.getPromptsByProject(project.id);
                        const found = projectPrompts.find(
                          p => p.promptContent === prompt || prompt.includes(p.promptContent.substring(0, 50)),
                        );
                        if (found) {
                          matchingPrompt = found;
                          projectId = project.id;
                          break;
                        }
                      }

                      // Use first project if no match found
                      if (!projectId && allProjects.length > 0) {
                        projectId = allProjects[0].id;
                      }

                      if (projectId) {
                        // Find existing test suite (prioritize UI Tests, then any suite)
                        const allSuites = await testSuiteStorage.getTestSuitesByProject(projectId);
                        let testSuite = allSuites.find(s => s.testType === 'UI Tests');

                        // If no UI Tests suite, use the first available suite
                        if (!testSuite && allSuites.length > 0) {
                          testSuite = allSuites[0];
                        }

                        // Save test case (unassigned if no suite found)
                        const newTestCase = await testSuiteStorage.createTestCase({
                          testSuiteId: testSuite?.id || null,
                          name: matchingPrompt?.title || testName,
                          description:
                            matchingPrompt?.description ||
                            `Auto-generated from task execution: ${prompt.substring(0, 100)}`,
                          prompt: prompt,
                          playwrightCode: testCode,
                          baseUrl: baseUrl,
                          testType: 'UI Test',
                          status: 'pass',
                          lastRunAt: Date.now(),
                        });

                        console.log('[WebService] ✅ Test case saved from extension:', newTestCase.id);

                        // Dispatch event to UI
                        window.dispatchEvent(
                          new CustomEvent('testCaseCreated', {
                            detail: {
                              testCaseId: newTestCase.id,
                              suiteId: testSuite?.id || null,
                              projectId: projectId,
                            },
                          }),
                        );
                      }
                    } catch (error) {
                      console.error('[WebService] ❌ Failed to save test case from extension:', error);
                    }
                  }

                  // Track planner events to capture planner description
                  if (event.actor === 'planner' && event.state === ExecutionState.STEP_OK) {
                    console.log('[WebService] ✅ Planner STEP_OK detected - capturing planner description');
                    try {
                      const { actionTracker } = await import('./actionTracker');
                      const plannerDescription =
                        event.data?.details || event.data?.message || event.data?.content || '';
                      if (plannerDescription) {
                        actionTracker.setPlannerDescription(plannerDescription);
                        console.log('[WebService] Captured planner description:', plannerDescription.substring(0, 100));
                      }
                    } catch (error) {
                      console.error('[WebService] ❌ Failed to capture planner description:', error);
                    }
                  }

                  if (event.actor === 'navigator' && event.state === ExecutionState.ACT_OK) {
                    console.log('[WebService] ✅ Navigator ACT_OK detected - tracking action');
                    try {
                      const { actionTracker } = await import('./actionTracker');
                      const details = event.data?.details || '';
                      const eventData = event.data || {};

                      console.log('[WebService] Action details to parse:', details);
                      console.log('[WebService] Event data:', eventData);

                      // Try to extract action info from event data first (structured data)
                      if (eventData.action) {
                        // Extension sent structured action data
                        const actionName = eventData.action;
                        const actionParams = eventData.params || eventData.input || {};
                        const elementMetadata = eventData.elementMetadata;
                        actionTracker.addStep(actionName, actionParams, true, undefined, elementMetadata);
                        console.log('[WebService] Tracked action from structured data:', actionName, actionParams);
                      } else {
                        // Fallback: Parse action from details string
                        if (
                          details.includes('Navigating to') ||
                          details.includes('go to') ||
                          details.includes('navigate to')
                        ) {
                          const urlMatch = details.match(/(https?:\/\/[^\s]+)/);
                          if (urlMatch) {
                            actionTracker.addStep('go_to_url', { url: urlMatch[1] }, true);
                            console.log('[WebService] Tracked go_to_url action from extension (parsed)');
                          }
                        } else if (details.includes('Clicking') || details.includes('Click')) {
                          const indexMatch = details.match(/(?:element|index)[\s:]+(\d+)/i);
                          const xpathMatch = details.match(/xpath[:\s]+([^\s]+)/i);
                          const params: Record<string, any> = {};
                          if (indexMatch) params.index = parseInt(indexMatch[1], 10);
                          if (xpathMatch) params.xpath = xpathMatch[1];
                          actionTracker.addStep('click_element', params, true);
                          console.log('[WebService] Tracked click_element action from extension (parsed)');
                        } else if (
                          details.includes('Typing') ||
                          details.includes('Input') ||
                          details.includes('Entering')
                        ) {
                          const textMatch = details.match(/["']([^"']+)["']/);
                          const indexMatch = details.match(/(?:element|index|field)[\s:]+(\d+)/i);
                          const xpathMatch = details.match(/xpath[:\s]+([^\s]+)/i);
                          const params: Record<string, any> = {};
                          if (textMatch) params.text = textMatch[1];
                          if (indexMatch) params.index = parseInt(indexMatch[1], 10);
                          if (xpathMatch) params.xpath = xpathMatch[1];
                          actionTracker.addStep('input_text', params, true);
                          console.log('[WebService] Tracked input_text action from extension (parsed)');
                        } else if (
                          details.includes('Task completed') ||
                          details.includes('done') ||
                          details.includes('completed')
                        ) {
                          actionTracker.addStep('done', { text: details, success: true }, true);
                          console.log('[WebService] Tracked done action from extension (parsed)');
                        } else {
                          // Generic action tracking - at least record that navigator did something
                          console.log(
                            "[WebService] ⚠️ Navigator ACT_OK but details don't match known patterns:",
                            details,
                          );
                          console.log('[WebService] Details length:', details.length);
                          console.log('[WebService] Details preview:', details.substring(0, 200));
                        }
                      }
                    } catch (error) {
                      console.error('[WebService] ❌ Failed to track action from extension event:', error);
                    }
                  } else {
                    console.log('[WebService] Not tracking - actor:', event.actor, 'state:', event.state);
                  }

                  // Forward executor events to our event callbacks
                  console.log('[WebService] Forwarding event to ChatPage');
                  this.emitEvent(event);
                } else {
                  console.warn('[WebService] ⚠️ Message does not match event format, ignoring');
                }
              });

              // Send task to extension - it will create a new browser window automatically
              // Pass createNewTab: true to ensure a new browser window is always created
              const response = await extensionBridge.sendMessage({
                action: 'new_task',
                task: message.task,
                taskId: this.currentTaskId,
                createNewTab: true, // Always create a new browser window for task execution
              });

              if (response.success) {
                console.log('[WebService] Task started in extension with new browser window');
                return { type: 'task_started', taskId: this.currentTaskId };
              } else {
                throw new Error(response.error || 'Failed to start task in extension');
              }
            } else {
              throw new Error('Failed to connect to extension port');
            }
          } catch (error) {
            console.warn('[WebService] Extension task failed:', error);
            // Don't fall through to web executor for external website tasks
            // Instead, inform the user they need the extension
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.isExecuting = false;

            // Provide more helpful error messages
            let userFriendlyMessage = errorMessage;
            let userFriendlyDetails = `Extension connection failed: ${errorMessage}.`;

            if (
              errorMessage.includes('API key') ||
              errorMessage.includes('noApiKeys') ||
              errorMessage.includes('configure API keys')
            ) {
              userFriendlyMessage = 'Extension API keys not configured';
              userFriendlyDetails = `The Chrome extension requires API keys to be configured in its own settings. Please:\n\n1. Open Chrome Extensions (chrome://extensions)\n2. Find "AITestGen" and click "Options" (or right-click → Options)\n3. Go to the "Models" tab and configure your LLM provider API keys\n4. Save the settings\n5. Try your task again\n\nNote: The web app and extension have separate settings. API keys configured in the web app settings are not automatically shared with the extension.`;
            } else if (errorMessage.includes('noProvider') || errorMessage.includes('provider not configured')) {
              userFriendlyMessage = 'LLM provider not configured in extension';
              userFriendlyDetails = `The extension needs LLM providers to be configured. Please open the extension options page and configure your providers.`;
            } else if (errorMessage.includes('noNavigatorModel') || errorMessage.includes('Navigator model')) {
              userFriendlyMessage = 'Navigator model not configured in extension';
              userFriendlyDetails = `The extension needs agent models to be configured. Please open the extension options page and configure your agent models.`;
            } else {
              userFriendlyDetails += ` For tasks requiring external website access, please ensure the Chrome extension is installed and connected. Go to Settings → Extension to configure it.`;
            }

            this.emitEvent({
              actor: 'system' as Actors,
              state: ExecutionState.TASK_FAIL,
              data: {
                taskId: this.currentTaskId!,
                step: 0,
                maxSteps: 1,
                details: userFriendlyDetails,
              },
              timestamp: Date.now(),
              type: EventType.EXECUTION,
            });
            return {
              type: 'error',
              error: `Extension error: ${userFriendlyMessage}. ${userFriendlyDetails.split('\n')[0]}`,
            };
          }
        } else {
          // Extension not available - check if task requires external website access
          const taskLower = message.task.toLowerCase();
          const requiresExternalAccess =
            taskLower.includes('http://') ||
            taskLower.includes('https://') ||
            taskLower.includes('go to') ||
            taskLower.includes('navigate to') ||
            taskLower.includes('visit') ||
            taskLower.includes('open website') ||
            taskLower.includes('browse to') ||
            taskLower.includes('register') ||
            taskLower.includes('login') ||
            taskLower.includes('fill form') ||
            taskLower.includes('click on') ||
            taskLower.includes('external');

          if (requiresExternalAccess) {
            // Task requires external website access - extension is mandatory
            this.isExecuting = false;
            this.emitEvent({
              actor: 'system' as Actors,
              state: ExecutionState.TASK_FAIL,
              data: {
                taskId: this.currentTaskId!,
                step: 0,
                maxSteps: 1,
                details:
                  'This task requires external website access. Please install and connect the Chrome extension. Go to Settings → Extension to configure it. The extension ID is: obdjgoklifihgkklclbcjkpejipfjhkm',
              },
              timestamp: Date.now(),
              type: EventType.EXECUTION,
            });
            return {
              type: 'error',
              error:
                'Extension required: This task requires external website access. Please install and connect the Chrome extension in Settings → Extension.',
            };
          }
        }

        // Fallback to web-only executor (only for tasks that don't require external access)
        // Setup executor with web-compatible Navigator (uses DOM APIs)
        // This will call the Planner with the user's task and Navigator with web actions
        const executor = await setupWebExecutorSimple(
          this.currentTaskId!,
          message.task,
          (event: AgentEvent) => {
            // Forward events from executor to our event callbacks
            this.emitEvent(event);
            // Note: Task completion is handled in emitEvent() to avoid duplicate calls
            // We don't need to handle it here - emitEvent will call handleTaskCompletion
          },
          message.projectId,
        );

        this.currentExecutor = executor;

        // Execute the task - this will call Planner with the user's task
        // The Navigator will use DOM APIs to interact with the page
        // Don't await - let it run asynchronously
        executor.execute().catch(error => {
          console.error('[WebService] Executor error:', error);
          this.emitEvent({
            actor: 'system' as Actors,
            state: ExecutionState.TASK_FAIL,
            data: {
              taskId: this.currentTaskId!,
              step: 0,
              maxSteps: 50,
              details: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
            timestamp: Date.now(),
            type: EventType.EXECUTION,
          });
          this.isExecuting = false;
          this.currentExecutor = null;
        });

        return { type: 'task_started', taskId: this.currentTaskId };
      } catch (error) {
        console.error('[WebService] Setup executor error:', error);
        this.isExecuting = false;
        return {
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to setup executor',
        };
      }
    });

    this.registerHandler('follow_up_task', async message => {
      if (!message.task) {
        return { type: 'error', error: 'No task provided' };
      }

      this.isExecuting = true;

      // Emit follow-up task event
      this.emitEvent({
        actor: 'system' as Actors,
        state: ExecutionState.TASK_START,
        data: {
          taskId: message.taskId || this.currentTaskId || generateNewTaskId(),
          step: 0,
          maxSteps: 1,
          details: 'Follow-up task started',
        },
        timestamp: Date.now(),
        type: EventType.EXECUTION,
      });

      setTimeout(() => {
        this.emitEvent({
          actor: 'navigator' as Actors,
          state: ExecutionState.TASK_OK,
          data: {
            taskId: message.taskId || this.currentTaskId || generateNewTaskId(),
            step: 1,
            maxSteps: 1,
            details: 'Follow-up task completed (web mode)',
          },
          timestamp: Date.now(),
          type: EventType.EXECUTION,
        });
        this.isExecuting = false;
      }, 1000);

      return { type: 'follow_up_started' };
    });

    this.registerHandler('cancel_task', async () => {
      this.isExecuting = false;
      if (this.currentExecutor) {
        // Cancel the executor
        await this.currentExecutor.cancel();
        this.currentExecutor = null;
      }
      if (this.currentTaskId) {
        this.emitEvent({
          actor: 'system' as Actors,
          state: ExecutionState.TASK_CANCEL,
          data: {
            taskId: this.currentTaskId,
            step: 0,
            maxSteps: 1,
            details: 'Task cancelled',
          },
          timestamp: Date.now(),
          type: EventType.EXECUTION,
        });
      }
      return { type: 'task_cancelled' };
    });

    this.registerHandler('speech_to_text', async message => {
      if (!message.audio) {
        return { type: 'speech_to_text_error', error: 'No audio data provided' };
      }

      // In a real implementation, this would call a speech-to-text service
      // For now, return an error indicating this feature requires the extension
      return {
        type: 'speech_to_text_error',
        error: 'Speech-to-text requires Chrome extension for full functionality',
      };
    });
  }

  registerHandler(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }

  async sendMessage(message: WebServiceMessage): Promise<WebServiceResponse | void> {
    const handler = this.handlers.get(message.type);
    if (handler) {
      return handler(message);
    }
    console.warn(`No handler registered for message type: ${message.type}`);
    return { type: 'error', error: `Unknown message type: ${message.type}` };
  }

  onEvent(callback: EventCallback) {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  private emitEvent(event: AgentEvent) {
    console.log('[WebService] Emitting event:', {
      actor: event.actor,
      state: event.state,
      taskId: event.data?.taskId,
      currentTaskId: this.currentTaskId,
    });

    // Handle task completion for test case generation
    if (event.state === ExecutionState.TASK_OK && this.currentTaskId) {
      console.log('[WebService] ✅ TASK_OK detected, calling handleTaskCompletion...');
      console.log('[WebService] Current task ID:', this.currentTaskId);
      console.log('[WebService] Event task ID:', event.data?.taskId);
      this.handleTaskCompletion(event).catch(error => {
        console.error('[WebService] ❌ Error handling task completion:', error);
        console.error('[WebService] Error stack:', error instanceof Error ? error.stack : String(error));
      });
    } else if (event.state === ExecutionState.TASK_OK) {
      console.warn('[WebService] ⚠️ TASK_OK but no currentTaskId, skipping handleTaskCompletion');
      console.warn('[WebService] Event:', event);
    }

    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[WebService] Error in event callback:', error);
      }
    });
  }

  /**
   * Extract base URL from task text
   */
  private extractBaseUrl(task: string): string {
    const urlMatch = task.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      try {
        const url = new URL(urlMatch[0]);
        return `${url.protocol}//${url.host}`;
      } catch {
        return urlMatch[0];
      }
    }
    return '';
  }

  /**
   * Handle task completion - save as test case if successful
   */
  private async handleTaskCompletion(event: AgentEvent) {
    try {
      console.log('[WebService] ========== handleTaskCompletion STARTED ==========');
      console.log('[WebService] Event:', JSON.stringify(event, null, 2));

      const { actionTracker } = await import('./actionTracker');
      const { generateDetailedPlaywrightCode } = await import('./playwrightGenerator');
      const { testSuiteStorage } = await import('./testSuiteStorage');
      const { promptStorage } = await import('./promptStorage');

      // Check if this task was from a prompt
      const taskId = actionTracker.getCurrentTaskId();
      console.log('[WebService] Task ID from tracker:', taskId);
      console.log('[WebService] Current task ID:', this.currentTaskId);

      if (!taskId || taskId !== this.currentTaskId) {
        console.warn("[WebService] Task IDs don't match or no task ID, skipping test case creation");
        console.warn('[WebService] Tracker taskId:', taskId, 'Current taskId:', this.currentTaskId);
        return; // Not tracking this task
      }

      const steps = actionTracker.getSteps();
      console.log('[WebService] Tracked steps count:', steps.length);
      console.log('[WebService] Steps:', JSON.stringify(steps, null, 2));

      const prompt = actionTracker.getPrompt();
      const baseUrl = actionTracker.getBaseUrl();
      const plannerDescription = actionTracker.getPlannerDescription();
      console.log(
        '[WebService] Planner description:',
        plannerDescription ? plannerDescription.substring(0, 100) : 'none',
      );
      console.log('[WebService] Prompt:', prompt ? prompt.substring(0, 100) : 'null');
      console.log('[WebService] Base URL:', baseUrl);
      console.log('[WebService] Steps tracked:', steps.length);

      if (steps.length === 0) {
        console.warn('[WebService] ⚠️ No steps tracked - actions may not have been captured from extension events');
        console.warn('[WebService] This might happen if actions were not properly tracked from extension events');
        console.warn('[WebService] Task ID:', taskId, 'Current Task ID:', this.currentTaskId);
        // Still continue - will generate minimal code
        console.warn('[WebService] Continuing to create test case with minimal code...');
      }

      if (!prompt) {
        console.warn('[WebService] ⚠️ No prompt found in tracker');
        // Try to get prompt from event data
        const eventPrompt = event.data?.task || event.data?.details || '';
        if (eventPrompt) {
          console.log('[WebService] Using prompt from event data:', eventPrompt.substring(0, 100));
          actionTracker.startTracking(taskId || this.currentTaskId || '', eventPrompt, baseUrl);
        } else {
          console.warn('[WebService] No prompt available, cannot create test case');
          return;
        }
      }

      // Try to find the prompt that was executed
      // We need to search across all projects since we don't have projectId in the task
      let matchingPrompt = null;
      let projectId = '';

      // Get all projects and search their prompts
      const { projectStorage } = await import('./projectStorage');
      const allProjects = await projectStorage.getAllProjects();

      for (const project of allProjects) {
        const projectPrompts = await promptStorage.getPromptsByProject(project.id);
        const found = projectPrompts.find(p => p.promptContent === prompt);
        if (found) {
          matchingPrompt = found;
          projectId = project.id;
          break;
        }
      }

      if (matchingPrompt) {
        console.log('[WebService] Found matching prompt:', matchingPrompt.title);
        // Generate Playwright code using planner
        const testName = matchingPrompt.title || 'Generated Test';
        let playwrightCode = '';

        try {
          // Try to get planner from current executor if available
          // Otherwise, create a temporary planner instance
          const { createChatModel } = await import('./webCreateChatModel');
          const { llmProviderStore, agentModelStore, AgentNameEnum } = await import('@extension/storage');
          const { WebPlanner } = await import('./webPlanner');
          const { WebBrowserContext } = await import('./webBrowserContext');
          const { WebMessageManager } = await import('./webMessageManager');
          const { WebEventManager } = await import('./webEventManager');
          // AgentContext is an interface, we'll create an object that implements it

          // Get providers and models
          const providers = await llmProviderStore.getAllProviders();
          const agentModels = await agentModelStore.getAllAgentModels();
          const plannerModel = agentModels[AgentNameEnum.Planner];

          if (plannerModel && providers[plannerModel.provider]) {
            console.log('[WebService] Creating planner instance to generate Playwright code');
            const plannerProviderConfig = providers[plannerModel.provider];
            const plannerLLM = createChatModel(plannerProviderConfig, plannerModel);

            // Create minimal context for planner (similar to webExecutorSimple)
            const browserContext = new WebBrowserContext();
            const messageManager = new WebMessageManager();
            const eventManager = new WebEventManager();
            const controller = new AbortController();
            type AgentContextType = import('./webAgentTypes').AgentContext;
            const context: AgentContextType = {
              taskId: taskId || this.currentTaskId || '',
              browserContext,
              messageManager,
              eventManager,
              options: {
                maxSteps: 50,
                maxFailures: 5,
                maxActionsPerStep: 10,
                useVision: false,
                useVisionForPlanner: false,
                planningInterval: 5,
              },
              nSteps: 0,
              consecutiveFailures: 0,
              paused: false,
              stopped: false,
              controller,
              emitEvent: async () => {},
              stop: async () => {
                controller.abort();
              },
            };

            const planner = new WebPlanner(plannerLLM, context);

            // Generate Playwright code using planner
            const result = await planner.generatePlaywrightCode(
              steps.map(s => ({
                action: s.action,
                params: s.params,
                elementMetadata: s.elementMetadata,
              })),
              testName,
              baseUrl || matchingPrompt.baseUrl,
            );

            playwrightCode = result.code || '';
            if (result.error) {
              console.warn('[WebService] Planner generated code with error:', result.error);
            }
          } else {
            console.warn('[WebService] Planner model not available, falling back to generator');
            playwrightCode = generateDetailedPlaywrightCode(steps, testName, baseUrl || matchingPrompt.baseUrl);
          }
        } catch (error) {
          console.error('[WebService] Error generating Playwright code with planner:', error);
          // Fall back to generator
          playwrightCode = generateDetailedPlaywrightCode(steps, testName, baseUrl || matchingPrompt.baseUrl);
        }

        if (!playwrightCode) {
          console.warn('[WebService] No Playwright code generated, using fallback');
          playwrightCode = generateDetailedPlaywrightCode(steps, testName, baseUrl || matchingPrompt.baseUrl);
        }

        console.log('[WebService] Generated Playwright code, length:', playwrightCode.length);

        // Find or create a default test suite for this project
        let testSuite = (await testSuiteStorage.getTestSuitesByProject(projectId))[0];
        console.log('[WebService] Found test suite:', testSuite?.name || 'none');

        if (!testSuite) {
          // Create a default test suite with UI Tests type
          console.log('[WebService] Creating default UI Tests suite for project:', projectId);
          testSuite = await testSuiteStorage.createTestSuite({
            projectId,
            name: 'UI Tests',
            description: 'UI test cases automatically generated from successful prompt executions',
            testType: 'UI Tests',
          });
          console.log('[WebService] Created test suite:', testSuite.id);
        }

        let autoSavedTestCaseId: string | undefined;

        // Automatically save the test case
        console.log('[WebService] ========== Auto-saving test case ==========');
        try {
          const newTestCase = await testSuiteStorage.createTestCase({
            testSuiteId: testSuite.id,
            name: testName,
            description:
              matchingPrompt.description ||
              `Auto-generated from prompt: ${matchingPrompt.promptContent.substring(0, 100)}`,
            prompt: matchingPrompt.promptContent,
            plannerDescription: plannerDescription || undefined, // Store planner description if available
            playwrightCode: playwrightCode,
            baseUrl: baseUrl || matchingPrompt.baseUrl,
            testType: 'UI Test',
            status: 'pass',
            lastRunAt: Date.now(),
          });
          autoSavedTestCaseId = newTestCase.id;
          console.log('[WebService] ✅ Test case auto-saved:', newTestCase.id);

          // Dispatch event to notify UI that test case was created
          window.dispatchEvent(
            new CustomEvent('testCaseCreated', {
              detail: {
                testCaseId: newTestCase.id,
                suiteId: testSuite.id,
                projectId: projectId,
              },
            }),
          );
          console.log('[WebService] ✅ testCaseCreated event dispatched');
        } catch (saveError) {
          console.error('[WebService] ❌ Failed to auto-save test case:', saveError);
        }

        // Also dispatch event to show generated code modal (optional - for user to review)
        console.log('[WebService] ========== Preparing to dispatch testCodeGenerated event ==========');
        const eventData = {
          code: playwrightCode,
          prompt: matchingPrompt,
          baseUrl: baseUrl || matchingPrompt.baseUrl,
          autoSavedTestCaseId: autoSavedTestCaseId, // Pass the auto-saved test case ID
        };

        // Dispatch immediately
        console.log('[WebService] Dispatching testCodeGenerated event NOW...');
        window.dispatchEvent(new CustomEvent('testCodeGenerated', { detail: eventData }));
        console.log('[WebService] ========== testCodeGenerated event dispatched ==========');

        // Also dispatch after delay as backup
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('testCodeGenerated', { detail: eventData }));
        }, 500);

        // Clear action tracker
        actionTracker.clear();
      } else {
        console.log('[WebService] No matching prompt found for prompt:', prompt.substring(0, 100));

        // Even if no matching prompt, we can still save as a generic test case
        // Find or create a default test suite for the first project
        const { projectStorage } = await import('./projectStorage');
        const allProjects = await projectStorage.getAllProjects();
        if (allProjects.length > 0) {
          const firstProject = allProjects[0];
          let testSuite = (await testSuiteStorage.getTestSuitesByProject(firstProject.id))[0];

          if (!testSuite) {
            testSuite = await testSuiteStorage.createTestSuite({
              projectId: firstProject.id,
              name: 'UI Tests',
              description: 'UI test cases automatically generated from successful prompt executions',
              testType: 'UI Tests',
            });
          }

          // Generate Playwright code with generic name
          const testName = `Generated Test - ${new Date().toLocaleString()}`;
          const playwrightCode = generateDetailedPlaywrightCode(steps, testName, baseUrl);

          // Save the test case
          try {
            const newTestCase = await testSuiteStorage.createTestCase({
              testSuiteId: testSuite.id,
              name: testName,
              description: `Auto-generated from task execution: ${prompt.substring(0, 100)}`,
              prompt: prompt,
              playwrightCode: playwrightCode,
              baseUrl: baseUrl,
              testType: 'UI Test',
              status: 'pass',
              lastRunAt: Date.now(),
            });
            console.log('[WebService] ✅ Generic test case auto-saved:', newTestCase.id);

            // Dispatch event to notify UI
            window.dispatchEvent(
              new CustomEvent('testCaseCreated', {
                detail: {
                  testCaseId: newTestCase.id,
                  suiteId: testSuite.id,
                  projectId: firstProject.id,
                },
              }),
            );
          } catch (saveError) {
            console.error('[WebService] ❌ Failed to auto-save generic test case:', saveError);
          }
        }
      }
    } catch (error) {
      console.error('[WebService] Failed to save test case:', error);
    }
  }

  getIsExecuting(): boolean {
    return this.isExecuting;
  }
}

// Export singleton instance
export const webService = new WebService();
