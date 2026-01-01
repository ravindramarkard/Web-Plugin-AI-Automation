/**
 * Web-compatible Navigator Agent
 * Simplified implementation that works directly in the browser using DOM APIs
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage } from '@langchain/core/messages';
import type { AgentContext } from './webAgentTypes';
import { ExecutionState, Actors } from './webAgentTypes';
import type { Action } from './webAction';

export interface NavigatorResult {
  isDone: boolean;
  extractedContent?: string;
}

export class WebNavigator {
  private chatLLM: BaseChatModel;
  private context: AgentContext;
  private actions: Action[];
  private actionRegistry: Map<string, Action>;

  constructor(chatLLM: BaseChatModel, context: AgentContext, actions: Action[]) {
    this.chatLLM = chatLLM;
    this.context = context;
    this.actions = actions;
    this.actionRegistry = new Map();
    actions.forEach(action => {
      this.actionRegistry.set(action.name(), action);
    });
  }

  async execute(): Promise<{ result: NavigatorResult | null; error?: string }> {
    try {
      await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.STEP_START, 'Navigating...');

      // Get current page state
      const pageState = await this.context.browserContext.getCachedState();

      // Get messages
      const messages = this.context.messageManager.getMessages();

      // Format clickable elements for the prompt with detailed information
      const clickableElementsText = (pageState.clickableElements || [])
        .map((el: any) => {
          const details: string[] = [];
          if (el.text) details.push(`text: "${el.text}"`);
          if (el.ariaLabel) details.push(`aria-label: "${el.ariaLabel}"`);
          if (el.placeholder) details.push(`placeholder: "${el.placeholder}"`);
          if (el.name) details.push(`name: "${el.name}"`);
          if (el.id) details.push(`id: "${el.id}"`);
          if (el.type) details.push(`type: "${el.type}"`);
          const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
          return `[${el.index}]<${el.tagName}>${el.text || el.ariaLabel || el.placeholder || 'element'}${detailsStr}</${el.tagName}>`;
        })
        .join('\n');

      // Add current state to messages
      const stateMessage = new SystemMessage(
        `Current page state:
URL: ${pageState.url}
Title: ${pageState.title}

AVAILABLE INTERACTIVE ELEMENTS (you can interact with these):
${clickableElementsText || 'No clickable elements found'}

INSTRUCTIONS:
- You are running DIRECTLY in the browser and CAN interact with this page
- Each element has an INDEX (the number in brackets like [0], [1], [2]) - use this index to interact with it
- You can see the element's tag name, text content, and XPath
- To click an element, use click_element with its index
- To type into an input, use input_text with the element's index and the text to type
- You can verify field names by looking at the element's text, aria-label, or other attributes shown above
- The page content is visible to you through these elements - use them to complete the task`,
      );
      const navigatorMessages = [...messages, stateMessage];

      // Create action schema for structured output
      // Support multiple actions per step (like the Chrome extension)
      const { z } = await import('zod');
      const actionSchema = z.object({
        actions: z
          .array(
            z.object({
              action: z.enum(['click_element', 'input_text', 'go_to_url', 'done']).describe('The action to perform'),
              index: z.number().optional().describe('Index of the element (for click_element or input_text)'),
              xpath: z.string().optional().describe('XPath of the element (alternative to index)'),
              text: z.string().optional().describe('Text to input (for input_text) or completion message (for done)'),
              url: z.string().optional().describe('URL to navigate to (for go_to_url)'),
              success: z.boolean().optional().describe('Success status (for done action)'),
            }),
          )
          .describe('List of actions to execute in sequence'),
      });

      // Use structured output to get action from LLM
      const structuredLlm = this.chatLLM.withStructuredOutput(actionSchema, {
        includeRaw: true,
        name: 'navigator_output',
      });

      const response = await structuredLlm.invoke(navigatorMessages, {
        signal: this.context.controller.signal,
      });

      if (
        response.parsed &&
        response.parsed.actions &&
        Array.isArray(response.parsed.actions) &&
        response.parsed.actions.length > 0
      ) {
        // Execute multiple actions in sequence (like the Chrome extension)
        let lastResult: any = null;
        let isDone = false;

        for (const actionData of response.parsed.actions) {
          const actionName = actionData.action;
          const actionInput: any = {
            ...(actionData.index !== undefined && { index: actionData.index }),
            ...(actionData.xpath && { xpath: actionData.xpath }),
            ...(actionData.text && { text: actionData.text }),
            ...(actionData.url && { url: actionData.url }),
            ...(actionData.success !== undefined && { success: actionData.success }),
          };

          const action = this.actionRegistry.get(actionName);

          console.log(`[WebNavigator] Executing action: ${actionName}`, actionInput);

          if (action) {
            // Execute the action - this will emit ACT_START and ACT_OK events
            const result = await action.call(actionInput);

            console.log(`[WebNavigator] Action result:`, result);

            // Add action result to message history
            this.context.messageManager.addActionResult(result);

            lastResult = result;

            if (result.isDone) {
              isDone = true;
              // Task is done, emit final event
              await this.context.emitEvent(
                Actors.NAVIGATOR,
                ExecutionState.STEP_OK,
                result.extractedContent || 'Task completed',
              );
              break; // Stop executing remaining actions if task is done
            }

            // Small delay between actions to allow DOM updates
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.error(
              `[WebNavigator] Unknown action: ${actionName}. Available actions:`,
              Array.from(this.actionRegistry.keys()),
            );
            // Continue with next action instead of throwing
          }
        }

        if (isDone && lastResult) {
          return { result: { isDone: true, extractedContent: lastResult.extractedContent || '' } };
        }

        // Return the last action's result
        return { result: { isDone: false, extractedContent: lastResult?.extractedContent || 'Actions executed' } };
      }

      throw new Error('Failed to parse navigator output');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.STEP_FAIL, `Navigation failed: ${errorMessage}`);
      return { result: null, error: errorMessage };
    }
  }
}
