/**
 * Extension Bridge
 * Handles communication between the web app and the Chrome extension
 * Falls back to web-only mode if extension is not available
 */

export interface ExtensionMessage {
  action: string;
  data?: any;
  taskId?: string;
  tabId?: number;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class ExtensionBridge {
  private extensionId: string | null = null;
  private isAvailable: boolean = false;
  private checkPromise: Promise<boolean> | null = null;

  constructor() {
    // Load extension ID from localStorage if available
    const storedExtensionId = localStorage.getItem('extension_id');
    if (storedExtensionId) {
      this.extensionId = storedExtensionId;
    }
    // Don't auto-detect on construction - wait for explicit check
  }

  /**
   * Detect if the extension is installed and available
   */
  private async detectExtension(): Promise<boolean> {
    if (this.checkPromise) {
      return this.checkPromise;
    }

    this.checkPromise = new Promise<boolean>(resolve => {
      // Check if chrome.runtime is available
      if (typeof chrome === 'undefined') {
        console.error('[ExtensionBridge] chrome is undefined - not running in Chrome/Edge');
        this.isAvailable = false;
        resolve(false);
        return;
      }

      if (!chrome.runtime) {
        console.error('[ExtensionBridge] chrome.runtime is undefined - extension APIs not available');
        this.isAvailable = false;
        resolve(false);
        return;
      }

      if (!chrome.runtime.sendMessage) {
        console.error('[ExtensionBridge] chrome.runtime.sendMessage is undefined');
        this.isAvailable = false;
        resolve(false);
        return;
      }

      // Verify we're not using a polyfill (polyfill has id: 'web-app')
      if (chrome.runtime.id === 'web-app') {
        console.warn('[ExtensionBridge] Using polyfill - real chrome.runtime not available');
        this.isAvailable = false;
        resolve(false);
        return;
      }

      // Use instance variable if set, otherwise check localStorage
      if (!this.extensionId) {
        const storedExtensionId = localStorage.getItem('extension_id');
        if (storedExtensionId) {
          this.extensionId = storedExtensionId;
        } else {
          // No extension ID configured
          console.warn('[ExtensionBridge] No extension ID configured. Please set it in Settings → Extension.');
          this.isAvailable = false;
          resolve(false);
          return;
        }
      }

      // Try to ping the extension with retry mechanism to wake up inactive service worker
      const attemptPing = async (attempt: number = 1, maxAttempts: number = 3): Promise<boolean> => {
        return new Promise(resolve => {
          const timeout = setTimeout(() => {
            if (attempt < maxAttempts) {
              console.log(
                `[ExtensionBridge] Ping attempt ${attempt} timed out, retrying... (${attempt + 1}/${maxAttempts})`,
              );
              // Retry after a short delay to give service worker time to wake up
              setTimeout(() => {
                attemptPing(attempt + 1, maxAttempts).then(resolve);
              }, 500);
            } else {
              console.warn('[ExtensionBridge] Ping failed after', maxAttempts, 'attempts');
              console.warn('[ExtensionBridge] Service worker may be inactive. Please:');
              console.warn('  1. Go to chrome://extensions');
              console.warn('  2. Find extension with ID:', this.extensionId);
              console.warn('  3. Click "Reload" button (circular arrow icon)');
              console.warn('  4. Check service worker status - should show "running"');
              this.isAvailable = false;
              resolve(false);
            }
          }, 3000); // 3 second timeout per attempt

          try {
            if (attempt === 1) {
              console.log('[ExtensionBridge] Attempting to ping extension with ID:', this.extensionId);
              console.log('[ExtensionBridge] Current origin:', window.location.origin);
            }

            // Use port connection instead of sendMessage (more reliable for external origins)
            if (attempt === 1) {
              console.log('[ExtensionBridge] Using port connection for ping (more reliable for external origins)');
            }

            // Use chrome.runtime.connect with extension ID
            // The extension will receive this via onConnectExternal
            const port = chrome.runtime.connect(this.extensionId!, { name: 'web-app-connection' });

            const lastError = chrome.runtime.lastError;
            if (lastError) {
              clearTimeout(timeout);
              const error = lastError.message;

              // If connection fails, retry
              if (
                (error.includes('Could not establish connection') || error.includes('Receiving end does not exist')) &&
                attempt < maxAttempts
              ) {
                console.log(`[ExtensionBridge] Port connection failed (attempt ${attempt}), retrying...`);
                const delay = attempt * 1000; // 1s, 2s delays
                setTimeout(() => {
                  attemptPing(attempt + 1, maxAttempts).then(resolve);
                }, delay);
                return;
              }

              console.error('[ExtensionBridge] ❌ Port connection failed:', error);
              this.isAvailable = false;
              resolve(false);
              return;
            }

            // Set up message handler
            const messageHandler = (response: any) => {
              clearTimeout(timeout);
              port.onMessage.removeListener(messageHandler);
              port.disconnect();

              // Check if this is a ping response
              if (response.success || response.type === 'heartbeat_ack' || response.data?.message === 'pong') {
                console.log('[ExtensionBridge] ✅ Extension is available and responding via port');
                this.isAvailable = true;
                resolve(true);
              } else {
                console.warn('[ExtensionBridge] ⚠️ Extension responded but with unexpected format:', response);
                this.isAvailable = false;
                resolve(false);
              }
            };

            port.onMessage.addListener(messageHandler);

            // Send ping message
            port.postMessage({ action: 'ping', type: 'ping' });

            // Handle disconnection
            port.onDisconnect.addListener(() => {
              clearTimeout(timeout);
              const error = chrome.runtime.lastError;
              if (error && attempt < maxAttempts) {
                console.log(`[ExtensionBridge] Port disconnected (attempt ${attempt}), retrying...`);
                setTimeout(() => {
                  attemptPing(attempt + 1, maxAttempts).then(resolve);
                }, 500);
              } else {
                this.isAvailable = false;
                resolve(false);
              }
            });
          } catch (error) {
            clearTimeout(timeout);
            console.error('[ExtensionBridge] ❌ Exception during ping:', error);
            this.isAvailable = false;
            resolve(false);
          }
        });
      };

      // Start ping attempts
      attemptPing().then(resolve);
    });

    return this.checkPromise;
  }

  /**
   * Send a message to the extension
   * Falls back to port connection if sendMessage fails (common with external origins)
   */
  async sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
    // Wait for detection to complete
    const isAvailable = await this.detectExtension();

    if (!isAvailable || !this.extensionId) {
      const errorMsg = this.extensionId
        ? 'Extension not available. Please check that the extension is installed and enabled, and that the extension ID is correct.'
        : 'Extension ID not configured. Please go to Settings → Extension and configure your extension ID.';
      throw new Error(errorMsg);
    }

    // Try sendMessage first
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(this.extensionId!, message, (response: ExtensionResponse) => {
          // Check for runtime errors - this prevents "Unchecked runtime.lastError" warnings
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            const error = lastError.message;
            console.warn('[ExtensionBridge] sendMessage failed, trying port connection:', error);

            // If sendMessage fails, try port connection as fallback
            if (error.includes('Could not establish connection') || error.includes('Receiving end does not exist')) {
              console.log('[ExtensionBridge] Falling back to port connection for message:', message.action);
              this.sendMessageViaPort(message).then(resolve).catch(reject);
              return;
            }

            // If extension was uninstalled or ID is wrong, reset availability
            if (error.includes('Extension context invalidated')) {
              console.warn('[ExtensionBridge] Extension connection lost, resetting availability');
              this.isAvailable = false;
            }

            reject(new Error(error));
            return;
          }
          resolve(response || { success: false, error: 'No response from extension' });
        });
      } catch (error) {
        console.error('[ExtensionBridge] Exception sending message, trying port:', error);
        // Fallback to port connection
        this.sendMessageViaPort(message).then(resolve).catch(reject);
      }
    });
  }

  /**
   * Send a message via port connection (more reliable for external origins)
   */
  private async sendMessageViaPort(message: ExtensionMessage): Promise<ExtensionResponse> {
    return new Promise((resolve, reject) => {
      try {
        // Use chrome.runtime.connect with extension ID
        // The extension will receive this via onConnectExternal
        const port = chrome.runtime.connect(this.extensionId!, { name: 'web-app-connection' });

        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        // Set up response handler
        const messageHandler = (response: any) => {
          // Check if this is a response to our message
          if (response.success !== undefined || response.error || response.data) {
            port.onMessage.removeListener(messageHandler);
            port.disconnect();
            resolve(response as ExtensionResponse);
          }
        };

        port.onMessage.addListener(messageHandler);

        // Set timeout
        const timeout = setTimeout(() => {
          port.onMessage.removeListener(messageHandler);
          port.disconnect();
          reject(new Error('Port message timeout'));
        }, 10000);

        // Send message (convert action to type for port compatibility)
        const portMessage = {
          ...message,
          type: message.action || message.type,
        };
        port.postMessage(portMessage);

        // Update handler to clear timeout on response
        const originalHandler = messageHandler;
        port.onMessage.addListener((response: any) => {
          if (response.success !== undefined || response.error || response.data) {
            clearTimeout(timeout);
            originalHandler(response);
          }
        });

        port.onDisconnect.addListener(() => {
          clearTimeout(timeout);
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
          } else {
            reject(new Error('Port disconnected'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect to the extension for long-lived communication
   * Uses chrome.runtime.connect with extension ID for external web app connections
   * The extension side uses onConnectExternal to receive these connections
   */
  connect(name?: string): chrome.runtime.Port | null {
    if (!this.isAvailable || !this.extensionId) {
      return null;
    }

    try {
      // Use chrome.runtime.connect with extension ID
      // The extension will receive this via onConnectExternal
      const port = chrome.runtime.connect(this.extensionId, { name: name || 'web-app-connection' });
      console.log('[ExtensionBridge] Connected to extension via chrome.runtime.connect');

      // Check for runtime errors immediately after connection attempt
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        const error = lastError.message;
        console.error('[ExtensionBridge] Connection failed:', error);

        // If extension was uninstalled or ID is wrong, reset availability
        if (error.includes('Could not establish connection') || error.includes('Extension context invalidated')) {
          console.warn('[ExtensionBridge] Extension connection lost, resetting availability');
          this.isAvailable = false;
        }

        return null;
      }

      return port;
    } catch (error) {
      console.error('[ExtensionBridge] Connection error:', error);
      return null;
    }
  }

  /**
   * Check if extension is available
   * Forces a fresh check by resetting the promise
   */
  async isExtensionAvailable(): Promise<boolean> {
    // Force a fresh check by resetting the promise
    this.checkPromise = null;
    this.isAvailable = false;
    return this.detectExtension();
  }

  /**
   * Set the extension ID (can be configured by user or detected)
   * Resets the check promise to force a fresh detection
   */
  setExtensionId(extensionId: string): void {
    this.extensionId = extensionId;
    localStorage.setItem('extension_id', extensionId);
    // Reset check promise to force fresh detection
    this.checkPromise = null;
    this.isAvailable = false; // Will be set to true after successful ping
  }

  /**
   * Get the extension ID
   */
  getExtensionId(): string | null {
    return this.extensionId;
  }

  /**
   * Automatically detect the extension ID by searching for AITestGen extension
   * Tries multiple methods:
   * 1. Test saved ID from localStorage first (most likely to work)
   * 2. Try known extension IDs by pinging them
   * 3. chrome.management API (if available - usually not from web pages)
   */
  async detectExtensionId(): Promise<string | null> {
    // Method 1: Test saved ID first (most likely to be correct)
    const savedId = localStorage.getItem('extension_id');
    if (savedId) {
      console.log('[ExtensionBridge] Testing saved extension ID:', savedId);
      try {
        const isValid = await this.testExtensionId(savedId);
        if (isValid) {
          console.log('[ExtensionBridge] ✅ Saved extension ID is valid:', savedId);
          this.setExtensionId(savedId);
          return savedId;
        } else {
          console.warn('[ExtensionBridge] Saved extension ID did not respond:', savedId);
        }
      } catch (error) {
        console.warn('[ExtensionBridge] Error testing saved ID:', error);
      }
    }

    // Method 2: Try known/potential extension IDs by attempting to ping them
    const potentialIds = [
      'obdjgoklifihgkklclbcjkpejipfjhkm', // Known published ID
      // Add more potential IDs if known
    ];

    console.log('[ExtensionBridge] Attempting to detect extension ID by pinging potential IDs...');

    for (const testId of potentialIds) {
      // Skip if we already tested this ID
      if (testId === savedId) {
        continue;
      }

      try {
        const isValid = await this.testExtensionId(testId);
        if (isValid) {
          console.log('[ExtensionBridge] ✅ Auto-detected extension ID by ping:', testId);
          this.setExtensionId(testId);
          return testId;
        } else {
          console.log(`[ExtensionBridge] Extension ID ${testId} did not respond`);
        }
      } catch (error) {
        console.warn(`[ExtensionBridge] Error testing ID ${testId}:`, error);
        // Continue to next ID
        continue;
      }
    }

    // Method 3: Try chrome.management API (usually not available from web pages, but worth trying)
    if (typeof chrome !== 'undefined' && chrome.management) {
      try {
        const extensions = await chrome.management.getAll();

        // Search for AITestGen extension by name
        const aitestgenExtension = extensions.find(
          ext =>
            ext.name === 'AITestGen' ||
            ext.name === 'AITestGen: AI Web Agent & Automation' ||
            ext.name?.toLowerCase().includes('aitestgen') ||
            ext.shortName === 'AITestGen',
        );

        if (aitestgenExtension) {
          console.log('[ExtensionBridge] ✅ Auto-detected extension ID via management API:', aitestgenExtension.id);
          this.setExtensionId(aitestgenExtension.id);
          return aitestgenExtension.id;
        }
      } catch (error) {
        console.warn('[ExtensionBridge] chrome.management API not accessible (this is normal for web pages):', error);
        // This is expected - chrome.management is usually not available from web pages
      }
    }

    console.warn(
      '[ExtensionBridge] Could not auto-detect extension ID. Please enter it manually from chrome://extensions',
    );
    return null;
  }

  /**
   * Test if an extension ID is valid by pinging it
   */
  private async testExtensionId(extensionId: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);

      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        clearTimeout(timeout);
        resolve(false);
        return;
      }

      chrome.runtime.sendMessage(extensionId, { action: 'ping' }, response => {
        clearTimeout(timeout);
        const lastError = chrome.runtime.lastError;
        if (!lastError && response && response.success) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Sync LLM provider configuration to extension
   */
  async syncLLMProvider(providerId: string, providerConfig: any): Promise<ExtensionResponse> {
    return this.sendMessage({
      action: 'sync_llm_provider',
      data: { providerId, providerConfig },
    });
  }

  /**
   * Sync agent model configuration to extension
   */
  async syncAgentModel(agentName: string, modelConfig: any): Promise<ExtensionResponse> {
    return this.sendMessage({
      action: 'sync_agent_model',
      data: { agentName, modelConfig },
    });
  }

  /**
   * Check if LLM is configured in extension
   */
  async checkLLMConfigured(): Promise<
    ExtensionResponse & {
      data?: { configured: boolean; hasProviders: boolean; hasNavigatorModel: boolean; providerCount: number };
    }
  > {
    return this.sendMessage({
      action: 'check_llm_configured',
    }) as Promise<
      ExtensionResponse & {
        data?: { configured: boolean; hasProviders: boolean; hasNavigatorModel: boolean; providerCount: number };
      }
    >;
  }
}

// Export singleton instance
export const extensionBridge = new ExtensionBridge();
