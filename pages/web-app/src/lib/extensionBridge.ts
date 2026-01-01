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
    this.detectExtension();
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
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        this.isAvailable = false;
        resolve(false);
        return;
      }

      // Try to get extension ID from localStorage (user configured)
      const storedExtensionId = localStorage.getItem('extension_id');
      if (storedExtensionId) {
        this.extensionId = storedExtensionId;
      } else {
        // Try to detect extension ID by attempting to connect
        // We'll try common extension IDs or let user configure
        // For now, we'll need user to provide the ID
        this.isAvailable = false;
        resolve(false);
        return;
      }

      // Try to ping the extension directly (avoiding circular dependency with sendMessage)
      const timeout = setTimeout(() => {
        console.warn('[ExtensionBridge] Ping timeout - extension may not be installed or ID is incorrect');
        this.isAvailable = false;
        resolve(false);
      }, 3000);

      try {
        console.log('[ExtensionBridge] Attempting to ping extension with ID:', this.extensionId);
        chrome.runtime.sendMessage(this.extensionId, { action: 'ping' }, (response: ExtensionResponse) => {
          clearTimeout(timeout);

          // Check for runtime errors - this prevents "Unchecked runtime.lastError" warnings
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            const error = lastError.message;
            console.error('[ExtensionBridge] Ping failed:', error);
            console.error('[ExtensionBridge] Extension ID used:', this.extensionId);
            console.error('[ExtensionBridge] Current URL:', window.location.href);

            // Provide helpful error messages
            if (error.includes('Could not establish connection') || error.includes('Extension context invalidated')) {
              console.error('[ExtensionBridge] Extension not found. Possible causes:');
              console.error('  1. Extension is not installed');
              console.error('  2. Extension ID is incorrect');
              console.error('  3. Extension was disabled or uninstalled');
              console.error('  4. Extension needs to be reloaded');
              console.error('  5. Extension manifest may not have externally_connectable configured');
              console.error('  6. Web app origin may not match allowed origins in manifest');
            }

            this.isAvailable = false;
            resolve(false);
            return;
          }

          if (response && response.success) {
            console.log('[ExtensionBridge] Extension is available and responding', response);
            this.isAvailable = true;
            resolve(true);
          } else {
            console.warn('[ExtensionBridge] Extension responded but with error:', response?.error);
            this.isAvailable = false;
            resolve(false);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        console.error('[ExtensionBridge] Exception during ping:', error);
        this.isAvailable = false;
        resolve(false);
      }
    });

    return this.checkPromise;
  }

  /**
   * Send a message to the extension
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

    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(this.extensionId!, message, (response: ExtensionResponse) => {
          // Check for runtime errors - this prevents "Unchecked runtime.lastError" warnings
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            const error = lastError.message;
            console.error('[ExtensionBridge] Message send failed:', error);

            // If extension was uninstalled or ID is wrong, reset availability
            if (error.includes('Could not establish connection') || error.includes('Extension context invalidated')) {
              console.warn('[ExtensionBridge] Extension connection lost, resetting availability');
              this.isAvailable = false;
              // Don't remove extension_id from localStorage - user might just need to reload extension
            }

            reject(new Error(error));
            return;
          }
          resolve(response || { success: false, error: 'No response from extension' });
        });
      } catch (error) {
        console.error('[ExtensionBridge] Exception sending message:', error);
        reject(error);
      }
    });
  }

  /**
   * Connect to the extension for long-lived communication
   */
  connect(name?: string): chrome.runtime.Port | null {
    if (!this.isAvailable || !this.extensionId) {
      return null;
    }

    try {
      const port = chrome.runtime.connect(this.extensionId, { name });

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
   */
  async isExtensionAvailable(): Promise<boolean> {
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
