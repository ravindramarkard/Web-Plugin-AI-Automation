import 'webextension-polyfill';
import {
  agentModelStore,
  AgentNameEnum,
  firewallStore,
  generalSettingsStore,
  llmProviderStore,
  analyticsSettingsStore,
  type ProviderConfig,
} from '@extension/storage';
import { t } from '@extension/i18n';
import BrowserContext from './browser/context';
import { Executor } from './agent/executor';
import { createLogger } from './log';
import { ExecutionState } from './agent/event/types';
import { createChatModel } from './agent/helper';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { DEFAULT_AGENT_OPTIONS } from './agent/types';
import { SpeechToTextService } from './services/speechToText';
import { injectBuildDomTreeScripts } from './browser/dom/service';
import { analytics } from './services/analytics';

const logger = createLogger('background');

const browserContext = new BrowserContext({});
let currentExecutor: Executor | null = null;
let currentPort: chrome.runtime.Port | null = null;
let webAppPort: chrome.runtime.Port | null = null; // Port for web app connection
const SIDE_PANEL_URL = chrome.runtime.getURL('side-panel/index.html');

// Setup side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(error => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId && changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    await injectBuildDomTreeScripts(tabId);
  }
});

// Listen for debugger detached event
// if canceled_by_user, remove the tab from the browser context
chrome.debugger.onDetach.addListener(async (source, reason) => {
  console.log('Debugger detached:', source, reason);
  if (reason === 'canceled_by_user') {
    if (source.tabId) {
      currentExecutor?.cancel();
      await browserContext.cleanup();
    }
  }
});

// Cleanup when tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  browserContext.removeAttachedPage(tabId);
});

logger.info('background loaded');

// Initialize analytics
analytics.init().catch(error => {
  logger.error('Failed to initialize analytics:', error);
});

// Listen for analytics settings changes
analyticsSettingsStore.subscribe(() => {
  analytics.updateSettings().catch(error => {
    logger.error('Failed to update analytics settings:', error);
  });
});

// Listen for simple messages (e.g., from options page)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle test connection requests from options page
  if (message.type === 'test_llm_connection') {
    (async () => {
      try {
        const { providerConfig, modelName, providerId } = message;

        // Validate required fields
        if (!providerConfig || !modelName) {
          sendResponse({ success: false, error: 'Missing provider config or model name' });
          return;
        }

        // Create a test model config
        const testModelConfig = {
          provider: providerId || providerConfig.type || 'custom_openai',
          modelName: modelName,
          parameters: {
            temperature: 0.1,
            topP: 0.1,
          },
        };

        // Create the chat model
        const chatModel = createChatModel(providerConfig as ProviderConfig, testModelConfig);

        // Make a simple test call with a timeout
        const testMessage = new HumanMessage('test');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection test timed out after 10 seconds')), 10000),
        );

        const testCall = chatModel.invoke([testMessage]);
        await Promise.race([testCall, timeoutPromise]);

        sendResponse({ success: true, message: 'Connection test successful' });
      } catch (error) {
        logger.error('LLM connection test failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        sendResponse({ success: false, error: errorMessage });
      }
    })();

    // Return true to indicate we will send a response asynchronously
    return true;
  }

  // Return false if response is not sent asynchronously
  return false;
});

