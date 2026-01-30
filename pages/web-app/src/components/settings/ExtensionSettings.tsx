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
    // Try to auto-detect extension ID first
    const autoDetectExtension = async () => {
      try {
        const detectedId = await extensionBridge.detectExtensionId();
        if (detectedId) {
          setExtensionId(detectedId);
          setStatusMessage('Extension ID auto-detected. Checking connection...');
          // Small delay to ensure state is updated
          setTimeout(() => {
            checkExtension();
          }, 100);
          return;
        }
      } catch (error) {
        console.warn('[ExtensionSettings] Auto-detection failed:', error);
      }

      // Fall back to saved extension ID
      const savedId = extensionBridge.getExtensionId();
      if (savedId) {
        setExtensionId(savedId);
        checkExtension();
      } else {
        setStatusMessage('Extension ID not configured. Click "Auto-Detect" or enter manually.');
      }
    };

    autoDetectExtension();
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

  const autoDetectExtensionId = async () => {
    setIsChecking(true);
    setStatusMessage('Auto-detecting extension ID... This may take a few seconds.');

    try {
      const detectedId = await extensionBridge.detectExtensionId();
      if (detectedId) {
        setExtensionId(detectedId);
        setStatusMessage('✅ Extension ID auto-detected! Checking connection...');
        // Small delay to ensure state is updated
        setTimeout(async () => {
          await checkExtension();
        }, 100);
      } else {
        // Try to get saved ID and test it
        const savedId = extensionBridge.getExtensionId();
        if (savedId) {
          setExtensionId(savedId);
          setStatusMessage(
            '⚠️ Could not auto-detect, but found saved ID. Testing saved ID...\n\n' +
              'If this fails, please:\n' +
              '1. Go to chrome://extensions\n' +
              '2. Find AITestGen extension\n' +
              '3. Copy the ID shown\n' +
              '4. Paste it above and click "Save & Check"',
          );
          setTimeout(async () => {
            await checkExtension();
          }, 100);
        } else {
          setStatusMessage(
            '❌ Could not auto-detect extension ID. Please:\n' +
              '1. Go to chrome://extensions (click "Open Extensions Page" below)\n' +
              '2. Find "AITestGen" extension\n' +
              '3. Copy the ID shown under the extension name\n' +
              '4. Paste it above and click "Save & Check"\n\n' +
              'Note: Make sure the extension is installed, enabled, and reloaded.',
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ExtensionSettings] Auto-detection error:', error);
      setStatusMessage(
        `❌ Auto-detection failed: ${errorMessage}\n\n` +
          'Please enter the extension ID manually:\n' +
          '1. Go to chrome://extensions\n' +
          '2. Find AITestGen and copy its ID\n' +
          '3. Paste it above',
      );
    } finally {
      setIsChecking(false);
    }
  };

  const openExtensionsPage = () => {
    // Open chrome://extensions in a new tab
    window.open('chrome://extensions', '_blank');
    setStatusMessage(
      'Opened extensions page. Find "AITestGen", copy its ID, and paste it above.\n\n' +
        'Tip: The ID is shown directly under the extension name.',
    );
  };

  const getExtensionIdInstructions = () => {
    return (
      <div className="glass-panel mt-4 rounded-lg p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">How to find your Extension ID:</h3>
          <Button onClick={openExtensionsPage} className="glass-button text-sm">
            Open Extensions Page
          </Button>
        </div>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>
            Click "Open Extensions Page" above or go to{' '}
            <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">chrome://extensions</code>
          </li>
          <li>Enable "Developer mode" (toggle in top right) if not already enabled</li>
          <li>Find "AITestGen" extension in the list</li>
          <li>
            Copy the <strong>ID</strong> shown under the extension name (a long string like
            "abcdefghijklmnopqrstuvwxyz123456")
            <br />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Note: This is different from the extension name or version. For unpacked extensions, the ID changes when
              you reload.
            </span>
          </li>
          <li>Paste it in the field above and click "Save & Check"</li>
          <li>
            If you just installed/updated the extension, make sure to <strong>reload the extension</strong> by clicking
            the reload icon (🔄) next to it, then copy the new ID
          </li>
        </ol>
        <div className="mt-3 rounded bg-yellow-50/50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
          <strong>Tip:</strong> After building the extension with <code>pnpm build</code>, load it as unpacked from the{' '}
          <code>dist/</code> directory. The extension ID will be shown on the extensions page. Click "Auto-Detect" to
          try automatic detection.
        </div>
        <div className="mt-3 rounded bg-green-50/50 p-3 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200">
          <strong>💡 Quick Method:</strong>
          <ol className="mt-1 list-inside list-decimal space-y-1">
            <li>Click "Open Extensions Page" button above</li>
            <li>Find "AITestGen" in the list</li>
            <li>The ID is shown directly under the extension name (looks like: abcdefghijklmnopqrstuvwxyz123456)</li>
            <li>Click on the ID text to select it, then copy (Cmd+C / Ctrl+C)</li>
            <li>Paste it in the field above</li>
          </ol>
          <p className="mt-2 text-xs opacity-80">
            <strong>Note:</strong> For unpacked extensions, the ID changes when you reload. After reloading the
            extension, copy the new ID.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card space-y-6 p-6">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Chrome Extension Connection</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Connect the web app to the Chrome extension for full browser automation capabilities on external websites.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="extension-id" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            Extension ID
          </label>
          <div className="flex gap-2">
            <input
              id="extension-id"
              type="text"
              value={extensionId}
              onChange={e => setExtensionId(e.target.value)}
              placeholder="Enter your Chrome extension ID"
              className="glass-input flex-1"
            />
            <Button onClick={autoDetectExtensionId} disabled={isChecking} className="glass-button">
              Auto-Detect
            </Button>
            <Button
              onClick={saveExtensionId}
              disabled={isChecking || !extensionId.trim()}
              className="glass-button bg-blue-600/80 hover:bg-blue-600">
              Save & Check
            </Button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`rounded-md p-3 ${
              isAvailable
                ? 'bg-green-50/50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'bg-yellow-50/50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
            }`}>
            {statusMessage}
          </div>
        )}

        {getExtensionIdInstructions()}

        <div className="glass-panel mt-4 rounded-lg p-4">
          <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Benefits of Extension Connection:</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>Full automation on external websites (not limited to localhost)</li>
            <li>Access to all browser tabs and windows</li>
            <li>Cross-origin script injection capabilities</li>
            <li>Complete browser control features</li>
            <li>Same functionality as the extension's side panel</li>
          </ul>
        </div>

        <div className="glass-panel mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 dark:border-yellow-500/20 dark:bg-yellow-500/10">
          <h3 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">⚠️ Important: Separate Settings</h3>
          <p className="mb-2 text-sm text-yellow-800 dark:text-yellow-200">
            The web app and Chrome extension have <strong>separate settings</strong>. API keys and model configurations
            need to be set up in both places:
          </p>
          <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
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
              className="glass-button border-none bg-yellow-600/80 text-white hover:bg-yellow-700/90">
              Open Extension Options
            </Button>
            <Button
              onClick={() => window.open('chrome://extensions', '_blank')}
              className="glass-button bg-yellow-500/20 text-yellow-800 hover:bg-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-200 dark:hover:bg-yellow-500/30">
              Open Extensions Page
            </Button>
          </div>
          <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
            On the extensions page, find "AITestGen" and click "Options" (or right-click → Options) to configure API
            keys.
          </p>
        </div>

        {!isAvailable && (
          <div className="glass-panel mt-4 rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
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
