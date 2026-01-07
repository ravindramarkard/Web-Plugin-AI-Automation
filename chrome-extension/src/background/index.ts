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

// Listen for external messages from web app (using onMessageExternal for proper external communication)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Validate sender origin (should match externally_connectable in manifest)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  const senderOrigin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
  if (!allowedOrigins.includes(senderOrigin)) {
    logger.warning('Blocked message from unauthorized origin:', senderOrigin, sender.url);
    sendResponse({ success: false, error: 'Unauthorized origin' });
    return false;
  }

  // Log all incoming external messages for debugging
  logger.info('Received external message:', {
    action: message.action,
    type: message.type,
    sender: sender?.url,
    senderId: sender?.id,
    senderOrigin: senderOrigin,
  });

  // Log to console for easier debugging
  console.log('[Background] Received external message:', {
    action: message.action,
    type: message.type,
    senderUrl: sender?.url,
    senderId: sender?.id,
    senderOrigin: senderOrigin,
  });

  // Handle messages from web app (using 'action' field)
  if (message.action) {
    (async () => {
      try {
        switch (message.action) {
          case 'ping': {
            logger.info('Handling ping request from:', sender?.url || 'unknown');
            logger.info('Ping sender details:', {
              url: sender?.url,
              id: sender?.id,
              origin: sender?.origin,
              isExternal: sender?.id !== chrome.runtime.id,
            });
            const response = { success: true, data: { message: 'pong', extensionId: chrome.runtime.id } };
            logger.info('Sending ping response:', response);
            sendResponse(response);
            return;
          }

          case 'sync_llm_provider': {
            const { providerId, providerConfig } = message.data || {};
            if (!providerId || !providerConfig) {
              sendResponse({ success: false, error: 'Missing providerId or providerConfig' });
              return;
            }
            await llmProviderStore.setProvider(providerId, providerConfig);
            logger.info('Synced LLM provider from web app:', providerId);
            sendResponse({ success: true, data: { message: 'Provider synced successfully' } });
            return;
          }

          case 'sync_agent_model': {
            const { agentName, modelConfig } = message.data || {};
            if (!agentName || !modelConfig) {
              sendResponse({ success: false, error: 'Missing agentName or modelConfig' });
              return;
            }
            await agentModelStore.setAgentModel(agentName, modelConfig);
            logger.info('Synced agent model from web app:', agentName);
            sendResponse({ success: true, data: { message: 'Agent model synced successfully' } });
            return;
          }

          case 'check_llm_configured': {
            const providers = await llmProviderStore.getAllProviders();
            const agentModels = await agentModelStore.getAllAgentModels();
            const navigatorModel = agentModels[AgentNameEnum.Navigator];

            const configured = Object.keys(providers).length > 0 && navigatorModel !== undefined;
            const hasProviders = Object.keys(providers).length > 0;
            const hasNavigatorModel = navigatorModel !== undefined;
            const providerCount = Object.keys(providers).length;

            sendResponse({
              success: true,
              data: {
                configured,
                hasProviders,
                hasNavigatorModel,
                providerCount,
              },
            });
            return;
          }

          case 'get_current_tab': {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (tab?.id) {
                sendResponse({ success: true, data: { tabId: tab.id, url: tab.url, title: tab.title } });
              } else {
                sendResponse({ success: false, error: 'No active tab found' });
              }
            } catch (error) {
              logger.error('Error getting current tab:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'create_new_tab': {
            try {
              const { url } = message.data || {};
              // Create a new window with blank page or specified URL
              const newWindow = await chrome.windows.create({
                url: url || 'about:blank',
                focused: true,
                type: 'normal',
              });

              if (newWindow?.tabs && newWindow.tabs[0]?.id) {
                const newTab = newWindow.tabs[0];
                // Wait a bit for the window and tab to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                sendResponse({
                  success: true,
                  data: {
                    tabId: newTab.id,
                    url: newTab.url || url || 'about:blank',
                    title: newTab.title || 'New Window',
                  },
                });
              } else {
                sendResponse({ success: false, error: 'Failed to create new window' });
              }
            } catch (error) {
              logger.error('Error creating new window:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'get_page_state': {
            try {
              const page = await browserContext.getCurrentPage();
              const state = await page.getState(false);
              const clickableElements = state.elementTree.clickableElementsToString(
                DEFAULT_AGENT_OPTIONS.includeAttributes,
              );
              sendResponse({
                success: true,
                data: {
                  url: state.url,
                  title: state.title,
                  clickableElements: clickableElements.split('\n'),
                },
              });
            } catch (error) {
              logger.error('Error getting page state:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'click_element': {
            try {
              const { index, xpath } = message.data || {};
              const page = await browserContext.getCurrentPage();
              const state = await page.getState();

              let elementNode = null;
              if (index !== undefined) {
                elementNode = state.selectorMap.get(index);
              } else if (xpath) {
                // Find element by xpath by searching through selectorMap
                for (const node of state.selectorMap.values()) {
                  if (node.xpath === xpath) {
                    elementNode = node;
                    break;
                  }
                }
              }

              if (!elementNode) {
                sendResponse({
                  success: false,
                  error: `Element not found: ${xpath || `index ${index}`}`,
                });
                return;
              }

              // Check if element is a file uploader (can't be clicked programmatically)
              if (page.isFileUploader(elementNode)) {
                sendResponse({
                  success: false,
                  error: 'Element is a file uploader and cannot be clicked programmatically',
                });
                return;
              }

              await page.clickElementNode(false, elementNode);
              sendResponse({ success: true, data: { message: 'Element clicked successfully' } });
            } catch (error) {
              logger.error('Error clicking element:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'input_text': {
            try {
              const { text, index, xpath } = message.data || {};
              if (!text) {
                sendResponse({ success: false, error: 'Missing text parameter' });
                return;
              }
              const page = await browserContext.getCurrentPage();
              const state = await page.getState();

              let elementNode = null;
              if (index !== undefined) {
                elementNode = state.selectorMap.get(index);
              } else if (xpath) {
                // Find element by xpath by searching through selectorMap
                for (const node of state.selectorMap.values()) {
                  if (node.xpath === xpath) {
                    elementNode = node;
                    break;
                  }
                }
              }

              if (!elementNode) {
                sendResponse({
                  success: false,
                  error: `Element not found: ${xpath || `index ${index}`}`,
                });
                return;
              }

              await page.inputTextElementNode(false, elementNode, text);
              sendResponse({ success: true, data: { message: 'Text input successfully' } });
            } catch (error) {
              logger.error('Error inputting text:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'navigate_to_url': {
            try {
              const { url } = message.data || {};
              if (!url) {
                sendResponse({ success: false, error: 'Missing url parameter' });
                return;
              }
              await browserContext.navigateTo(url);
              sendResponse({ success: true, data: { message: 'Navigation successful' } });
            } catch (error) {
              logger.error('Error navigating to URL:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'open_options': {
            try {
              await chrome.runtime.openOptionsPage();
              sendResponse({ success: true, data: { message: 'Options page opened' } });
            } catch (error) {
              logger.error('Error opening options page:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          case 'new_task': {
            try {
              const { task, taskId, tabId, createNewTab } = message;
              if (!task) {
                sendResponse({ success: false, error: t('bg_cmd_newTask_noTask') });
                return;
              }

              let targetTabId = tabId;

              // If createNewTab is true or no tabId provided, create a new window
              if (createNewTab || !targetTabId) {
                logger.info('Creating new browser window for task execution');
                const newWindow = await chrome.windows.create({
                  url: 'about:blank',
                  focused: true,
                  type: 'normal',
                });

                if (!newWindow?.tabs || !newWindow.tabs[0]?.id) {
                  sendResponse({ success: false, error: 'Failed to create new window' });
                  return;
                }

                targetTabId = newWindow.tabs[0].id;
                // Wait a bit for the window and tab to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                logger.info('New window created with tab:', targetTabId);
              } else {
                // Use existing tab if provided
                targetTabId = tabId;
              }

              logger.info('new_task from web app', targetTabId, task);
              currentExecutor = await setupExecutor(taskId || `web-app-${Date.now()}`, task, browserContext);
              subscribeToExecutorEvents(currentExecutor);

              // Start execution in background (don't wait for completion)
              currentExecutor.execute().catch(error => {
                logger.error('Task execution error:', error);
              });

              sendResponse({ success: true, data: { message: 'Task started successfully', tabId: targetTabId } });
            } catch (error) {
              logger.error('Error starting new task:', error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
            }
            return;
          }

          default: {
            sendResponse({ success: false, error: `Unknown action: ${message.action}` });
            return;
          }
        }
      } catch (error) {
        logger.error('Error handling web app message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        sendResponse({ success: false, error: errorMessage });
      }
    })();

    // Return true to indicate we will send a response asynchronously
    return true;
  }

  // Handle test connection requests from options page (using 'type' field)
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

// Listen for internal messages (from side panel, options page, etc.)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only handle internal messages (from extension itself)
  if (sender.id !== chrome.runtime.id) {
    // External messages should go through onMessageExternal
    return false;
  }

  // Handle test connection requests from options page (using 'type' field)
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

// Setup connection listener for internal connections (side panel)
chrome.runtime.onConnect.addListener(port => {
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
            currentExecutor = await setupExecutor(message.taskId, message.task, browserContext);
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
              subscribeToExecutorEvents(currentExecutor);
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
              subscribeToExecutorEvents(currentExecutor);

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
    return;
  }

  // Handle web app connections
  if (port.name === 'web-app-connection') {
    const senderUrl = port.sender?.url;
    const senderId = port.sender?.id;
    const isExternal = senderId !== chrome.runtime.id;

    // Log connection attempt
    logger.info('Web app connection attempt', {
      senderUrl,
      senderId,
      isExternal,
      portName: port.name,
    });

    // Allow external connections from web app (already validated by externally_connectable in manifest)
    if (isExternal) {
      logger.info('Accepting web app connection from external source');
    }

    // Store port for web app (separate from side panel port)
    // Note: We could maintain multiple ports, but for simplicity, we'll use currentPort
    // The web app will receive execution events through this port
    const webAppPort = port;

    webAppPort.onMessage.addListener(async message => {
      try {
        // Handle both 'type' and 'action' fields for compatibility
        const messageType = message.type || message.action;

        switch (messageType) {
          case 'heartbeat':
          case 'ping':
            // Acknowledge heartbeat/ping
            if (messageType === 'ping') {
              webAppPort.postMessage({
                success: true,
                data: { message: 'pong', extensionId: chrome.runtime.id },
              });
            } else {
              webAppPort.postMessage({ type: 'heartbeat_ack' });
            }
            break;

          case 'new_task': {
            if (!message.task) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
            }

            let targetTabId = message.tabId;

            // If createNewTab is true or no tabId provided, create a new window
            if (message.createNewTab || !targetTabId) {
              logger.info('Creating new browser window for task execution');
              const newWindow = await chrome.windows.create({
                url: 'about:blank',
                focused: true,
                type: 'normal',
              });

              if (!newWindow?.tabs || !newWindow.tabs[0]?.id) {
                return webAppPort.postMessage({ type: 'error', error: 'Failed to create new window' });
              }

              targetTabId = newWindow.tabs[0].id;
              // Wait a bit for the window and tab to initialize
              await new Promise(resolve => setTimeout(resolve, 500));
              logger.info('New window created with tab:', targetTabId);
            }

            logger.info('new_task from web app port', targetTabId, message.task);
            console.log('[Background] new_task from web app port', targetTabId, message.task);
            currentExecutor = await setupExecutor(
              message.taskId || `web-app-${Date.now()}`,
              message.task,
              browserContext,
            );
            subscribeToExecutorEvents(currentExecutor);

            // Start execution in background (don't wait for completion)
            currentExecutor.execute().catch(error => {
              logger.error('Task execution error:', error);
              console.error('[Background] Task execution error:', error);
            });

            // Send immediate success response
            webAppPort.postMessage({ type: 'success', message: 'Task started successfully', tabId: targetTabId });
            break;
          }

          case 'follow_up_task': {
            if (!message.task) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_noTask') });
            }
            const targetTabId =
              message.tabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
            if (!targetTabId) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            }

            logger.info('follow_up_task from web app', targetTabId, message.task);

            if (currentExecutor) {
              currentExecutor.addFollowUpTask(message.task);
              subscribeToExecutorEvents(currentExecutor);
              const result = await currentExecutor.execute();
              logger.info('follow_up_task execution result', targetTabId, result);
            } else {
              logger.info('follow_up_task: executor was cleaned up, can not add follow-up task');
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_cleaned') });
            }
            break;
          }

          case 'cancel_task': {
            if (!currentExecutor) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            }
            await currentExecutor.cancel();
            break;
          }

          case 'resume_task': {
            if (!currentExecutor) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_resumeTask_noTask') });
            }
            await currentExecutor.resume();
            return webAppPort.postMessage({ type: 'success' });
          }

          case 'pause_task': {
            if (!currentExecutor) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            }
            await currentExecutor.pause();
            return webAppPort.postMessage({ type: 'success' });
          }

          default:
            return webAppPort.postMessage({ type: 'error', error: t('errors_cmd_unknown', [message.type]) });
        }
      } catch (error) {
        console.error('Error handling web app port message:', error);
        webAppPort.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : t('errors_unknown'),
        });
      }
    });

    webAppPort.onDisconnect.addListener(() => {
      logger.info('Web app disconnected');
      // Don't cancel executor on web app disconnect - it might still be running
      // Only cancel if this was the only connection
      if (currentPort === webAppPort) {
        currentPort = null;
      }
    });

    // Set as current port so executor events are sent to it
    currentPort = webAppPort;
    return;
  }

  // Unknown connection type
  logger.warning('Unknown connection type:', port.name);
  port.disconnect();
});

// Setup external connection listener for web app (using onConnectExternal for proper external communication)
chrome.runtime.onConnectExternal.addListener(port => {
  // Validate sender origin
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  const senderOrigin = port.sender?.origin || (port.sender?.url ? new URL(port.sender.url).origin : '');
  if (!allowedOrigins.includes(senderOrigin)) {
    logger.warning('Blocked external connection from unauthorized origin:', senderOrigin, port.sender?.url);
    port.disconnect();
    return;
  }

  // Handle web app connections
  if (port.name === 'web-app-connection' || !port.name) {
    const senderUrl = port.sender?.url;
    const senderId = port.sender?.id;
    const isExternal = senderId !== chrome.runtime.id;

    // Log connection attempt
    logger.info('Web app external connection attempt', {
      senderUrl,
      senderId,
      senderOrigin,
      isExternal,
      portName: port.name,
    });

    console.log('[Background] Web app external connection from:', senderOrigin);

    // Store port for web app
    const webAppPort = port;

    webAppPort.onMessage.addListener(async message => {
      try {
        // Handle both 'type' and 'action' fields for compatibility
        const messageType = message.type || message.action;

        switch (messageType) {
          case 'heartbeat':
          case 'ping':
            // Acknowledge heartbeat/ping
            if (messageType === 'ping') {
              webAppPort.postMessage({
                success: true,
                data: { message: 'pong', extensionId: chrome.runtime.id },
              });
            } else {
              webAppPort.postMessage({ type: 'heartbeat_ack' });
            }
            break;

          case 'new_task': {
            if (!message.task) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
            }

            let targetTabId = message.tabId;

            // If createNewTab is true or no tabId provided, create a new window
            if (message.createNewTab || !targetTabId) {
              logger.info('Creating new browser window for task execution');
              const newWindow = await chrome.windows.create({
                url: 'about:blank',
                focused: true,
                type: 'normal',
              });

              if (!newWindow?.tabs || !newWindow.tabs[0]?.id) {
                return webAppPort.postMessage({ type: 'error', error: 'Failed to create new window' });
              }

              targetTabId = newWindow.tabs[0].id;
              // Wait a bit for the window and tab to initialize
              await new Promise(resolve => setTimeout(resolve, 500));
              logger.info('New window created with tab:', targetTabId);
            }

            logger.info('new_task from web app external port', targetTabId, message.task);
            console.log('[Background] new_task from web app external port', targetTabId, message.task);
            currentExecutor = await setupExecutor(
              message.taskId || `web-app-${Date.now()}`,
              message.task,
              browserContext,
            );
            subscribeToExecutorEvents(currentExecutor);

            // Start execution in background (don't wait for completion)
            currentExecutor.execute().catch(error => {
              logger.error('Task execution error:', error);
              console.error('[Background] Task execution error:', error);
            });

            // Send immediate success response
            webAppPort.postMessage({ type: 'success', message: 'Task started successfully', tabId: targetTabId });
            break;
          }

          case 'follow_up_task': {
            if (!message.task) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_noTask') });
            }
            const targetTabId =
              message.tabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
            if (!targetTabId) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            }

            logger.info('follow_up_task from web app', targetTabId, message.task);

            if (currentExecutor) {
              currentExecutor.addFollowUpTask(message.task);
              subscribeToExecutorEvents(currentExecutor);
              const result = await currentExecutor.execute();
              logger.info('follow_up_task execution result', targetTabId, result);
            } else {
              logger.info('follow_up_task: executor was cleaned up, can not add follow-up task');
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_cleaned') });
            }
            break;
          }

          case 'cancel_task': {
            if (!currentExecutor) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            }
            await currentExecutor.cancel();
            break;
          }

          case 'resume_task': {
            if (!currentExecutor) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_cmd_resumeTask_noTask') });
            }
            await currentExecutor.resume();
            return webAppPort.postMessage({ type: 'success' });
          }

          case 'pause_task': {
            if (!currentExecutor) {
              return webAppPort.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            }
            await currentExecutor.pause();
            return webAppPort.postMessage({ type: 'success' });
          }

          default:
            return webAppPort.postMessage({ type: 'error', error: t('errors_cmd_unknown', [messageType]) });
        }
      } catch (error) {
        console.error('Error handling web app external port message:', error);
        webAppPort.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : t('errors_unknown'),
        });
      }
    });

    webAppPort.onDisconnect.addListener(() => {
      logger.info('Web app external connection disconnected');
      // Don't cancel executor on web app disconnect - it might still be running
      // Only cancel if this was the only connection
      if (currentPort === webAppPort) {
        currentPort = null;
      }
    });

    // Set as current port so executor events are sent to it
    currentPort = webAppPort;
    return;
  }

  // Unknown external connection type
  logger.warning('Unknown external connection type:', port.name);
  port.disconnect();
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
      useVisionForPlanner: false,
      planningInterval: generalSettings.planningInterval,
    },
    generalSettings: generalSettings,
  });

  return executor;
}

// Update subscribeToExecutorEvents to use port
async function subscribeToExecutorEvents(executor: Executor) {
  // Clear previous event listeners to prevent multiple subscriptions
  executor.clearExecutionEvents();

  // Subscribe to new events
  executor.subscribeExecutionEvents(async event => {
    try {
      if (currentPort) {
        currentPort.postMessage(event);
      }
    } catch (error) {
      logger.error('Failed to send message to port (side panel or web app):', error);
    }

    if (
      event.state === ExecutionState.TASK_OK ||
      event.state === ExecutionState.TASK_FAIL ||
      event.state === ExecutionState.TASK_CANCEL
    ) {
      await currentExecutor?.cleanup();
    }
  });
}