// Handle external messages from web app
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Only accept messages from allowed origins (web app)
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'https://127.0.0.1:3000',
  ];
  const senderUrl = sender.url;

  logger.info('[ExternalMessage] Received message', { action: message.action, senderUrl, senderId: sender.id });

  // Helper function to safely send response
  let responseSent = false;
  const safeSendResponse = (response: ExtensionResponse) => {
    if (!responseSent) {
      try {
        sendResponse(response);
        responseSent = true;
      } catch (e) {
        logger.error('[ExternalMessage] Failed to send response (channel may be closed):', e);
      }
    }
  };

  if (!senderUrl || !allowedOrigins.some(origin => senderUrl.startsWith(origin))) {
    logger.warning(
      '[ExternalMessage] Blocked external message from unauthorized origin',
      senderUrl,
      'Allowed:',
      allowedOrigins,
    );
    safeSendResponse({
      success: false,
      error: `Unauthorized origin: ${senderUrl}. Allowed origins: ${allowedOrigins.join(', ')}`,
    });
    return false;
  }

  logger.info('[ExternalMessage] Processing message from web app', message.action, senderUrl);

  // Handle ping for availability check
  if (message.action === 'ping') {
    logger.info('[ExternalMessage] Responding to ping');
    safeSendResponse({ success: true, data: { available: true, extensionId: chrome.runtime.id } });
    return false;
  }

  // Handle new_task from web app
  if (message.action === 'new_task') {
    if (!message.task) {
      try {
        sendResponse({ success: false, error: 'No task provided' });
      } catch (e) {
        logger.error('Failed to send response:', e);
      }
      return false;
    }

    // Use a flag to track if response was sent
    let responseSent = false;
    const safeSendResponse = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send response (channel may be closed):', e);
        }
      }
    };

    (async () => {
      // Create a new browser window for the task execution
      const taskId = message.taskId || `web-app-${Date.now()}`;
      let taskWindowId: number | null = null;
      let taskTabId: number | null = null;

      try {
        // Create a new browser window - start with about:blank, will navigate to target URL when task starts
        // Make it visible and focused so user can see the automation happening
        const newWindow = await chrome.windows.create({
          url: 'about:blank',
          type: 'normal',
          focused: true, // Focus the new window so user can see it
          state: 'normal', // Normal window state (not minimized/maximized)
        });
        taskWindowId = newWindow.id || null;

        if (!taskWindowId) {
          safeSendResponse({ success: false, error: 'Failed to create new window' });
          return;
        }

        // Get the first tab in the new window
        const tabs = await chrome.tabs.query({ windowId: taskWindowId });
        taskTabId = tabs[0]?.id || null;

        if (!taskTabId) {
          // Close the window if we can't get the tab
          chrome.windows.remove(taskWindowId).catch(err => logger.error('Failed to close window:', err));
          safeSendResponse({ success: false, error: 'Failed to get tab from new window' });
          return;
        }

        logger.info('new_task from web app - created new window', taskWindowId, 'with tab', taskTabId, message.task);

        // Wait a bit for window and tab to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Switch browser context to the new tab
        await browserContext.switchTab(taskTabId);

        // Setup executor
        currentExecutor = await setupExecutor(taskId, message.task, browserContext);

        // Subscribe to events and track window/tab for cleanup
        // This will forward events to webAppPort if connected
        subscribeToExecutorEvents(currentExecutor, taskTabId, taskWindowId);

        logger.info('Executor setup complete, webAppPort available:', !!webAppPort);

        // Execute in background
        currentExecutor.execute().catch(error => {
          logger.error('Executor error from web app:', error);
          // Close window on error
          if (taskWindowId) {
            chrome.windows.remove(taskWindowId).catch(err => logger.error('Failed to close window on error:', err));
          }
        });

        safeSendResponse({ success: true, data: { taskId, tabId: taskTabId, windowId: taskWindowId } });
      } catch (error) {
        logger.error('Failed to setup executor from web app:', error);

        // Close window if it was created but setup failed
        if (taskWindowId) {
          chrome.windows.remove(taskWindowId).catch(err => logger.error('Failed to close window on setup error:', err));
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Provide more helpful error messages for common issues
        let userFriendlyError = errorMessage;
        if (
          errorMessage.includes('bg_setup_noApiKeys') ||
          errorMessage.includes('noApiKeys') ||
          errorMessage.includes('API key')
        ) {
          userFriendlyError =
            'Please configure API keys in the extension settings first. Open the extension options page (chrome://extensions → AITestGen → Options) and add your LLM provider API keys.';
        } else if (errorMessage.includes('bg_setup_noProvider') || errorMessage.includes('noProvider')) {
          userFriendlyError =
            'LLM provider not configured. Please configure your LLM providers in the extension settings.';
        } else if (errorMessage.includes('bg_setup_noNavigatorModel') || errorMessage.includes('noNavigatorModel')) {
          userFriendlyError =
            'Navigator model not configured. Please configure agent models in the extension settings.';
        }

        safeSendResponse({ success: false, error: userFriendlyError });
      }
    })();

    return true; // Async response
  }

  // Handle cancel_task
  if (message.action === 'cancel_task') {
    let responseSent = false;
    const safeSendResponse = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send cancel_task response (channel may be closed):', e);
        }
      }
    };

    (async () => {
      try {
        if (currentExecutor) {
          await currentExecutor.cancel();
          currentExecutor = null;
        }
        safeSendResponse({ success: true });
      } catch (error) {
        logger.error('Error canceling task:', error);
        safeSendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    })();
    return true; // Async response
  }

  // Handle get_current_tab
  if (message.action === 'get_current_tab') {
    let responseSent = false;
    const safeSendResponse = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send get_current_tab response (channel may be closed):', e);
        }
      }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        if (tabs[0]) {
          safeSendResponse({ success: true, data: { tabId: tabs[0].id, url: tabs[0].url, title: tabs[0].title } });
        } else {
          safeSendResponse({ success: false, error: 'No active tab' });
        }
      } catch (e) {
        logger.error('Failed to get current tab:', e);
        safeSendResponse({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    });
    return true; // Async response
  }

  // Handle navigate_to_url
  if (message.action === 'navigate_to_url' && message.data?.url) {
    let responseSent = false;
    const safeSendResponseLocal = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send navigate_to_url response (channel may be closed):', e);
        }
      }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      try {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { url: message.data.url }, () => {
            try {
              if (chrome.runtime.lastError) {
                safeSendResponseLocal({ success: false, error: chrome.runtime.lastError.message });
              } else {
                safeSendResponseLocal({ success: true, data: { tabId: tabs[0].id } });
              }
            } catch (e) {
              logger.error('Failed to send navigate_to_url response:', e);
              safeSendResponseLocal({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
            }
          });
        } else {
          safeSendResponseLocal({ success: false, error: 'No active tab' });
        }
      } catch (e) {
        logger.error('Failed in navigate_to_url handler:', e);
        safeSendResponseLocal({ success: false, error: e instanceof Error ? e.message : 'Failed to navigate' });
      }
    });
    return true; // Async response
  }

  // Handle get_page_state
  if (message.action === 'get_page_state') {
    let responseSent = false;
    const safeSendResponseLocal = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send get_page_state response (channel may be closed):', e);
        }
      }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      try {
        if (!tabs[0]?.id) {
          safeSendResponseLocal({ success: false, error: 'No active tab' });
          return;
        }

        const page = await browserContext.switchTab(tabs[0].id);
        const state = await page.getCachedState();
        safeSendResponseLocal({
          success: true,
          data: {
            url: state.url,
            title: state.title,
            clickableElements: state.clickableElements || [],
          },
        });
      } catch (error) {
        logger.error('Failed to get page state:', error);
        safeSendResponseLocal({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
    return true; // Async response
  }

  // Handle click_element
  if (message.action === 'click_element' && message.data) {
    let responseSent = false;
    const safeSendResponseLocal = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send click_element response (channel may be closed):', e);
        }
      }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      try {
        if (!tabs[0]?.id) {
          safeSendResponseLocal({ success: false, error: 'No active tab' });
          return;
        }

        const page = await browserContext.switchTab(tabs[0].id);
        // Inject script to click element
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (index, xpath) => {
            // Click element logic here
            if (xpath) {
              const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                .singleNodeValue as HTMLElement;
              if (element) element.click();
            } else if (index !== undefined) {
              // Find element by index from clickable elements
              const clickableElements = Array.from(
                document.querySelectorAll('a, button, input, select, [role="button"], [role="link"]'),
              );
              if (clickableElements[index]) {
                (clickableElements[index] as HTMLElement).click();
              }
            }
          },
          args: [message.data.index, message.data.xpath],
        });
        safeSendResponseLocal({ success: true });
      } catch (error) {
        logger.error('Failed to click element:', error);
        safeSendResponseLocal({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
    return true; // Async response
  }

  // Handle input_text
  if (message.action === 'input_text' && message.data) {
    let responseSent = false;
    const safeSendResponseLocal = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send input_text response (channel may be closed):', e);
        }
      }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      try {
        if (!tabs[0]?.id) {
          safeSendResponseLocal({ success: false, error: 'No active tab' });
          return;
        }

        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (text, index, xpath) => {
            let element: HTMLElement | null = null;
            if (xpath) {
              element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                .singleNodeValue as HTMLElement;
            } else if (index !== undefined) {
              const inputs = Array.from(document.querySelectorAll('input, textarea'));
              element = inputs[index] as HTMLElement;
            }
            if (element && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
              element.value = text;
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
          },
          args: [message.data.text, message.data.index, message.data.xpath],
        });
        safeSendResponseLocal({ success: true });
      } catch (error) {
        logger.error('Failed to input text:', error);
        safeSendResponseLocal({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
    return true; // Async response
  }

  // Handle open_options
  if (message.action === 'open_options') {
    let responseSent = false;
    const safeSendResponse = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send open_options response (channel may be closed):', e);
        }
      }
    };

    chrome.runtime.openOptionsPage(() => {
      try {
        if (chrome.runtime.lastError) {
          safeSendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          safeSendResponse({ success: true });
        }
      } catch (e) {
        logger.error('Failed to open options page:', e);
        safeSendResponse({ success: false, error: e instanceof Error ? e.message : 'Unknown error' });
      }
    });
    return true; // Async response
  }

  // Handle sync_llm_provider - sync LLM provider config from web app to extension
  if (message.action === 'sync_llm_provider' && message.data) {
    let responseSent = false;
    const safeSendResponseLocal = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send sync_llm_provider response (channel may be closed):', e);
        }
      }
    };

    (async () => {
      try {
        const { providerId, providerConfig } = message.data;

        if (!providerId || !providerConfig) {
          safeSendResponseLocal({ success: false, error: 'Missing providerId or providerConfig' });
          return;
        }

        logger.info('Syncing LLM provider from web app', providerId);

        // Save provider config to extension storage
        // Use setProvider (the correct method name)
        await llmProviderStore.setProvider(providerId, providerConfig as ProviderConfig);

        safeSendResponseLocal({ success: true, message: 'Provider synced successfully' });
      } catch (error) {
        logger.error('Failed to sync LLM provider:', error);
        safeSendResponseLocal({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true; // Async response
  }

  // Handle sync_agent_model - sync agent model config from web app to extension
  if (message.action === 'sync_agent_model' && message.data) {
    let responseSent = false;
    const safeSendResponse = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send sync_agent_model response (channel may be closed):', e);
        }
      }
    };

    (async () => {
      try {
        const { agentName, modelConfig } = message.data;

        if (!agentName || !modelConfig) {
          safeSendResponse({ success: false, error: 'Missing agentName or modelConfig' });
          return;
        }

        logger.info('Syncing agent model from web app', { agentName, modelConfig });

        // Validate that the provider exists
        const providers = await llmProviderStore.getAllProviders();
        if (!providers[modelConfig.provider]) {
          logger.warning(`Provider ${modelConfig.provider} not found for agent ${agentName}, syncing anyway`);
        }

        // Ensure agentName is a valid AgentNameEnum value
        const validAgentName = agentName as AgentNameEnum;
        if (!Object.values(AgentNameEnum).includes(validAgentName)) {
          logger.error(`Invalid agent name: ${agentName}. Valid values: ${Object.values(AgentNameEnum).join(', ')}`);
          safeSendResponse({ success: false, error: `Invalid agent name: ${agentName}` });
          return;
        }

        // Save agent model config to extension storage
        // Use setAgentModel (the correct method name)
        await agentModelStore.setAgentModel(validAgentName, modelConfig);

        // Verify it was saved
        const savedModel = await agentModelStore.getAgentModel(validAgentName);
        if (!savedModel) {
          logger.error(`Failed to verify saved agent model for ${validAgentName}`);
          safeSendResponse({ success: false, error: 'Failed to save agent model' });
          return;
        }

        logger.info('Agent model synced successfully', { agentName: validAgentName, savedModel });
        safeSendResponse({ success: true, message: 'Agent model synced successfully' });
      } catch (error) {
        logger.error('Failed to sync agent model:', error);
        safeSendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true; // Async response
  }

  // Handle check_llm_configured - check if LLM is configured in extension
  if (message.action === 'check_llm_configured') {
    let responseSent = false;
    const safeSendResponseLocal = (response: ExtensionResponse) => {
      if (!responseSent) {
        try {
          sendResponse(response);
          responseSent = true;
        } catch (e) {
          logger.error('Failed to send check_llm_configured response (channel may be closed):', e);
        }
      }
    };

    (async () => {
      try {
        const providers = await llmProviderStore.getAllProviders();
        const agentModels = await agentModelStore.getAllAgentModels();

        const hasProviders = Object.keys(providers).length > 0;
        const hasNavigatorModel = !!agentModels[AgentNameEnum.Navigator];
        const configured = hasProviders && hasNavigatorModel;

        logger.info('Checking LLM configuration:', {
          providerCount: Object.keys(providers).length,
          providerIds: Object.keys(providers),
          hasNavigatorModel,
          navigatorModel: agentModels[AgentNameEnum.Navigator],
          allAgentModels: Object.keys(agentModels),
          configured,
        });

        safeSendResponseLocal({
          success: true,
          data: {
            configured,
            hasProviders,
            hasNavigatorModel,
            providerCount: Object.keys(providers).length,
            providerIds: Object.keys(providers),
            agentModelNames: Object.keys(agentModels),
          },
        });
      } catch (error) {
        logger.error('Failed to check LLM configuration:', error);
        safeSendResponseLocal({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    return true; // Async response
  }

  // Unknown action
  safeSendResponse({ success: false, error: `Unknown action: ${message.action}` });
  return false;
});

// Setup connection listener for long-lived connections (e.g., side panel, web app)
chrome.runtime.onConnect.addListener(port => {
  // Handle web app connections
  if (port.name === 'web-app-connection') {
    const senderUrl = port.sender?.url;
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
    ];

    if (!senderUrl || !allowedOrigins.some(origin => senderUrl.startsWith(origin))) {
      logger.warning('Blocked web app connection from unauthorized origin', senderUrl);
      port.disconnect();
      return;
    }

    webAppPort = port;
    logger.info('[Background] ✅ Web app connected via port:', port.name);
    logger.info('[Background] Web app sender URL:', senderUrl);
    logger.info('[Background] Current executor exists:', !!currentExecutor);

    port.onDisconnect.addListener(() => {
      logger.info('[Background] ⚠️ Web app disconnected');
      logger.info('[Background] Disconnect reason:', chrome.runtime.lastError?.message || 'Normal disconnect');
      webAppPort = null;
    });

    // Forward any pending events if executor is running
    if (currentExecutor) {
      logger.info('[Background] Re-subscribing executor events to web app port');
      // Re-subscribe to forward events to web app
      subscribeToExecutorEvents(currentExecutor);
    } else {
      logger.info('[Background] No executor running yet, events will be forwarded when executor starts');
    }

    return;
  }

  // Handle side panel connections
  if (port.name === 'side-panel-connection') {
    const senderUrl = port.sender?.url;
    const senderId = port.sender?.id;

    if (!senderUrl || senderId !== chrome.runtime.id || senderUrl !== SIDE_PANEL_URL) {
      logger.warning('Blocked unauthorized side-panel-connection', senderId, senderUrl);
      port.disconnect();
      return;
    }

    currentPort = port;

    port.onMessage.addListener(async message => {
      try {
        switch (message.type) {
          case 'heartbeat':
            // Acknowledge heartbeat
            port.postMessage({ type: 'heartbeat_ack' });
            break;

          case 'new_task': {
            if (!message.task) return port.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

            logger.info('new_task', message.tabId, message.task);
            currentExecutor = await setupExecutor(
              message.taskId || `web-app-${Date.now()}`,
              message.task,
              browserContext,
            );
            subscribeToExecutorEvents(currentExecutor);

            const result = await currentExecutor.execute();
            logger.info('new_task execution result', message.tabId, result);
            break;
          }

          case 'follow_up_task': {
            if (!message.task) return port.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_noTask') });
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

            logger.info('follow_up_task', message.tabId, message.task);

            // If executor exists, add follow-up task
            if (currentExecutor) {
              currentExecutor.addFollowUpTask(message.task);
              // Re-subscribe to events in case the previous subscription was cleaned up
              subscribeToExecutorEvents(currentExecutor, message.tabId);
              const result = await currentExecutor.execute();
              logger.info('follow_up_task execution result', message.tabId, result);
            } else {
              // executor was cleaned up, can not add follow-up task
              logger.info('follow_up_task: executor was cleaned up, can not add follow-up task');
              return port.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_cleaned') });
            }
            break;
          }

          case 'cancel_task': {
            if (!currentExecutor) return port.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            await currentExecutor.cancel();
            break;
          }

          case 'resume_task': {
            if (!currentExecutor) return port.postMessage({ type: 'error', error: t('bg_cmd_resumeTask_noTask') });
            await currentExecutor.resume();
            return port.postMessage({ type: 'success' });
          }

          case 'pause_task': {
            if (!currentExecutor) return port.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            await currentExecutor.pause();
            return port.postMessage({ type: 'success' });
          }

          case 'screenshot': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            const page = await browserContext.switchTab(message.tabId);
            const screenshot = await page.takeScreenshot();
            logger.info('screenshot', message.tabId, screenshot);
            return port.postMessage({ type: 'success', screenshot });
          }

          case 'state': {
            try {
              const browserState = await browserContext.getState(true);
              const elementsText = browserState.elementTree.clickableElementsToString(
                DEFAULT_AGENT_OPTIONS.includeAttributes,
              );

              logger.info('state', browserState);
              logger.info('interactive elements', elementsText);
              return port.postMessage({ type: 'success', msg: t('bg_cmd_state_printed') });
            } catch (error) {
              logger.error('Failed to get state:', error);
              return port.postMessage({ type: 'error', error: t('bg_cmd_state_failed') });
            }
          }

          case 'nohighlight': {
            const page = await browserContext.getCurrentPage();
            await page.removeHighlight();
            return port.postMessage({ type: 'success', msg: t('bg_cmd_nohighlight_ok') });
          }

          case 'speech_to_text': {
            try {
              if (!message.audio) {
                return port.postMessage({
                  type: 'speech_to_text_error',
                  error: t('bg_cmd_stt_noAudioData'),
                });
              }

              logger.info('Processing speech-to-text request...');

              // Get all providers for speech-to-text service
              const providers = await llmProviderStore.getAllProviders();

              // Create speech-to-text service with all providers
              const speechToTextService = await SpeechToTextService.create(providers);

              // Extract base64 audio data (remove data URL prefix if present)
              let base64Audio = message.audio;
              if (base64Audio.startsWith('data:')) {
                base64Audio = base64Audio.split(',')[1];
              }

              // Transcribe audio
              const transcribedText = await speechToTextService.transcribeAudio(base64Audio);

              logger.info('Speech-to-text completed successfully');
              return port.postMessage({
                type: 'speech_to_text_result',
                text: transcribedText,
              });
            } catch (error) {
              logger.error('Speech-to-text failed:', error);
              return port.postMessage({
                type: 'speech_to_text_error',
                error: error instanceof Error ? error.message : t('bg_cmd_stt_failed'),
              });
            }
          }

          case 'replay': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            if (!message.taskId) return port.postMessage({ type: 'error', error: t('bg_errors_noTaskId') });
            if (!message.historySessionId)
              return port.postMessage({ type: 'error', error: t('bg_cmd_replay_noHistory') });
            logger.info('replay', message.tabId, message.taskId, message.historySessionId);

            try {
              // Switch to the specified tab
              await browserContext.switchTab(message.tabId);
              // Setup executor with the new taskId and a dummy task description
              currentExecutor = await setupExecutor(message.taskId, message.task, browserContext);
              subscribeToExecutorEvents(currentExecutor, message.tabId);

              // Run replayHistory with the history session ID
              const result = await currentExecutor.replayHistory(message.historySessionId);
              logger.debug('replay execution result', message.tabId, result);
            } catch (error) {
              logger.error('Replay failed:', error);
              return port.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : t('bg_cmd_replay_failed'),
              });
            }
            break;
          }

          default:
            return port.postMessage({ type: 'error', error: t('errors_cmd_unknown', [message.type]) });
        }
      } catch (error) {
        console.error('Error handling port message:', error);
        port.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : t('errors_unknown'),
        });
      }
    });

    port.onDisconnect.addListener(() => {
      // this event is also triggered when the side panel is closed, so we need to cancel the task
      console.log('Side panel disconnected');
      currentPort = null;
      currentExecutor?.cancel();
    });
  }
});

