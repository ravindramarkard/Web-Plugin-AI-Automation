/**
 * Web-compatible Browser Context
 * Provides browser state and navigation using DOM APIs
 */

import { getPageState, navigateToUrl, getClickableElements } from './webBrowserActions';

export class WebBrowserContext {
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

  async getCachedState(useVision = false, cacheClickableElementsHashes = false): Promise<any> {
    // Try to use extension if available to get state from active tab
    const { extensionBridge } = await import('./extensionBridge');
    const isExtensionAvailable = await extensionBridge.isExtensionAvailable();

    if (isExtensionAvailable) {
      try {
        const response = await extensionBridge.sendMessage({
          action: 'get_page_state',
        });

        if (response.success && response.data) {
          return {
            url: response.data.url,
            title: response.data.title,
            viewport: { width: window.innerWidth, height: window.innerHeight },
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
            visualViewportHeight: window.innerHeight,
            tabs: [],
            clickableElements: response.data.clickableElements || [],
          };
        }
      } catch (error) {
        console.warn('[WebBrowserContext] Extension getState failed, falling back:', error);
        // Fall through to web-only behavior
      }
    }

    // Web-only fallback
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
      clickableElements: pageState.clickableElements,
    };
  }

  async getState(useVision = false, cacheClickableElementsHashes = false): Promise<any> {
    return this.getCachedState(useVision, cacheClickableElementsHashes);
  }

  async getCurrentPage(): Promise<any> {
    const pageState = getPageState();
    return {
      getState: async () => this.getCachedState(),
      getCachedState: async () => this.getCachedState(),
      attached: true,
      tabId: 0,
      removeHighlight: async () => {},
    };
  }

  async navigateTo(url: string): Promise<void> {
    await navigateToUrl(url);
  }

  async cleanup(): Promise<void> {
    // No-op for web
  }

  updateCurrentTabId(_tabId: number): void {
    // No-op for web
  }

  async removeHighlight(): Promise<void> {
    // No-op for web
  }
}
