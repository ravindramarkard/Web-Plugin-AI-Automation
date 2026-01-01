/**
 * Extension Settings Component
 * Allows users to configure the Chrome extension connection
 */

import { useState, useEffect } from 'react';
import { extensionBridge } from '../../lib/extensionBridge';
import { Button } from '@extension/ui';
import { llmProviderStore, agentModelStore, AgentNameEnum } from '@extension/storage';

/**
 * Sync all existing LLM configurations to extension
 */
async function syncAllConfigsToExtension() {
  try {
    const isExtensionAvailable = await extensionBridge.isExtensionAvailable();
    if (!isExtensionAvailable) {
      console.log('[ExtensionSettings] Extension not available, skipping sync');
      return;
    }

    // Sync all providers
    const providers = await llmProviderStore.getAllProviders();
    for (const [providerId, providerConfig] of Object.entries(providers)) {
      try {
        await extensionBridge.syncLLMProvider(providerId, providerConfig);
        console.log(`[ExtensionSettings] Synced provider: ${providerId}`);
      } catch (error) {
        console.error(`[ExtensionSettings] Failed to sync provider ${providerId}:`, error);
      }
    }

    // Sync all agent models
    const agentModels = await agentModelStore.getAllAgentModels();
    for (const [agentName, modelConfig] of Object.entries(agentModels)) {
      try {
        await extensionBridge.syncAgentModel(agentName, modelConfig);
        console.log(`[ExtensionSettings] Synced agent model: ${agentName}`);
      } catch (error) {
        console.error(`[ExtensionSettings] Failed to sync agent model ${agentName}:`, error);
      }
    }

    console.log('[ExtensionSettings] All configurations synced to extension');
  } catch (error) {
    console.error('[ExtensionSettings] Error syncing configurations:', error);
    throw error;
  }
}

export default function ExtensionSettings() {
  const [extensionId, setExtensionId] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // Load saved extension ID
    const savedId = extensionBridge.getExtensionId();
    if (savedId) {
      setExtensionId(savedId);
      checkExtension();
    } else {
      setStatusMessage('Extension ID not configured. Please enter your extension ID.');
    }
  }, []);

  const checkExtension = async () => {
    setIsChecking(true);
    setStatusMessage('Checking extension...');

    try {
      // Reset the bridge's check promise to force a fresh check
      const available = await extensionBridge.isExtensionAvailable();
      setIsAvailable(available);
      if (available) {
        // Sync all existing LLM configs to extension
        try {
          await syncAllConfigsToExtension();
          setStatusMessage('✅ Extension is connected and available. LLM configurations synced.');
        } catch (syncError) {
          console.warn('[ExtensionSettings] Failed to sync configs:', syncError);
          setStatusMessage('✅ Extension is connected and available (sync warning: check console)');
        }
      } else {
        if (!extensionId) {
          setStatusMessage('❌ Extension ID not configured. Please enter your extension ID above.');
        } else {
          // Check browser console for detailed error messages
          const currentUrl = window.location.href;
          setStatusMessage(
            `❌ Extension not available. Please verify:\n` +
              `1. Extension is installed and enabled\n` +
              `2. Extension ID is correct: ${extensionId}\n` +
              `3. Extension has been reloaded after recent changes\n` +
              `4. You are using Chrome/Edge (not Firefox)\n` +
              `5. Web app URL matches allowed origins: ${currentUrl}\n\n` +
              `Check the browser console (F12) for detailed error messages.`,
          );
        }
      }
    } catch (error) {
      setIsAvailable(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ExtensionSettings] Check error:', error);
      setStatusMessage(`❌ Error checking extension: ${errorMessage}\n\nCheck the browser console (F12) for details.`);
    } finally {
      setIsChecking(false);
    }
  };

  const saveExtensionId = async () => {
    if (!extensionId.trim()) {
      setStatusMessage('Please enter an extension ID');
      return;
    }

    extensionBridge.setExtensionId(extensionId.trim());
    await checkExtension();
  };

  const getExtensionIdInstructions = () => {
    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">How to find your Extension ID:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            Open Chrome and go to <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">chrome://extensions</code>
          </li>
          <li>Enable "Developer mode" (toggle in top right)</li>
          <li>Find "AITestGen" extension in the list</li>
          <li>
            Copy the <strong>ID</strong> shown under the extension name (a long string like
            "abcdefghijklmnopqrstuvwxyz123456")
            <br />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Note: This is different from the extension name or version
            </span>
          </li>
          <li>Paste it in the field above and click "Save & Check"</li>
          <li>
            If you just installed/updated the extension, make sure to <strong>reload the extension</strong> by clicking
            the reload icon (🔄) next to it
          </li>
        </ol>
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs">
          <strong>Tip:</strong> After building the extension with <code>pnpm build</code>, load it as unpacked from the{' '}
          <code>dist/</code> directory. The extension ID will be shown on the extensions page.
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">Chrome Extension Connection</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect the web app to the Chrome extension for full browser automation capabilities on external websites.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="extension-id" className="block text-sm font-medium mb-2">
            Extension ID
          </label>
          <div className="flex gap-2">
            <input
              id="extension-id"
              type="text"
              value={extensionId}
              onChange={e => setExtensionId(e.target.value)}
              placeholder="Enter your Chrome extension ID"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <Button onClick={saveExtensionId} disabled={isChecking || !extensionId.trim()}>
              Save & Check
            </Button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-md ${
              isAvailable
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
            }`}>
            {statusMessage}
          </div>
        )}

        {getExtensionIdInstructions()}

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">Benefits of Extension Connection:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>Full automation on external websites (not limited to localhost)</li>
            <li>Access to all browser tabs and windows</li>
            <li>Cross-origin script injection capabilities</li>
            <li>Complete browser control features</li>
            <li>Same functionality as the extension's side panel</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">⚠️ Important: Separate Settings</h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            The web app and Chrome extension have <strong>separate settings</strong>. API keys and model configurations
            need to be set up in both places:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            <li>
              <strong>Web App Settings</strong> (this page): Configure models here for web-only mode
            </li>
            <li>
              <strong>Extension Settings</strong>: Open extension options page to configure API keys for extension mode
            </li>
          </ol>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                // Try to open extension options page
                if (extensionId) {
                  chrome.runtime.sendMessage(extensionId, { action: 'open_options' }, () => {
                    // Fallback: open extensions page
                    window.open('chrome://extensions', '_blank');
                  });
                } else {
                  window.open('chrome://extensions', '_blank');
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700 text-white">
              Open Extension Options
            </Button>
            <Button
              onClick={() => window.open('chrome://extensions', '_blank')}
              variant="outline"
              className="border-yellow-600 text-yellow-800 dark:text-yellow-200">
              Open Extensions Page
            </Button>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
            On the extensions page, find "AITestGen" and click "Options" (or right-click → Options) to configure API
            keys.
          </p>
        </div>

        {!isAvailable && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Note:</strong> Without the extension, the web app can only interact with pages on the same origin
              (localhost:3000). For full automation capabilities, please install and connect the Chrome extension.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
