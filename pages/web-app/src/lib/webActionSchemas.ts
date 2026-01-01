/**
 * Web-compatible action schemas
 * Defines action schemas without importing from chrome-extension
 */

import { z } from 'zod';

export interface ActionSchema {
  name: string;
  description: string;
  schema: z.ZodType;
}

export const doneActionSchema: ActionSchema = {
  name: 'done',
  description: 'Mark the task as complete and provide the final answer',
  schema: z.object({
    text: z.string(),
    success: z.boolean(),
  }),
};

export const goToUrlActionSchema: ActionSchema = {
  name: 'go_to_url',
  description: 'Navigate to a URL',
  schema: z.object({
    intent: z.string().optional(),
    url: z.string(),
  }),
};

export const clickElementActionSchema: ActionSchema = {
  name: 'click_element',
  description: 'Click on an element using its index or xpath',
  schema: z.object({
    intent: z.string().optional(),
    index: z.number().optional(),
    xpath: z.string().optional(),
  }),
};

export const inputTextActionSchema: ActionSchema = {
  name: 'input_text',
  description: 'Type text into an input field using its index or xpath',
  schema: z.object({
    intent: z.string().optional(),
    index: z.number().optional(),
    xpath: z.string().optional(),
    text: z.string(),
  }),
};
