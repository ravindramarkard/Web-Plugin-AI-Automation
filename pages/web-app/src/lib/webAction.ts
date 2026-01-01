/**
 * Web-compatible Action class
 * Simplified version that works without chrome-extension imports
 */

import type { ActionResult } from './webAgentTypes';
import type { ActionSchema } from './webActionSchemas';
import { z } from 'zod';

export class Action {
  private readonly handler: (input: any) => Promise<ActionResult>;
  public readonly schema: ActionSchema;
  public readonly hasIndex: boolean;

  constructor(handler: (input: any) => Promise<ActionResult>, schema: ActionSchema, hasIndex: boolean = false) {
    this.handler = handler;
    this.schema = schema;
    this.hasIndex = hasIndex;
  }

  async call(input: unknown): Promise<ActionResult> {
    // Validate input before calling the handler
    const parsedArgs = this.schema.schema.safeParse(input);
    if (!parsedArgs.success) {
      const errorMessage = parsedArgs.error.message;
      throw new Error(errorMessage);
    }
    return await this.handler(parsedArgs.data);
  }

  name(): string {
    return this.schema.name;
  }
}
