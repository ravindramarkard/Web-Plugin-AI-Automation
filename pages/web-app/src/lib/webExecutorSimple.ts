/**
 * Simplified web executor that manually creates Navigator with web-compatible actions
 * Uses web-compatible Planner and Navigator agents that work directly in the browser
 * Does NOT import from chrome-extension to avoid path alias resolution issues
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  llmProviderStore,
  agentModelStore,
  generalSettingsStore,
  firewallStore,
  AgentNameEnum,
} from '@extension/storage';
import { t } from '@extension/i18n';
import { WebPlanner } from './webPlanner';
import { WebNavigator } from './webNavigator';
import { WebActionBuilder } from './webActionBuilder';
import { WebBrowserContext } from './webBrowserContext';
import { WebMessageManager } from './webMessageManager';
import { WebEventManager } from './webEventManager';
import { ExecutionState, Actors, EventType, type AgentEvent, type AgentContext } from './webAgentTypes';
import { SystemMessage } from '@langchain/core/messages';

type EventCallback = (event: AgentEvent) => void;

/**
 * Simplified web executor setup
 * Creates Navigator and Planner with web-compatible browser actions
 */
export async function setupWebExecutorSimple(
  taskId: string,
  task: string,
  onEvent: EventCallback,
): Promise<{ execute: () => Promise<void>; cancel: () => Promise<void> }> {
  // Use web-compatible createChatModel (doesn't import from chrome-extension)
  const { createChatModel } = await import('./webCreateChatModel');

  // Get providers and models
  const providers = await llmProviderStore.getAllProviders();
  if (Object.keys(providers).length === 0) {
    throw new Error(t('bg_setup_noApiKeys'));
  }

  await agentModelStore.cleanupLegacyValidatorSettings();
  const agentModels = await agentModelStore.getAllAgentModels();

  for (const agentModel of Object.values(agentModels)) {
    if (!providers[agentModel.provider]) {
      throw new Error(t('bg_setup_noProvider', [agentModel.provider]));
    }
  }

  const navigatorModel = agentModels[AgentNameEnum.Navigator];
  if (!navigatorModel) {
    throw new Error(t('bg_setup_noNavigatorModel'));
  }

  const navigatorProviderConfig = providers[navigatorModel.provider];
  const navigatorLLM = createChatModel(navigatorProviderConfig, navigatorModel);

  let plannerLLM: BaseChatModel | null = null;
  const plannerModel = agentModels[AgentNameEnum.Planner];
  if (plannerModel) {
    const plannerProviderConfig = providers[plannerModel.provider];
    plannerLLM = createChatModel(plannerProviderConfig, plannerModel);
  }

  // Create web browser context
  const browserContext = new WebBrowserContext();

  // Apply firewall settings
  const firewall = await firewallStore.getFirewall();
  if (firewall.enabled) {
    browserContext.updateConfig({
      allowedUrls: firewall.allowList,
      deniedUrls: firewall.denyList,
    });
  }

  const generalSettings = await generalSettingsStore.getSettings();
  browserContext.updateConfig({
    minimumWaitPageLoadTime: generalSettings.minWaitPageLoad / 1000.0,
    displayHighlights: generalSettings.displayHighlights,
  });

  // Create web-compatible message manager and event manager
  const messageManager = new WebMessageManager();
  const eventManager = new WebEventManager();

  // Create simplified agent context
  const controller = new AbortController();
  const context: AgentContext = {
    taskId,
    browserContext: browserContext as any,
    messageManager: messageManager as any,
    eventManager: eventManager as any,
    options: {
      maxSteps: generalSettings.maxSteps,
      maxFailures: generalSettings.maxFailures,
      maxActionsPerStep: generalSettings.maxActionsPerStep,
      useVision: generalSettings.useVision,
      useVisionForPlanner: true,
      planningInterval: generalSettings.planningInterval,
    },
    nSteps: 0,
    consecutiveFailures: 0,
    paused: false,
    stopped: false,
    controller,
    async emitEvent(actor: string, state: string, details: string) {
      const event: AgentEvent = {
        actor,
        state,
        data: {
          taskId,
          step: this.nSteps,
          maxSteps: this.options.maxSteps,
          details,
        },
        timestamp: Date.now(),
        type: EventType.EXECUTION,
      };
      console.log(`[WebExecutor] Emitting event: ${actor} - ${state} - ${details.substring(0, 50)}`);
      // Emit event - don't await to avoid blocking
      eventManager.emit(event).catch(error => {
        console.error('[WebExecutor] Error emitting event:', error);
      });
    },
    async stop() {
      this.stopped = true;
      setTimeout(() => controller.abort(), 300);
    },
  };

  // Create web-compatible action builder (uses DOM APIs)
  const webActionBuilder = new WebActionBuilder(context);
  const actions = await webActionBuilder.buildDefaultActions();

  // Create Navigator and Planner using web-compatible implementations
  const navigator = new WebNavigator(navigatorLLM, context, actions);
  const planner = new WebPlanner(plannerLLM ?? navigatorLLM, context);

  // Initialize message history with system prompt
  const navigatorSystemPrompt = `You are a web navigation assistant that can work in two modes:

    # MODE 1: WITH CHROME EXTENSION (Full Capabilities)
    - If the Chrome extension is installed, you have FULL access to browser automation
    - You can navigate to ANY website, interact with external sites, control tabs, and automate any web page
    - All actions (click_element, input_text, go_to_url) work on any website
    - This is the recommended mode for full automation capabilities

    # MODE 2: WEB-ONLY MODE (Limited Capabilities)
    - If the extension is not installed, you can only interact with the current page
    - External URLs will open in new tabs, but you cannot interact with them
    - Limited to same-origin pages (localhost:3000)
    - For external sites, recommend installing the Chrome Extension

    # YOUR CAPABILITIES (Extension Mode):
    - Navigate to ANY website (internal or external)
    - Click elements, type text, fill forms on ANY website
    - Access and interact with the active browser tab
    - Execute multiple actions in sequence (e.g., fill registration forms)
    - Full browser automation capabilities

    # YOUR CAPABILITIES (Web-Only Mode):
    - Interact with the current page (if accessible)
    - Click elements, type text on same-origin pages
    - Execute multiple actions in sequence
    - Limited to pages you can access

    # AVAILABLE ACTIONS:
    - click_element: Click on an element using its index (from clickable elements list) or xpath
    - input_text: Type text into an input field using its index or xpath
    - go_to_url: Navigate to a URL (works on any site with extension, limited without)
    - done: Complete the task and provide the final answer

    # HOW TO USE:
    1. You will receive a list of clickable elements with their indices, tag names, text content, and XPath
    2. Use the element's INDEX (the number in brackets like [0], [1], [2]) to interact with it
    3. For input fields, you can see their labels, placeholders, and other attributes
    4. You can verify field names by looking at the element's text, aria-label, or other attributes
    5. You can execute MULTIPLE actions in sequence (e.g., fill a form with multiple fields, then click submit)
    6. When navigating to external URLs, the extension will handle it automatically if available

    # FORM FILLING EXAMPLE:
    For a registration form, you might execute:
    {
      "actions": [
        {"action": "input_text", "index": 16, "text": "John"},
        {"action": "input_text", "index": 17, "text": "Doe"},
        {"action": "input_text", "index": 18, "text": "123 Main St"},
        {"action": "click_element", "index": 27}
      ]
    }

    # IMPORTANT:
    - You ARE running in the browser and CAN interact with web pages
    - The clickable elements list shows you exactly what's on the current page
    - Use the indices provided to interact with elements
    - You can see field names, button labels, and all interactive elements
    - Trust the element information provided - it's from the actual page DOM
    - If extension is available, you have full automation capabilities
    - If extension is not available, you're limited to accessible pages`;

  messageManager.initTaskMessages(new SystemMessage(navigatorSystemPrompt), task);

  // Subscribe to events
  eventManager.subscribe(EventType.EXECUTION, onEvent);

  // Simple execution loop
  const execute = async () => {
    try {
      await context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_START, taskId);

      const maxSteps = context.options.maxSteps;
      let step = 0;
      let latestPlanOutput: any = null;
      let navigatorDone = false;

      for (step = 0; step < maxSteps; step++) {
        context.nSteps = step;

        // Check if stopped
        if (context.stopped || context.controller.signal.aborted) {
          break;
        }

        // Run planner periodically
        if (step % context.options.planningInterval === 0 || step === 0 || navigatorDone) {
          navigatorDone = false;
          try {
            latestPlanOutput = await planner.execute();
            if (latestPlanOutput?.result?.done) {
              break;
            }
          } catch (error) {
            console.error('[WebExecutor] Planner error:', error);
            context.consecutiveFailures++;
            if (context.consecutiveFailures >= context.options.maxFailures) {
              throw new Error('Max failures reached');
            }
          }
        }

        // Execute navigator
        try {
          const navigatorResult = await navigator.execute();
          if (navigatorResult.result?.isDone) {
            navigatorDone = true;
            // Will be validated by next planner run
            continue;
          }
          context.consecutiveFailures = 0; // Reset on success
        } catch (error) {
          console.error('[WebExecutor] Navigator error:', error);
          context.consecutiveFailures++;
          if (context.consecutiveFailures >= context.options.maxFailures) {
            throw new Error('Max failures reached');
          }
        }
      }

      // Task completion
      if (latestPlanOutput?.result?.done) {
        await context.emitEvent(
          Actors.SYSTEM,
          ExecutionState.TASK_OK,
          latestPlanOutput.result.final_answer || 'Task completed',
        );
      } else {
        await context.emitEvent(Actors.SYSTEM, ExecutionState.TASK_FAIL, 'Task did not complete within max steps');
      }
    } catch (error) {
      await context.emitEvent(
        Actors.SYSTEM,
        ExecutionState.TASK_FAIL,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const cancel = async () => {
    await context.stop();
  };

  return { execute, cancel };
}
