/**
 * Web-compatible Action Builder
 * Creates actions that work directly in the browser using DOM APIs
 */

import { z } from 'zod';
import { clickElement, typeText, navigateToUrl } from './webBrowserActions';
import { Action } from './webAction';
import {
  doneActionSchema,
  goToUrlActionSchema,
  clickElementActionSchema,
  inputTextActionSchema,
} from './webActionSchemas';
import { ExecutionState, Actors, type ActionResult } from './webAgentTypes';

export class WebActionBuilder {
  private readonly context: any;

  constructor(context: any) {
    this.context = context;
  }

  async buildDefaultActions(): Promise<Action[]> {
    const actions: Action[] = [];

    // Done action
    const done = new Action(async (input: z.infer<typeof doneActionSchema.schema>) => {
      await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, doneActionSchema.name);
      await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, input.text);

      // Track action for Playwright generation
      const { actionTracker } = await import('./actionTracker');
      actionTracker.addStep('done', { text: input.text, success: input.success }, input.success);

      return {
        isDone: true,
        success: true,
        extractedContent: input.text,
        error: null,
        includeInMemory: true,
        interactedElement: null,
      } as ActionResult;
    }, doneActionSchema);
    actions.push(done);

    // Go to URL action
    const goToUrl = new Action(async (input: z.infer<typeof goToUrlActionSchema.schema>) => {
      await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_START, `Navigating to ${input.url}`);
      const result = await navigateToUrl(input.url);
      await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, result.extractedContent || '');

      // Track action for Playwright generation
      const { actionTracker } = await import('./actionTracker');
      actionTracker.addStep('go_to_url', { url: input.url }, result.success, result.error || undefined);

      return result;
    }, goToUrlActionSchema);
    actions.push(goToUrl);

    // Click element action
    const click = new Action(
      async (input: z.infer<typeof clickElementActionSchema.schema>) => {
        await this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          `Clicking element ${input.index || input.xpath}`,
        );
        const result = await clickElement(input.index, input.xpath);
        await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, result.extractedContent || '');

        // Track action for Playwright generation
        const { actionTracker } = await import('./actionTracker');
        const params: Record<string, any> = {};
        if (input.index !== undefined) params.index = input.index;
        if (input.xpath) params.xpath = input.xpath;
        if (result.interactedElement?.xpath) params.xpath = result.interactedElement.xpath;
        actionTracker.addStep('click_element', params, result.success, result.error || undefined);

        return result;
      },
      clickElementActionSchema,
      true, // hasIndex
    );
    actions.push(click);

    // Input text action
    const inputTextAction = new Action(
      async (input: z.infer<typeof inputTextActionSchema.schema>) => {
        await this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_START,
          `Typing text into element ${input.index || input.xpath}`,
        );
        const result = await typeText(input.text, input.index, input.xpath);
        await this.context.emitEvent(Actors.NAVIGATOR, ExecutionState.ACT_OK, result.extractedContent || '');

        // Track action for Playwright generation
        const { actionTracker } = await import('./actionTracker');
        const params: Record<string, any> = { text: input.text };
        if (input.index !== undefined) params.index = input.index;
        if (input.xpath) params.xpath = input.xpath;
        if (result.interactedElement?.xpath) params.xpath = result.interactedElement.xpath;
        actionTracker.addStep('input_text', params, result.success, result.error || undefined);

        return result;
      },
      inputTextActionSchema,
      true, // hasIndex
    );
    actions.push(inputTextAction);

    return actions;
  }
}

// Re-export Action for use in Navigator
export type { Action } from './webAction';
