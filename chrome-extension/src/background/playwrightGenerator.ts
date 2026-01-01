/**
 * Playwright Test Script Generator for Extension
 * Converts executor history to Playwright test scripts
 */

import type { AgentContext } from './agent/types';

export interface NavigatorStep {
  action: string;
  params: Record<string, any>;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * Extract navigator steps from executor context
 */
export function extractStepsFromContext(context: AgentContext, task: string): NavigatorStep[] {
  const steps: NavigatorStep[] = [];

  try {
    const history = context.history.history;

    // Extract base URL from task
    const urlMatch = task.match(/(https?:\/\/[^\s]+)/);
    const baseUrl = urlMatch ? urlMatch[1] : '';

    // Process each step in history
    for (const record of history) {
      if (!record.modelOutput || !record.actionResults) continue;

      try {
        // Parse model output to get actions
        const modelOutput = JSON.parse(record.modelOutput);
        const actions = modelOutput.action || [];

        // Process each action
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          const actionResult = record.actionResults[i];

          if (!action || !actionResult) continue;

          const step: NavigatorStep = {
            action: action.name || 'unknown',
            params: action.input || {},
            timestamp: Date.now(),
            success: actionResult.success !== false,
            error: actionResult.error,
          };

          steps.push(step);
        }
      } catch (parseError) {
        // If we can't parse, try to extract from action results
        for (const result of record.actionResults) {
          if (result.extractedContent) {
            const content = result.extractedContent;

            // Try to infer action from content
            if (content.includes('Navigating to') || content.includes('go to')) {
              const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
              if (urlMatch) {
                steps.push({
                  action: 'go_to_url',
                  params: { url: urlMatch[1] },
                  timestamp: Date.now(),
                  success: result.success !== false,
                  error: result.error,
                });
              }
            } else if (content.includes('Clicking') || content.includes('Click')) {
              steps.push({
                action: 'click_element',
                params: {},
                timestamp: Date.now(),
                success: result.success !== false,
                error: result.error,
              });
            } else if (content.includes('Typing') || content.includes('Input')) {
              steps.push({
                action: 'input_text',
                params: {},
                timestamp: Date.now(),
                success: result.success !== false,
                error: result.error,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[PlaywrightGenerator] Failed to extract steps:', error);
  }

  return steps;
}

/**
 * Extract navigator steps from executor (wrapper for context)
 */
export function extractStepsFromExecutor(executor: any): NavigatorStep[] {
  try {
    const context = executor.context;
    const task = executor.tasks?.[0] || '';
    return extractStepsFromContext(context, task);
  } catch (error) {
    console.error('[PlaywrightGenerator] Failed to extract from executor:', error);
    return [];
  }
}

/**
 * Generate Playwright TypeScript code from steps
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
    const comment = `  // Step ${i + 1}: ${step.action}`;

    switch (step.action) {
      case 'go_to_url':
        if (step.params.url) {
          lines.push(comment);
          lines.push(`  await page.goto('${step.params.url}');`);
          lines.push(`  await page.waitForLoadState('networkidle');`);
          lines.push('');
        }
        break;

      case 'click_element':
        if (step.params.xpath) {
          lines.push(comment);
          lines.push(`  await page.locator('xpath=${step.params.xpath}').click();`);
          lines.push(`  await page.waitForTimeout(500);`);
          lines.push('');
        } else if (step.params.index !== undefined) {
          lines.push(comment);
          lines.push(`  // Click element at index ${step.params.index}`);
          lines.push(
            `  const clickableElements = await page.locator('a, button, input, select, [role="button"], [role="link"]').all();`,
          );
          lines.push(`  if (clickableElements[${step.params.index}]) {`);
          lines.push(`    await clickableElements[${step.params.index}].click();`);
          lines.push(`  }`);
          lines.push(`  await page.waitForTimeout(500);`);
          lines.push('');
        }
        break;

      case 'input_text':
        if (step.params.xpath && step.params.text) {
          lines.push(comment);
          const escapedText = step.params.text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
          lines.push(`  await page.locator('xpath=${step.params.xpath}').fill('${escapedText}');`);
          lines.push(`  await page.waitForTimeout(300);`);
          lines.push('');
        } else if (step.params.index !== undefined && step.params.text) {
          lines.push(comment);
          const escapedText = step.params.text.replace(/'/g, "\\'").replace(/\n/g, '\\n');
          lines.push(`  const inputElements = await page.locator('input, textarea').all();`);
          lines.push(`  if (inputElements[${step.params.index}]) {`);
          lines.push(`    await inputElements[${step.params.index}].fill('${escapedText}');`);
          lines.push(`  }`);
          lines.push(`  await page.waitForTimeout(300);`);
          lines.push('');
        }
        break;

      case 'done':
        if (step.params.text) {
          lines.push(comment);
          lines.push(`  // Task completed: ${step.params.text}`);
          lines.push('');
        }
        break;

      default:
        lines.push(comment);
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
