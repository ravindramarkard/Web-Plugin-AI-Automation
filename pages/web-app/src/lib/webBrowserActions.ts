/**
 * Web-compatible browser actions
 * Implements browser automation using standard DOM APIs
 * Works directly in the browser without Chrome extension
 */

// ActionResult type - defined locally to avoid import issues
export interface ActionResult {
  isDone: boolean;
  success: boolean;
  extractedContent: string | null;
  error: string | null;
  includeInMemory: boolean;
  interactedElement: {
    tagName: string;
    text: string;
    attributes: Record<string, string>;
    xpath: string;
  } | null;
}

/**
 * Get all clickable elements from the current page
 */
export function getClickableElements(): Array<{
  index: number;
  element: HTMLElement;
  text: string;
  tagName: string;
  xpath: string;
}> {
  const clickableElements: Array<{
    index: number;
    element: HTMLElement;
    text: string;
    tagName: string;
    xpath: string;
  }> = [];

  // Find all potentially clickable elements and input fields
  const selectors = [
    'a',
    'button',
    'input',
    'textarea',
    'select',
    '[onclick]',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[contenteditable="true"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = document.querySelectorAll<HTMLElement>(selectors);
  let index = 0;

  elements.forEach(element => {
    // Skip hidden elements
    if (element.offsetParent === null && element.style.display === 'none') {
      return;
    }

    const text = element.textContent?.trim() || '';
    const ariaLabel = element.getAttribute('aria-label') || '';
    const placeholder = element.getAttribute('placeholder') || '';
    const name = element.getAttribute('name') || '';
    const id = element.getAttribute('id') || '';
    const type = element.getAttribute('type') || '';
    const xpath = getXPath(element);

    clickableElements.push({
      index: index++,
      element,
      text: text.substring(0, 100), // Limit text length
      tagName: element.tagName.toLowerCase(),
      xpath,
      ariaLabel: ariaLabel.substring(0, 100),
      placeholder: placeholder.substring(0, 100),
      name: name.substring(0, 100),
      id: id.substring(0, 100),
      type: type.substring(0, 50),
    });
  });

  return clickableElements;
}

/**
 * Get XPath for an element
 */
function getXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    const xpathIndex = index > 1 ? `[${index}]` : '';
    parts.unshift(`${tagName}${xpathIndex}`);

    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

/**
 * Find element by index from clickable elements
 */
function findElementByIndex(index: number): HTMLElement | null {
  const clickableElements = getClickableElements();
  const element = clickableElements.find(el => el.index === index);
  return element?.element || null;
}

/**
 * Find element by XPath
 */
function findElementByXPath(xpath: string): HTMLElement | null {
  try {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return (result.singleNodeValue as HTMLElement) || null;
  } catch (error) {
    console.error('[WebBrowserActions] XPath evaluation error:', error);
    return null;
  }
}

/**
 * Click on an element
 * Uses extension if available, otherwise falls back to web-only behavior
 */
export async function clickElement(index?: number, xpath?: string): Promise<ActionResult> {
  // Try to use extension if available
  const { extensionBridge } = await import('./extensionBridge');
  const isExtensionAvailable = await extensionBridge.isExtensionAvailable();

  if (isExtensionAvailable) {
    try {
      const response = await extensionBridge.sendMessage({
        action: 'click_element',
        data: { index, xpath },
      });

      if (response.success) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return {
          isDone: false,
          success: true,
          error: null,
          extractedContent: `Clicked element ${index !== undefined ? `[${index}]` : xpath} using extension`,
          includeInMemory: true,
          interactedElement: null,
        };
      }
    } catch (error) {
      console.warn('[WebBrowserActions] Extension click failed, falling back:', error);
      // Fall through to web-only behavior
    }
  }

  // Web-only fallback (original implementation)
  try {
    let element: HTMLElement | null = null;

    if (xpath) {
      element = findElementByXPath(xpath);
    } else if (index !== undefined) {
      element = findElementByIndex(index);
    }

    if (!element) {
      return {
        isDone: false,
        success: false,
        error: `Element not found: ${xpath || `index ${index}`}`,
        extractedContent: null,
        includeInMemory: true,
        interactedElement: null,
      };
    }

    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 100));

    // Trigger click event
    element.click();

    // Wait a bit for any navigation or state changes
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      isDone: false,
      success: true,
      error: null,
      extractedContent: `Clicked on ${element.tagName} element`,
      includeInMemory: true,
      interactedElement: {
        tagName: element.tagName.toLowerCase(),
        text: element.textContent?.trim() || '',
        attributes: Array.from(element.attributes).reduce(
          (acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          },
          {} as Record<string, string>,
        ),
        xpath: getXPath(element),
      },
    };
  } catch (error) {
    return {
      isDone: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractedContent: null,
      includeInMemory: true,
      interactedElement: null,
    };
  }
}

/**
 * Type text into an input element
 * Uses extension if available, otherwise falls back to web-only behavior
 */
