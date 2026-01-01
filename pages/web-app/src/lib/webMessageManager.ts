/**
 * Web-compatible Message Manager
 * Simplified version for web app
 */

import type { BaseMessage } from '@langchain/core/messages';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

export class WebMessageManager {
  private messages: BaseMessage[] = [];

  initTaskMessages(systemMessage: SystemMessage, task: string): void {
    this.messages = [systemMessage];

    // Add task message
    const taskMessage = new HumanMessage({
      content: `Your ultimate task is: """${task}""". If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.`,
    });
    this.addMessage(taskMessage);
  }

  addMessage(message: BaseMessage): void {
    this.messages.push(message);
  }

  getMessages(): BaseMessage[] {
    return [...this.messages];
  }

  length(): number {
    return this.messages.length;
  }

  addPlan(plan: string, position: number): void {
    // Add plan to messages at specified position
    const planMessage = new HumanMessage({
      content: `Plan: ${plan}`,
    });
    this.messages.splice(position, 0, planMessage);
  }

  addNewTask(task: string): void {
    const taskMessage = new HumanMessage({
      content: `New task: ${task}`,
    });
    this.addMessage(taskMessage);
  }

  addActionResult(actionResult: any): void {
    const resultMessage = new SystemMessage({
      content: `Action Result: ${JSON.stringify(actionResult, null, 2)}`,
    });
    this.addMessage(resultMessage);
  }
}
