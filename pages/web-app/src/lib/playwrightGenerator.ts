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
        if (step.params.xpath) {
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
        if (step.params.xpath && step.params.text) {
          lines.push(`  ${comment}`);
          lines.push(
            `  await page.locator('xpath=${step.params.xpath}').fill('${step.params.text.replace(/'/g, "\\'")}');`,
          );
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
export interface NavigatorStep {
  action: string;
  params: Record<string, any>;
  timestamp: number;
  success: boolean;
  error?: string;
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
  lines.push(`import { allure } from 'allure-playwright';`);
  lines.push('');
  lines.push(`test.describe('${testName}', () => {`);
  lines.push(`  test.beforeEach(async () => {`);
  lines.push(`    await allure.tag('ui-test');`);
  lines.push(`  });`);
  lines.push('');
  lines.push(`  test('Navigate to profile page through login and case selection', async ({ page }) => {`);
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
          lines.push(`      await test.step('Navigate to base URL', async () => {`);
          lines.push(`        await page.goto(baseUrl, { waitUntil: 'networkidle' });`);
          lines.push(`        await page.waitForLoadState('networkidle');`);
          lines.push(`      });`);
          lines.push('');
        }
        break;

      case 'click_element':
        if (step.params.xpath) {
          lines.push(`      ${stepComment}`);
          lines.push(`      await test.step('Click on element', async () => {`);
          lines.push(`        const clickableElement = page.locator('xpath=${step.params.xpath}');`);
          lines.push(`        await clickableElement.waitFor({ state: 'visible', timeout: 15000 });`);
          lines.push(`        await clickableElement.click();`);
          lines.push(`        await page.waitForLoadState('networkidle');`);
          lines.push(`      });`);
          lines.push('');
        } else if (step.params.index !== undefined) {
          lines.push(`      ${stepComment}`);
          lines.push(`      await test.step('Click on element', async () => {`);
          lines.push(`        // Click element at index ${step.params.index}`);
          lines.push(`        // TODO: Replace with specific selector based on your page structure`);
          lines.push(`        await page.waitForTimeout(500);`);
          lines.push(`      });`);
          lines.push('');
        }
        break;

      case 'input_text':
        if (step.params.xpath && step.params.text) {
          const escapedText = step.params.text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
          // Try to use better selectors (placeholder, role, etc.) if available
          const usePlaceholder = step.params.xpath.includes('placeholder') || step.params.xpath.includes('input');
          const stepName = step.params.xpath.toLowerCase().includes('password')
            ? 'Enter password'
            : step.params.xpath.toLowerCase().includes('username') || step.params.xpath.toLowerCase().includes('email')
              ? 'Enter username'
              : 'Enter text';

          lines.push(`      ${stepComment}`);
          lines.push(`      await test.step('${stepName}', async () => {`);
          if (usePlaceholder && step.params.text.length < 50) {
            // Try to extract placeholder from xpath or use getByPlaceholder
            lines.push(`        const inputField = page.locator('xpath=${step.params.xpath}');`);
            lines.push(`        await inputField.waitFor({ state: 'visible', timeout: 15000 });`);
            lines.push(`        await inputField.fill('${escapedText}');`);
            lines.push(`        await expect(inputField).toHaveValue('${escapedText}');`);
          } else {
            lines.push(`        const inputField = page.locator('xpath=${step.params.xpath}');`);
            lines.push(`        await inputField.waitFor({ state: 'visible', timeout: 15000 });`);
            lines.push(`        await inputField.fill('${escapedText}');`);
          }
          lines.push(`      });`);
          lines.push('');
        } else if (step.params.index !== undefined && step.params.text) {
          const escapedText = step.params.text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
          lines.push(`      ${stepComment}`);
          lines.push(`      await test.step('Enter text', async () => {`);
          lines.push(`        // Input text at index ${step.params.index}`);
          lines.push(`        // TODO: Replace with specific selector based on your page structure`);
          lines.push(`        await page.waitForTimeout(300);`);
          lines.push(`      });`);
          lines.push('');
        }
        break;

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