async function setupExecutor(taskId: string, task: string, browserContext: BrowserContext) {
  const providers = await llmProviderStore.getAllProviders();
  // if no providers, need to display the options page
  if (Object.keys(providers).length === 0) {
    throw new Error(t('bg_setup_noApiKeys'));
  }

  // Clean up any legacy validator settings for backward compatibility
  await agentModelStore.cleanupLegacyValidatorSettings();

  const agentModels = await agentModelStore.getAllAgentModels();
  // verify if every provider used in the agent models exists in the providers
  for (const agentModel of Object.values(agentModels)) {
    if (!providers[agentModel.provider]) {
      throw new Error(t('bg_setup_noProvider', [agentModel.provider]));
    }
  }

  const navigatorModel = agentModels[AgentNameEnum.Navigator];
  if (!navigatorModel) {
    throw new Error(t('bg_setup_noNavigatorModel'));
  }
  // Log the provider config being used for the navigator
  const navigatorProviderConfig = providers[navigatorModel.provider];
  const navigatorLLM = createChatModel(navigatorProviderConfig, navigatorModel);

  let plannerLLM: BaseChatModel | null = null;
  const plannerModel = agentModels[AgentNameEnum.Planner];
  if (plannerModel) {
    // Log the provider config being used for the planner
    const plannerProviderConfig = providers[plannerModel.provider];
    plannerLLM = createChatModel(plannerProviderConfig, plannerModel);
  }

  // Apply firewall settings to browser context
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

  const executor = new Executor(task, taskId, browserContext, navigatorLLM, {
    plannerLLM: plannerLLM ?? navigatorLLM,
    agentOptions: {
      maxSteps: generalSettings.maxSteps,
      maxFailures: generalSettings.maxFailures,
      maxActionsPerStep: generalSettings.maxActionsPerStep,
      useVision: generalSettings.useVision,
      useVisionForPlanner: true,
      planningInterval: generalSettings.planningInterval,
    },
    generalSettings: generalSettings,
  });

  return executor;
}