export async function typeText(text: string, index?: number, xpath?: string): Promise<ActionResult> {
  // Try to use extension if available
  const { extensionBridge } = await import('./extensionBridge');
  const isExtensionAvailable = await extensionBridge.isExtensionAvailable();

  if (isExtensionAvailable) {
    try {
      const response = await extensionBridge.sendMessage({
        action: 'input_text',
        data: { text, index, xpath },
      });

      if (response.success) {
        return {
          isDone: false,
          success: true,
          error: null,
          extractedContent: `Typed "${text}" into input field using extension`,
          includeInMemory: true,
          interactedElement: null,
        };
      }
    } catch (error) {
      console.warn('[WebBrowserActions] Extension input failed, falling back:', error);
      // Fall through to web-only behavior
    }
  }

  // Web-only fallback (original implementation)
  try {
    let element: HTMLElement | null = null;

    if (xpath) {
      element = findElementByXPath(xpath);
    } else if (index !== undefined) {
      element = findElementByIndex(index);
    }

    if (!element) {
      return {
        isDone: false,
        success: false,
        error: `Input element not found: ${xpath || `index ${index}`}`,
        extractedContent: null,
        includeInMemory: true,
        interactedElement: null,
      };
    }

    // Check if element is an input or textarea
    const isInput =
      element.tagName === 'INPUT' ||
      element.tagName === 'TEXTAREA' ||
      element.getAttribute('contenteditable') === 'true';

    if (!isInput) {
      return {
        isDone: false,
        success: false,
        error: 'Element is not an input field',
        extractedContent: null,
        includeInMemory: true,
        interactedElement: null,
      };
    }

    // Focus the element
    element.focus();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear existing value
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = '';
    } else {
      element.textContent = '';
    }

    // Type the text character by character (simulates human typing)
    for (const char of text) {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.value += char;
        // Trigger input event
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        element.textContent = (element.textContent || '') + char;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Trigger change event
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return {
      isDone: false,
      success: true,
      error: null,
      extractedContent: `Typed "${text}" into input field`,
      includeInMemory: true,
      interactedElement: {
        tagName: element.tagName.toLowerCase(),
        text: element.textContent?.trim() || '',
        attributes: Array.from(element.attributes).reduce(
          (acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          },
          {} as Record<string, string>,
        ),
        xpath: getXPath(element),
      },
    };
  } catch (error) {
    return {
      isDone: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractedContent: null,
      includeInMemory: true,
      interactedElement: null,
    };
  }
}

/**
 * Navigate to a URL
 * Uses extension if available, otherwise falls back to web-only behavior
 */
export async function navigateToUrl(url: string): Promise<ActionResult> {
  try {
    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return {
        isDone: false,
        success: false,
        error: `Invalid URL: ${url}`,
        extractedContent: null,
        includeInMemory: true,
        interactedElement: null,
      };
    }

    // Try to use extension if available
    const { extensionBridge } = await import('./extensionBridge');
    const isExtensionAvailable = await extensionBridge.isExtensionAvailable();

    if (isExtensionAvailable) {
      try {
        const response = await extensionBridge.sendMessage({
          action: 'navigate_to_url',
          data: { url },
        });

        if (response.success) {
          // Wait a bit for navigation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return {
            isDone: false,
            success: true,
            error: null,
            extractedContent: `Navigated to ${url} using extension`,
            includeInMemory: true,
            interactedElement: null,
          };
        } else {
          throw new Error(response.error || 'Navigation failed');
        }
      } catch (error) {
        console.warn('[WebBrowserActions] Extension navigation failed, falling back:', error);
        // Fall through to web-only behavior
      }
    }

    // Web-only fallback
    const currentOrigin = window.location.origin;
    const isExternal = targetUrl.origin !== currentOrigin;

    if (isExternal) {
      // For external URLs, open in a new tab
      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        return {
          isDone: false,
          success: false,
          error: 'Failed to open new tab. Please allow popups for this site or install the Chrome extension.',
          extractedContent: null,
          includeInMemory: true,
          interactedElement: null,
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        isDone: false,
        success: true,
        error: null,
        extractedContent: `Opened ${url} in a new tab. Please install the Chrome extension for full automation capabilities.`,
        includeInMemory: true,
        interactedElement: null,
      };
    } else {
      // For same-origin URLs, navigate in current window
      window.location.href = url;
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        isDone: false,
        success: true,
        error: null,
        extractedContent: `Navigated to ${url}`,
        includeInMemory: true,
        interactedElement: null,
      };
    }
  } catch (error) {
    return {
      isDone: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractedContent: null,
      includeInMemory: true,
      interactedElement: null,
    };
  }
}

/**
 * Extract text content from the page
 */
export async function extractContent(selector?: string): Promise<ActionResult> {
  try {
    let content = '';

    if (selector) {
      const element = document.querySelector(selector);
      content = element?.textContent?.trim() || '';
    } else {
      // Extract main content
      const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
      content = mainContent?.textContent?.trim() || '';
    }

    return {
      isDone: false,
      success: true,
      error: null,
      extractedContent: content.substring(0, 5000), // Limit content length
      includeInMemory: true,
      interactedElement: null,
    };
  } catch (error) {
    return {
      isDone: false,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      extractedContent: null,
      includeInMemory: true,
      interactedElement: null,
    };
  }
}

/**
 * Get current page state
 */
export function getPageState(): {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  domTree: string;
  clickableElements: Array<{
    index: number;
    text: string;
    tagName: string;
    xpath: string;
    ariaLabel?: string;
    placeholder?: string;
    name?: string;
    id?: string;
    type?: string;
  }>;
} {
  const clickableElements = getClickableElements();

  return {
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    domTree: document.documentElement.outerHTML.substring(0, 50000), // Limit DOM tree size
    clickableElements: clickableElements.map(el => ({
      index: el.index,
      text: el.text,
      tagName: el.tagName,
      xpath: el.xpath,
      ariaLabel: (el as any).ariaLabel || '',
      placeholder: (el as any).placeholder || '',
      name: (el as any).name || '',
      id: (el as any).id || '',
      type: (el as any).type || '',
    })),
  };
}
