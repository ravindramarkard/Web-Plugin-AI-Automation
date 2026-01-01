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
}
