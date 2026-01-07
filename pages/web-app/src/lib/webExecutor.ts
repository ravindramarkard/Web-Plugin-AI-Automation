/**
 * Web-compatible executor setup
 * Creates and runs the actual Executor with Planner and Navigator agents
 * Uses dynamic imports to avoid bundling chrome-extension code
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

// Use dynamic imports to avoid bundling chrome-extension code
// This prevents path alias resolution issues
async function loadChromeExtensionModules() {
  // Use absolute paths to avoid alias resolution issues
  const executorModule = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/executor'
  );
  const helperModule = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/helper'
  );
  const eventTypesModule = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/event/types'
  );

  return {
    Executor: executorModule.Executor,
    createChatModel: helperModule.createChatModel,
    EventType: eventTypesModule.EventType,
  };
}

type EventCallback = (event: any) => void;

/**
 * Create a minimal browser context for web app
 * This provides basic functionality without full browser automation
 */
class WebBrowserContext {
  private config: {
    allowedUrls?: string[];
    deniedUrls?: string[];
    minimumWaitPageLoadTime?: number;
    displayHighlights?: boolean;
  } = {};

  updateConfig(config: {
    allowedUrls?: string[];
    deniedUrls?: string[];
    minimumWaitPageLoadTime?: number;
    displayHighlights?: boolean;
  }): void {
    this.config = { ...this.config, ...config };
  }

  getConfig() {
    return this.config;
  }

  private async getBasicState(): Promise<{
    url: string;
    title: string;
    viewport: { width: number; height: number };
    domTree: string;
  }> {
    // Return a minimal state for web app
    return {
      url: typeof window !== 'undefined' ? window.location.href : '',
      title: typeof document !== 'undefined' ? document.title : '',
      viewport: {
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
      },
      domTree: typeof document !== 'undefined' ? document.documentElement.outerHTML.substring(0, 10000) : '',
    };
  }

  // Stub methods required by BrowserContext interface
  async getCurrentPage(): Promise<any> {
    const basicState = await this.getBasicState();
    return {
      getState: async (useVision = false, cacheClickableElementsHashes = false) => {
        return {
          ...basicState,
          elementTree: {
            tagName: 'root',
            isVisible: true,
            parent: null,
            xpath: '',
            attributes: {},
            children: [],
          },
          selectorMap: new Map(),
          tabId: 0,
          screenshot: null,
          scrollY: 0,
          scrollHeight: 0,
          visualViewportHeight: 0,
        };
      },
      getCachedState: async () => {
        return {
          ...basicState,
          elementTree: {
            tagName: 'root',
            isVisible: true,
            parent: null,
            xpath: '',
            attributes: {},
            children: [],
          },
          selectorMap: new Map(),
          tabId: 0,
          screenshot: null,
          scrollY: 0,
          scrollHeight: 0,
          visualViewportHeight: 0,
        };
      },
      attached: false,
      tabId: 0,
      removeHighlight: async () => {},
    };
  }

  async cleanup(): Promise<void> {
    // No-op for web
  }

  updateCurrentTabId(_tabId: number): void {
    // No-op for web
  }

  async getCachedState(useVision = false, cacheClickableElementsHashes = false): Promise<any> {
    // Import web browser actions to get page state
    const { getPageState } = await import('./webBrowserActions');
    const pageState = getPageState();

    return {
      url: pageState.url,
      title: pageState.title,
      viewport: pageState.viewport,
      elementTree: {
        tagName: 'root',
        isVisible: true,
        parent: null,
        xpath: '',
        attributes: {},
        children: [],
      },
      selectorMap: new Map(),
      tabId: 0,
      screenshot: null,
      scrollY: window.scrollY || 0,
      scrollHeight: document.documentElement.scrollHeight || 0,
      visualViewportHeight: pageState.viewport.height,
      tabs: [],
      // Include clickable elements info for Navigator
      clickableElements: pageState.clickableElements,
    };
  }

  async getState(useVision = false, cacheClickableElementsHashes = false): Promise<any> {
    return this.getCachedState(useVision, cacheClickableElementsHashes);
  }

  async removeHighlight(): Promise<void> {
    // No-op for web
  }

