/**
 * Playwright Test Script Generator
 * Converts navigator actions to Playwright test scripts
 */

import type { NavigatorStep } from './actionTracker';

export interface PlaywrightTestScript {
  name: string;
  description: string;
  prompt: string;
  steps: NavigatorStep[];
  playwrightCode: string;
}

/**
 * Convert navigator steps to Playwright test code
 */
export function generatePlaywrightCode(steps: NavigatorStep[], testName: string, baseUrl?: string): string {
  const lines: string[] = [];

  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push('');
  lines.push(`test('${testName}', async ({ page }) => {`);

  if (baseUrl) {
    lines.push(`  // Base URL: ${baseUrl}`);
  }
  lines.push('');

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const comment = `// Step ${i + 1}: ${step.action}`;

    switch (step.action) {
      case 'go_to_url':
        if (step.params.url) {
          lines.push(`  ${comment}`);
          lines.push(`  await page.goto('${step.params.url}');`);
          lines.push(`  await page.waitForLoadState('networkidle');`);
          lines.push('');
        }
        break;

      case 'click_element':
        const clickSelector = generatePlaywrightSelector(step.elementMetadata);
        if (clickSelector) {
          lines.push(`  ${comment}`);
          lines.push(`  await ${clickSelector}.click();`);
          lines.push(`  await page.waitForTimeout(500);`);
          lines.push('');
        } else if (step.params.xpath) {
          lines.push(`  ${comment}`);
          lines.push(`  await page.locator('xpath=${step.params.xpath}').click();`);
          lines.push(`  await page.waitForTimeout(500); // Wait for action to complete`);
          lines.push('');
        } else if (step.params.index !== undefined) {
          lines.push(`  ${comment}`);
          lines.push(`  // Click element at index ${step.params.index}`);
          lines.push(`  // Note: Index-based selection requires element identification`);
          lines.push(`  await page.waitForTimeout(500);`);
          lines.push('');
        }
        break;

      case 'input_text':
        const text = step.params.text || '';
        const safeText = text.replace(/'/g, "\\'");
        const inputSelector = generatePlaywrightSelector(step.elementMetadata);

        if (inputSelector) {
          lines.push(`  ${comment}`);
          lines.push(`  await ${inputSelector}.fill('${safeText}');`);
          lines.push(`  await page.waitForTimeout(300);`);
          lines.push('');
        } else if (step.params.xpath && step.params.text) {
          lines.push(`  ${comment}`);
          lines.push(`  await page.locator('xpath=${step.params.xpath}').fill('${safeText}');`);
          lines.push(`  await page.waitForTimeout(300);`);
          lines.push('');
        } else if (step.params.index !== undefined && step.params.text) {
          lines.push(`  ${comment}`);
          lines.push(`  await page.locator('xpath=${step.params.xpath}').fill('${safeText}');`);
          lines.push(`  await page.waitForTimeout(300);`);
          lines.push('');
        } else if (step.params.index !== undefined && step.params.text) {
          lines.push(`  ${comment}`);
          lines.push(`  // Input text at index ${step.params.index}`);
          lines.push(`  // Note: Index-based selection requires element identification`);
          lines.push(`  await page.waitForTimeout(300);`);
          lines.push('');
        }
        break;

      case 'done':
        if (step.params.text) {
          lines.push(`  ${comment}`);
          lines.push(`  // Task completed: ${step.params.text}`);
          lines.push('');
        }
        break;

      default:
        lines.push(`  ${comment}`);
        lines.push(`  // Action: ${step.action}`);
        if (Object.keys(step.params).length > 0) {
          lines.push(`  // Params: ${JSON.stringify(step.params)}`);
        }
        lines.push('');
    }
  }

  lines.push('  // Test assertions can be added here');
  lines.push('});');
  lines.push('');

  return lines.join('\n');
}

/**
 * Navigator Step interface
 */

/**
 * Generate the best Playwright selector based on element metadata
 * Priority: id > name > role+text > text > placeholder > type+name > xpath
 */
