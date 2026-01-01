/**
 * Web-compatible Event Manager
 * Simplified version for web app
 */

import type { AgentEvent } from './webAgentTypes';
import { EventType } from './webAgentTypes';

type EventCallback = (event: AgentEvent) => void;

export class WebEventManager {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  subscribe(eventType: string, callback: EventCallback): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);
  }

  unsubscribe(eventType: string, callback: EventCallback): void {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  clearSubscribers(eventType: string): void {
    this.subscribers.delete(eventType);
  }

  async emit(event: AgentEvent): Promise<void> {
    const callbacks = this.subscribers.get(event.type) || new Set();
    // Emit events synchronously to avoid async issues
    // Callbacks should handle their own async operations
    callbacks.forEach(callback => {
      try {
        // Don't await - let callbacks handle their own async
        callback(event);
      } catch (error) {
        console.error('[WebEventManager] Error in event callback:', error);
      }
    });
  }
}
