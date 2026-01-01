/**
 * Web-compatible Planner Agent
 * Simplified implementation that works directly in the browser
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { AgentContext } from './webAgentTypes';
import { ExecutionState, Actors } from './webAgentTypes';

// Planner output schema with more lenient validation
const plannerOutputSchema = z.object({
  observation: z.string().default(''),
  challenges: z.string().default(''),
  done: z
    .union([
      z.boolean(),
      z.string().transform(val => val.toLowerCase() === 'true'),
      z.number().transform(val => val === 1 || val === 1.0),
    ])
    .default(false),
  next_steps: z
    .union([
      z.string(),
      z.array(z.string()).transform(arr => arr.join('\n')),
      z.array(z.unknown()).transform(arr => arr.map(String).join('\n')),
      z.null().transform(() => ''),
      z.undefined().transform(() => ''),
    ])
    .default(''),
  final_answer: z.preprocess(val => (val === undefined || val === null ? '' : val), z.string()).default(''),
  reasoning: z.string().default(''),
  web_task: z
    .union([
      z.boolean(),
      z.string().transform(val => val.toLowerCase() === 'true'),
      z.number().transform(val => val === 1 || val === 1.0),
    ])
    .default(true),
});

type PlannerOutput = z.infer<typeof plannerOutputSchema>;

// Planner system prompt
const PLANNER_SYSTEM_PROMPT = `You are a helpful assistant. You are good at answering general questions and helping users break down web browsing tasks into smaller steps.

# RESPONSIBILITIES:
1. Judge whether web navigation is required to complete the task or not and set the "web_task" field.
2. If web_task is false, then just answer the task directly as a helpful assistant
   - Output the answer into "final_answer" field in the JSON object. 
   - Set "done" field to true
3. If web_task is true, break down the task into smaller steps
   - Output the steps into "next_steps" field
   - Set "done" field to false
4. Provide your observation and reasoning

Return a JSON object with: observation, challenges, done, next_steps, final_answer, reasoning, web_task`;

export class WebPlanner {
  private chatLLM: BaseChatModel;
  private context: AgentContext;

  constructor(chatLLM: BaseChatModel, context: AgentContext) {
    this.chatLLM = chatLLM;
    this.context = context;
  }

  async execute(): Promise<{ result: PlannerOutput | null; error?: string }> {
    try {
      await this.context.emitEvent(Actors.PLANNER, ExecutionState.STEP_START, 'Planning...');

      // Get messages from message manager
      const messages = this.context.messageManager.getMessages();
      const plannerMessages = [new SystemMessage(PLANNER_SYSTEM_PROMPT), ...messages.slice(1)];

      // Use structured output
      const structuredLlm = this.chatLLM.withStructuredOutput(plannerOutputSchema, {
        includeRaw: true,
        name: 'planner_output',
        method: 'json_schema', // Use JSON schema mode for better compatibility
      });

      let response;
      try {
        response = await structuredLlm.invoke(plannerMessages, {
          signal: this.context.controller.signal,
        });
      } catch (error) {
        // If structured output fails, try to extract JSON from raw response
        console.error('[WebPlanner] Structured output failed:', error);
        throw error;
      }

      if (response.parsed) {
        const plan = response.parsed;

        // Emit event with plan output
        const eventMessage = plan.done ? plan.final_answer : plan.next_steps;
        await this.context.emitEvent(Actors.PLANNER, ExecutionState.STEP_OK, String(eventMessage));

        // Add plan to message history
        this.context.messageManager.addPlan(JSON.stringify(plan), messages.length);

        return { result: plan };
      }

      // If we have raw response but no parsed, try to parse it manually
      if (response.raw) {
        console.warn('[WebPlanner] Got raw response but no parsed, attempting manual parse');
        try {
          let rawContent = '';
          if (typeof response.raw === 'string') {
            rawContent = response.raw;
          } else if (response.raw.content) {
            rawContent =
              typeof response.raw.content === 'string' ? response.raw.content : JSON.stringify(response.raw.content);
          } else {
            rawContent = JSON.stringify(response.raw);
          }

          // Try to extract JSON from markdown code blocks
          const jsonMatch = rawContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;

          const parsed = JSON.parse(jsonStr);
          const validated = plannerOutputSchema.parse(parsed);

          const eventMessage = validated.done ? validated.final_answer : validated.next_steps;
          await this.context.emitEvent(Actors.PLANNER, ExecutionState.STEP_OK, String(eventMessage));
          this.context.messageManager.addPlan(JSON.stringify(validated), messages.length);

          return { result: validated };
        } catch (parseError) {
          console.error('[WebPlanner] Manual parse failed:', parseError);
          throw new Error(
            `Failed to parse planner output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          );
        }
      }

      throw new Error('Failed to parse planner output - no parsed or raw response');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.context.emitEvent(Actors.PLANNER, ExecutionState.STEP_FAIL, `Planning failed: ${errorMessage}`);
      return { result: null, error: errorMessage };
    }
  }

  /**
   * Generate Playwright test code based on tracked actions
   * This is called at the end of task completion to produce a Playwright script
   */
  async generatePlaywrightCode(
    steps: Array<{
      action: string;
      params: Record<string, any>;
      elementMetadata?: {
        tagName?: string;
        attributes?: Record<string, string>;
        text?: string;
        name?: string;
        id?: string;
        type?: string;
        role?: string;
        ariaLabel?: string;
        placeholder?: string;
        xpath?: string;
      };
    }>,
    testName: string,
    baseUrl?: string,
  ): Promise<{ code: string; error?: string }> {
    try {
      console.log('[WebPlanner] Generating Playwright code for', steps.length, 'steps');

      // Build a prompt for the planner to generate Playwright code
      const stepsDescription = steps
        .map((step, idx) => {
          const stepInfo = `Step ${idx + 1}: ${step.action}`;
          const params = Object.entries(step.params)
            .filter(([key]) => key !== 'index') // Exclude index from params to discourage its use
            .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
            .join(', ');

          // Emphasize element metadata for proper selector generation
          const metadata = step.elementMetadata
            ? `\n  ELEMENT METADATA (USE THESE FOR SELECTORS - DO NOT USE INDEX):` +
              `\n    - tagName: ${step.elementMetadata.tagName || 'unknown'}` +
              `\n    - id: ${step.elementMetadata.id || 'none'} ${step.elementMetadata.id ? '← USE THIS FIRST' : ''}` +
              `\n    - name: ${step.elementMetadata.name || 'none'} ${step.elementMetadata.name ? '← USE THIS FOR INPUTS' : ''}` +
              `\n    - class: ${step.elementMetadata.attributes?.class || 'none'} ${step.elementMetadata.attributes?.class ? '← USE IF UNIQUE' : ''}` +
              `\n    - type: ${step.elementMetadata.type || 'none'}` +
              `\n    - role: ${step.elementMetadata.role || 'none'} ${step.elementMetadata.role ? '← USE WITH getByRole()' : ''}` +
              `\n    - ariaLabel: ${step.elementMetadata.ariaLabel || 'none'} ${step.elementMetadata.ariaLabel ? '← USE WITH getByRole()' : ''}` +
              `\n    - placeholder: ${step.elementMetadata.placeholder || 'none'} ${step.elementMetadata.placeholder ? '← USE getByPlaceholder()' : ''}` +
              `\n    - text: ${step.elementMetadata.text?.substring(0, 100) || 'none'} ${step.elementMetadata.text ? '← USE WITH getByRole()' : ''}` +
              `\n    - xpath: ${step.elementMetadata.xpath || 'none'} ${step.elementMetadata.xpath && !step.elementMetadata.id && !step.elementMetadata.name ? '← USE AS LAST RESORT' : ''}` +
              `\n  ⚠️ DO NOT USE INDEX: ${step.params.index !== undefined ? step.params.index : 'N/A'} (index is unreliable and should NOT be used in generated code)`
            : step.params.index !== undefined
              ? `\n  ⚠️ WARNING: Only index available (${step.params.index}) - try to infer selector from context or use xpath if available`
              : '';
          return `${stepInfo}\n  Params: ${params}${metadata}`;
        })
        .join('\n\n');

      const playwrightPrompt = `You are a Playwright test automation expert. Generate a complete, production-ready Playwright test script based on the following automation steps.

Task: ${testName}
Base URL: ${baseUrl || 'Not specified'}

Automation Steps:
${stepsDescription}

CRITICAL REQUIREMENTS:
1. Generate a complete Playwright test script using @playwright/test
2. **NEVER use index-based element selection** (e.g., "element at index 15", "clickableElements[15]", "elements[14]", ".nth(15)", "all()[15]")
3. **ALWAYS use proper selectors in this priority order:**
   - **id** (most reliable): page.locator('#elementId') or page.getByTestId('testId')
   - **name attribute**: page.locator('input[name="fieldName"]') or page.getByRole('textbox', { name: 'Field Label' })
   - **role + accessible name**: page.getByRole('button', { name: 'Submit' })
   - **placeholder**: page.getByPlaceholder('Enter username')
   - **class** (if unique and stable): page.locator('.unique-class-name')
   - **xpath** (last resort, only if no other selector available): page.locator('xpath=//button[@id="submit"]')
4. For each element, use the BEST available selector from the element metadata provided
5. If element metadata shows id, name, class, or xpath, use those instead of index
6. Include proper waits: await element.waitFor({ state: 'visible', timeout: 15000 })
7. Use test.step() for each action with descriptive names
8. Include error handling with try-catch
9. Use allure-js-commons for reporting (import * as allure from 'allure-js-commons')
10. Make the code production-ready and maintainable
11. Include console.log statements for debugging
12. Add proper comments explaining each step
13. Use page.waitForLoadState('networkidle') after navigation
14. Add assertions to verify actions succeeded

EXAMPLE OF GOOD SELECTOR USAGE:
- If element has id="registerBtn": page.locator('#registerBtn')
- If element has name="firstName": page.locator('input[name="firstName"]')
- If element has role="button" and text="Register": page.getByRole('button', { name: 'Register' })
- If element has placeholder="Enter email": page.getByPlaceholder('Enter email')

EXAMPLE OF BAD SELECTOR USAGE (DO NOT USE):
- const elements = await page.locator('a, button').all(); const target = elements[15]; // WRONG!
- clickableElements[14].click(); // WRONG!
- "element at index 15" // WRONG!
- await page.locator('a, button').nth(15).click(); // WRONG!
- const allElements = await page.locator('a, button').all(); if (allElements.length > 15) { await allElements[15].click(); } // WRONG!
- await page.locator('a, button').filter((_, i) => i === 15).click(); // WRONG!

Return ONLY the complete Playwright test code as a code block, starting with the imports and ending with the closing braces. Do not include any explanations outside the code.`;

      const messages = [
        new SystemMessage(
          'You are an expert Playwright test automation engineer. Generate production-ready Playwright test scripts based on automation steps.',
        ),
        new HumanMessage(playwrightPrompt),
      ];

      const response = await this.chatLLM.invoke(messages, {
        signal: this.context.controller.signal,
      });

      let playwrightCode = '';
      if (typeof response.content === 'string') {
        playwrightCode = response.content;
      } else if (Array.isArray(response.content)) {
        playwrightCode = response.content.map(c => (typeof c === 'string' ? c : c.text || '')).join('');
      } else {
        playwrightCode = JSON.stringify(response.content);
      }

      // Extract code from markdown code blocks if present
      const codeBlockMatch = playwrightCode.match(/```(?:typescript|javascript|ts|js)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        playwrightCode = codeBlockMatch[1].trim();
      }

      // If no code was generated, fall back to the generator function
      if (!playwrightCode || playwrightCode.length < 100) {
        console.warn('[WebPlanner] LLM did not generate valid code, falling back to generator');
        const { generateDetailedPlaywrightCode } = await import('./playwrightGenerator');
        playwrightCode = generateDetailedPlaywrightCode(steps, testName, baseUrl);
      }

      console.log('[WebPlanner] Generated Playwright code, length:', playwrightCode.length);
      return { code: playwrightCode };
    } catch (error) {
      console.error('[WebPlanner] Error generating Playwright code:', error);
      // Fall back to the generator function
      try {
        const { generateDetailedPlaywrightCode } = await import('./playwrightGenerator');
        const playwrightCode = generateDetailedPlaywrightCode(steps, testName, baseUrl);
        return { code: playwrightCode };
      } catch (fallbackError) {
        return {
          code: '',
          error: error instanceof Error ? error.message : 'Failed to generate Playwright code',
        };
      }
    }
  }
}