function generatePlaywrightSelector(elementMetadata?: NavigatorStep['elementMetadata']): string | null {
  if (!elementMetadata) return null;

  const { tagName, attributes, text, name, id, type, role, ariaLabel, placeholder, xpath } = elementMetadata;

  // Priority 1: Use id (most reliable)
  if (id) {
    return `page.locator('#${id.replace(/'/g, "\\'")}')`;
  }

  // Priority 2: Use name attribute (common for form inputs)
  if (name && (tagName === 'input' || tagName === 'textarea' || tagName === 'select')) {
    return `page.locator('input[name="${name.replace(/'/g, "\\'")}"], textarea[name="${name.replace(/'/g, "\\'")}"], select[name="${name.replace(/'/g, "\\'")}"]')`;
  }

  // Priority 3: Use role with accessible name (for buttons, links, etc.)
  if (role && (text || ariaLabel)) {
    const accessibleName = ariaLabel || text || '';
    if (accessibleName) {
      return `page.getByRole('${role}', { name: '${accessibleName.replace(/'/g, "\\'")}' })`;
    }
  }

  // Priority 4: Use text content for buttons and links
  if (text && (tagName === 'button' || tagName === 'a')) {
    const cleanText = text.trim().substring(0, 50); // Limit text length
    if (cleanText) {
      if (tagName === 'button') {
        return `page.getByRole('button', { name: '${cleanText.replace(/'/g, "\\'")}' })`;
      } else if (tagName === 'a') {
        return `page.getByRole('link', { name: '${cleanText.replace(/'/g, "\\'")}' })`;
      }
    }
  }

  // Priority 5: Use placeholder for input fields
  if (placeholder && tagName === 'input') {
    return `page.getByPlaceholder('${placeholder.replace(/'/g, "\\'")}')`;
  }

  // Priority 6: Use type + name for inputs
  if (type && name && tagName === 'input') {
    return `page.locator('input[type="${type}"][name="${name.replace(/'/g, "\\'")}"]')`;
  }

  // Priority 7: Use type alone for inputs
  if (type && tagName === 'input' && !name) {
    return `page.locator('input[type="${type}"]')`;
  }

  // Priority 8: Use aria-label
  if (ariaLabel) {
    return `page.locator('[aria-label="${ariaLabel.replace(/'/g, "\\'")}"]')`;
  }

  // Priority 9: Use xpath as fallback
  if (xpath) {
    return `page.locator('xpath=${xpath}')`;
  }

  // Priority 10: Use tagName with text if available
  if (tagName && text) {
    const cleanText = text.trim().substring(0, 50);
    if (cleanText) {
      return `page.locator('${tagName}').filter({ hasText: '${cleanText.replace(/'/g, "\\'")}' })`;
    }
  }

  return null;
}

/**
 * Generate a descriptive step name based on element metadata
 */
function generateStepName(action: string, elementMetadata?: NavigatorStep['elementMetadata'], text?: string): string {
  if (action === 'click_element') {
    if (elementMetadata?.text) {
      return `Click on ${elementMetadata.text.trim().substring(0, 30)}`;
    }
    if (elementMetadata?.ariaLabel) {
      return `Click on ${elementMetadata.ariaLabel.trim().substring(0, 30)}`;
    }
    if (elementMetadata?.role) {
      return `Click on ${elementMetadata.role}`;
    }
    return 'Click on element';
  }

  if (action === 'input_text') {
    if (elementMetadata?.name) {
      return `Fill ${elementMetadata.name} field`;
    }
    if (elementMetadata?.placeholder) {
      return `Fill ${elementMetadata.placeholder} field`;
    }
    if (elementMetadata?.ariaLabel) {
      return `Fill ${elementMetadata.ariaLabel} field`;
    }
    if (text) {
      return `Enter text: ${text.substring(0, 20)}`;
    }
    return 'Enter text';
  }

  return action;
}

/**
 * Generate a more detailed Playwright script with better selectors
 */