// Track windows and tabs created for web app tasks
const webAppTaskWindows = new Map<string, number>(); // taskId -> windowId
const webAppTaskTabs = new Map<string, number>(); // taskId -> tabId

// Update subscribeToExecutorEvents to use port and handle window/tab cleanup
async function subscribeToExecutorEvents(executor: Executor, taskTabId?: number, taskWindowId?: number) {
  // Clear previous event listeners to prevent multiple subscriptions
  executor.clearExecutionEvents();

  // Store tab and window IDs if provided (for web app tasks)
  // Access taskId through getCurrentTaskId method
  if (taskTabId || taskWindowId) {
    try {
      const taskId = await executor.getCurrentTaskId();
      if (taskId) {
        if (taskTabId) {
          webAppTaskTabs.set(taskId, taskTabId);
        }
        if (taskWindowId) {
          webAppTaskWindows.set(taskId, taskWindowId);
        }
      }
    } catch (error) {
      logger.error('Failed to get task ID from executor:', error);
    }
  }

  // Subscribe to new events
  executor.subscribeExecutionEvents(async event => {
    try {
      logger.info('[Background] Event from executor:', {
        actor: event.actor,
        state: event.state,
        taskId: event.data?.taskId,
        details: event.data?.details?.substring(0, 100),
      });

      // Forward to side panel if connected
      if (currentPort) {
        logger.info('[Background] Forwarding event to side panel');
        currentPort.postMessage(event);
      } else {
        logger.info('[Background] Side panel not connected');
      }

      // Forward to web app if connected
      if (webAppPort) {
        logger.info('[Background] ✅ Forwarding event to web app port');
        try {
          webAppPort.postMessage(event);
          logger.info('[Background] Event sent to web app successfully');
        } catch (portError) {
          logger.error('[Background] ❌ Failed to send event to web app port:', portError);
        }
      } else {
        logger.warning('[Background] ⚠️ Web app port not connected, event not forwarded:', {
          actor: event.actor,
          state: event.state,
        });
      }
    } catch (error) {
      logger.error('[Background] Failed to send message to port:', error);
    }

    // Handle task completion - cleanup and close window if it was created for web app
    if (
      event.state === ExecutionState.TASK_OK ||
      event.state === ExecutionState.TASK_FAIL ||
      event.state === ExecutionState.TASK_CANCEL
    ) {
      // Generate Playwright script if task completed successfully
      if (event.state === ExecutionState.TASK_OK && currentExecutor && webAppPort) {
        try {
          const taskId = event.data?.taskId || '';
          const task = (currentExecutor as any).tasks?.[0] || '';

          // Check if Planner provided testcode in its response
          const plannerTestCode = (currentExecutor as any).context?.playwrightTestCode;

          let playwrightCode = '';
          let testName = '';
          let baseUrl = '';

          if (plannerTestCode && plannerTestCode.trim().length > 0) {
            // Use Playwright code from Planner
            logger.info('[Background] ✅ Using Playwright testcode from Planner response');
            playwrightCode = plannerTestCode;

            // Extract base URL from task
            const urlMatch = task.match(/(https?:\/\/[^\s]+)/);
            baseUrl = urlMatch ? urlMatch[1] : '';
            testName = `Generated Test - ${new Date().toLocaleString()}`;

            logger.info('[Background] Planner testcode length:', playwrightCode.length);
            logger.info('[Background] Planner testcode preview:', playwrightCode.substring(0, 200));
          } else {
            // Fallback: Generate from executor history
            logger.info('[Background] No Planner testcode found, generating from executor history');
            const { extractStepsFromExecutor, generatePlaywrightCode } = await import('./playwrightGenerator');

            logger.info('[Background] Extracting steps from executor for task:', taskId);
            const steps = extractStepsFromExecutor(currentExecutor);
            logger.info('[Background] Extracted steps count:', steps.length);

            // Extract base URL from task
            const urlMatch = task.match(/(https?:\/\/[^\s]+)/);
            baseUrl = urlMatch ? urlMatch[1] : '';

            if (steps.length > 0) {
              testName = `Generated Test - ${new Date().toLocaleString()}`;
              playwrightCode = generatePlaywrightCode(steps, testName, baseUrl);

              logger.info('[Background] Generated Playwright code from history, length:', playwrightCode.length);
              logger.info('[Background] Playwright code preview:', playwrightCode.substring(0, 200));
            } else {
              logger.warning('[Background] No steps extracted from executor history');
            }
          }

          if (playwrightCode && playwrightCode.trim().length > 0) {
            // Send Playwright code to web app with special event type
            webAppPort.postMessage({
              type: 'testCodeGenerated',
              actor: 'system',
              state: ExecutionState.TASK_OK,
              data: {
                taskId,
                testCode: playwrightCode,
                testName,
                baseUrl,
                steps: playwrightCode.split('\n').length, // Approximate step count
                prompt: task,
              },
              timestamp: Date.now(),
            });

            logger.info('[Background] ✅ Sent Playwright code to web app');
          } else {
            logger.warning('[Background] No Playwright code available to send');
          }
        } catch (error) {
          logger.error('[Background] Failed to generate/send Playwright code:', error);
          logger.error('[Background] Error details:', error instanceof Error ? error.stack : String(error));
        }
      }

      await currentExecutor?.cleanup();

      // Close the window if it was created for this web app task
      if (event.data?.taskId && webAppTaskWindows.has(event.data.taskId)) {
        const windowIdToClose = webAppTaskWindows.get(event.data.taskId);
        webAppTaskWindows.delete(event.data.taskId);
        webAppTaskTabs.delete(event.data.taskId); // Also clean up tab reference

        if (windowIdToClose) {
          // Wait a moment before closing to allow user to see final result
          setTimeout(() => {
            chrome.windows.remove(windowIdToClose).catch(err => {
              logger.error('Failed to close task window:', err);
            });
          }, 2000); // 2 second delay to show completion
        }
      }
    }
  });
}