  async navigateTo(url: string): Promise<void> {
    // Use web browser actions for navigation
    const { navigateToUrl } = await import('./webBrowserActions');
    await navigateToUrl(url);
  }
}

/**
 * Setup executor for web app
 * Creates Executor with actual Planner and Navigator agents
 * Uses web-compatible browser actions that work directly in the browser
 */
export async function setupWebExecutor(taskId: string, task: string, onEvent: EventCallback): Promise<any> {
  // Load chrome-extension modules dynamically
  const { Executor, createChatModel, EventType } = await loadChromeExtensionModules();

  // Load web-compatible action builder
  const { WebActionBuilder } = await import('./webActionBuilder');
  const { NavigatorAgent, NavigatorActionRegistry } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/agents/navigator'
  );
  const { NavigatorPrompt } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/prompts/navigator'
  );
  const { MessageManager } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/messages/service'
  );
  const { EventManager } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/event/manager'
  );
  const { AgentContext } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/types'
  );

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

  // Create minimal browser context
  const browserContext = new WebBrowserContext() as any;

  // Apply firewall settings
  const firewall = await firewallStore.getFirewall();
  if (firewall.enabled) {
    browserContext.updateConfig({
      allowedUrls: firewall.allowList,
      deniedUrls: firewall.denyList,
    });
  } else {
    browserContext.updateConfig({
      allowedUrls: [],
      deniedUrls: [],
    });
  }

  const generalSettings = await generalSettingsStore.getSettings();
  browserContext.updateConfig({
    minimumWaitPageLoadTime: generalSettings.minWaitPageLoad / 1000.0,
    displayHighlights: generalSettings.displayHighlights,
  });

  // Create message manager and event manager
  const messageManager = new MessageManager();
  const eventManager = new EventManager();

  // Create agent context
  const context = new AgentContext(taskId, browserContext, messageManager, eventManager, {
    maxSteps: generalSettings.maxSteps,
    maxFailures: generalSettings.maxFailures,
    maxActionsPerStep: generalSettings.maxActionsPerStep,
    useVision: generalSettings.useVision,
    useVisionForPlanner: false,
    planningInterval: generalSettings.planningInterval,
  });

  // Create web-compatible action builder (uses DOM APIs instead of Chrome extension)
  const webActionBuilder = new WebActionBuilder(context);
  const navigatorActionRegistry = new NavigatorActionRegistry(webActionBuilder.buildDefaultActions());

  // Create Navigator prompt
  const navigatorPrompt = new NavigatorPrompt(context.options.maxActionsPerStep);

  // Create Navigator agent with web-compatible actions
  const navigator = new NavigatorAgent(navigatorActionRegistry, {
    chatLLM: navigatorLLM,
    context: context,
    prompt: navigatorPrompt,
  });

  // Create Planner agent
  const { PlannerAgent } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/agents/planner'
  );
  const { PlannerPrompt } = await import(
    /* @vite-ignore */
    '../../../../chrome-extension/src/background/agent/prompts/planner'
  );
  const plannerPrompt = new PlannerPrompt();
  const planner = new PlannerAgent({
    chatLLM: plannerLLM ?? navigatorLLM,
    context: context,
    prompt: plannerPrompt,
  });

  // Initialize message history with task
  context.messageManager.initTaskMessages(navigatorPrompt.getSystemMessage(), task);

  // Create executor with web-compatible Navigator
  const executor = new Executor(task, taskId, browserContext, navigatorLLM, {
    plannerLLM: plannerLLM ?? navigatorLLM,
    agentOptions: {
      maxSteps: generalSettings.maxSteps,
      maxFailures: generalSettings.maxFailures,
      maxActionsPerStep: generalSettings.maxActionsPerStep,
      useVision: generalSettings.useVision,
      useVisionForPlanner: false,
      planningInterval: generalSettings.planningInterval,
    },
    generalSettings: generalSettings,
  });

  // Override the navigator with our web-compatible one
  // @ts-ignore - accessing private property to replace with web-compatible navigator
  executor.navigator = navigator;
  // @ts-ignore
  executor.planner = planner;
  // @ts-ignore
  executor.context = context;

  // Subscribe to execution events
  executor.subscribeExecutionEvents(onEvent);

  return executor;
}