export function generateDetailedPlaywrightCode(steps: NavigatorStep[], testName: string, baseUrl?: string): string {
  console.log('[PlaywrightGenerator] Generating code for', steps.length, 'steps');
  console.log('[PlaywrightGenerator] Test name:', testName);
  console.log('[PlaywrightGenerator] Base URL:', baseUrl);
  const lines: string[] = [];

  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push(`import * as allure from 'allure-js-commons';`);
  lines.push('');
  // Sanitize test name for describe block
  const sanitizedTestName = testName.replace(/[^a-zA-Z0-9\s-]/g, '').trim() || 'test';
  lines.push(`test.describe('${sanitizedTestName}', async () => {`);
  lines.push(`  test.beforeEach(async () => {`);
  lines.push(`    await allure.tag('ui-test');`);
  lines.push(`  });`);
  lines.push('');
  // Generate a descriptive test name from steps
  let testDescription = 'Complete automation flow';
  if (steps.length > 0) {
    const firstUrlStep = steps.find(s => s.action === 'go_to_url' && s.params.url);
    if (firstUrlStep?.params.url) {
      const url = firstUrlStep.params.url;
      if (url.includes('register') || url.includes('signup')) {
        testDescription = 'Complete registration and login flow';
      } else if (url.includes('login') || url.includes('signin')) {
        testDescription = 'Complete login flow';
      } else {
        testDescription = 'Navigate and interact with page';
      }
    }
  }
  lines.push(`  test('${testDescription}', async ({ page }) => {`);
  lines.push('');

  lines.push(`    const baseUrl = process.env.BASE_URL || '${baseUrl || 'https://example.com'}';`);
  lines.push('');

  lines.push(`    try {`);
  lines.push('');

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepComment = `// Step ${i + 1}: ${step.action}`;

    switch (step.action) {
      case 'go_to_url':
        if (step.params.url) {
          lines.push(`      ${stepComment}`);
          lines.push(`      console.log('Navigating to ${step.params.url}');`);
          lines.push(`      await page.goto('${step.params.url}');`);
          lines.push(`      await page.waitForLoadState('networkidle');`);
          lines.push('');
          lines.push(`      // Verify we're on the correct page`);
          lines.push(`      await expect(page).toHaveTitle(/.*/);`);
          lines.push(`      console.log('Successfully loaded page');`);
          lines.push('');
        }
        break;

      case 'click_element': {
        const selector =
          generatePlaywrightSelector(step.elementMetadata) ||
          (step.params.xpath ? `page.locator('xpath=${step.params.xpath}')` : null);
        const stepName = generateStepName('click_element', step.elementMetadata);

        if (selector) {
          lines.push(`      ${stepComment}`);
          lines.push(`      await test.step('${stepName}', async () => {`);
          lines.push(`        const clickableElement = ${selector};`);
          lines.push(`        await clickableElement.waitFor({ state: 'visible', timeout: 15000 });`);
          lines.push(`        await clickableElement.click();`);
          lines.push(`        await page.waitForLoadState('networkidle');`);
          lines.push(`      });`);
          lines.push('');
        } else if (step.params.index !== undefined) {
          // Fallback: try to generate from available info
          const fallbackSelector = step.params.xpath ? `page.locator('xpath=${step.params.xpath}')` : null;

          if (fallbackSelector) {
            lines.push(`      ${stepComment}`);
            lines.push(`      await test.step('${stepName}', async () => {`);
            lines.push(`        const clickableElement = ${fallbackSelector};`);
            lines.push(`        await clickableElement.waitFor({ state: 'visible', timeout: 15000 });`);
            lines.push(`        await clickableElement.click();`);
            lines.push(`        await page.waitForLoadState('networkidle');`);
            lines.push(`      });`);
            lines.push('');
          } else {
            lines.push(`      ${stepComment}`);
            lines.push(`      await test.step('${stepName}', async () => {`);
            lines.push(`        // Click element at index ${step.params.index}`);
            lines.push(`        // TODO: Replace with specific selector based on your page structure`);
            lines.push(`        await page.waitForTimeout(500);`);
            lines.push(`      });`);
            lines.push('');
          }
        }
        break;
      }

      case 'input_text': {
        if (!step.params.text) break;

        const escapedText = step.params.text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
        const selector =
          generatePlaywrightSelector(step.elementMetadata) ||
          (step.params.xpath ? `page.locator('xpath=${step.params.xpath}')` : null);
        const stepName = generateStepName('input_text', step.elementMetadata, step.params.text);

        if (selector) {
          lines.push(`      ${stepComment}`);
          lines.push(`      await test.step('${stepName}', async () => {`);
          lines.push(`        const inputField = ${selector};`);
          lines.push(`        await inputField.waitFor({ state: 'visible', timeout: 15000 });`);
          lines.push(`        await inputField.fill('${escapedText}');`);

          // Add verification for important fields
          if (step.elementMetadata?.name || step.elementMetadata?.placeholder) {
            lines.push(`        await expect(inputField).toHaveValue('${escapedText}');`);
          }
          lines.push(`      });`);
          lines.push('');
        } else if (step.params.index !== undefined) {
          // Fallback: try to generate from available info
          const fallbackSelector = step.params.xpath ? `page.locator('xpath=${step.params.xpath}')` : null;

          if (fallbackSelector) {
            lines.push(`      ${stepComment}`);
            lines.push(`      await test.step('${stepName}', async () => {`);
            lines.push(`        const inputField = ${fallbackSelector};`);
            lines.push(`        await inputField.waitFor({ state: 'visible', timeout: 15000 });`);
            lines.push(`        await inputField.fill('${escapedText}');`);
            lines.push(`      });`);
            lines.push('');
          } else {
            lines.push(`      ${stepComment}`);
            lines.push(`      await test.step('${stepName}', async () => {`);
            lines.push(`        // Input text at index ${step.params.index}`);
            lines.push(`        // TODO: Replace with specific selector based on your page structure`);
            lines.push(`        await page.waitForTimeout(300);`);
            lines.push(`      });`);
            lines.push('');
          }
        }
        break;
      }

      case 'done':
        if (step.params.text) {
          lines.push(`      ${stepComment}`);
          lines.push(`      // Task completed: ${step.params.text}`);
          lines.push(`      // Add assertions here if needed`);
          lines.push('');
        }
        break;

      default:
        lines.push(`      ${stepComment}`);
        lines.push(`      // Action: ${step.action}`);
        if (Object.keys(step.params).length > 0) {
          lines.push(`      // Params: ${JSON.stringify(step.params)}`);
        }
        lines.push('');
    }
  }

  lines.push('    } catch (error) {');
  lines.push('      throw error;');
  lines.push('    }');
  lines.push('  });');
  lines.push('});');
  lines.push('');

  return lines.join('\n');
}
