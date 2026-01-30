/**
 * ChatView Component
 * Displays live automation steps (User, Planner, Navigator) in real-time
 * Used in Project Detail Page to show automation execution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Message, Actors } from '@extension/storage';
import MessageList from './MessageList';
import { type AgentEvent, ExecutionState } from '../types/event';
import { webService } from '../lib/webService';

interface ChatViewProps {}

export default function ChatView({}: ChatViewProps) {
  const progressMessage = 'Showing progress...';
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendMessage = useCallback((newMessage: Message) => {
    setMessages(prev => {
      const filteredMessages = prev.filter((msg, idx) => !(msg.content === progressMessage && idx === prev.length - 1));
      return [...filteredMessages, newMessage];
    });
  }, []);

  // Listen for prompt execution to show user message
  useEffect(() => {
    const handlePromptExecution = (event: Event) => {
      const customEvent = event as CustomEvent;
      const promptContent = customEvent.detail?.promptContent;
      if (promptContent) {
        console.log('[ChatView] Prompt execution started, adding user message:', promptContent);
        appendMessage({
          actor: Actors.USER,
          content: promptContent,
          timestamp: Date.now(),
        });
      }
    };

    window.addEventListener('promptExecutionStarted', handlePromptExecution);
    return () => window.removeEventListener('promptExecutionStarted', handlePromptExecution);
  }, [appendMessage]);

  // Setup web service event listener to show live automation steps
  useEffect(() => {
    const handleTaskState = (event: AgentEvent) => {
      const { actor, state, timestamp, data } = event;
      // Try multiple ways to extract content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeData = data as any;
      let content = '';
      if (safeData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content = safeData.details || safeData.message || safeData.content || (event as any).content || '';
      }
      console.log('[ChatView] Full event object:', event);
      console.log('[ChatView] Actor:', actor, typeof actor);
      console.log('[ChatView] Actor enum values:', {
        SYSTEM: Actors.SYSTEM,
        USER: Actors.USER,
        PLANNER: Actors.PLANNER,
        NAVIGATOR: Actors.NAVIGATOR,
      });
      console.log('[ChatView] Actor comparison:', {
        isPlanner: actor === Actors.PLANNER,
        isPlannerString: actor === 'planner',
        isNavigator: actor === Actors.NAVIGATOR,
        isNavigatorString: actor === 'navigator',
        actorValue: actor,
      });
      console.log('[ChatView] State:', state);
      console.log('[ChatView] Data object:', data);
      console.log('[ChatView] Content extracted:', content);
      console.log('[ChatView] Content length:', content.length);

      let skip = false;
      let displayProgress = false;

      switch (actor) {
        case Actors.SYSTEM:
          switch (state) {
            case ExecutionState.TASK_START:
              // Clear previous messages when new task starts
              setMessages([]);
              break;
            case ExecutionState.TASK_OK:
            case ExecutionState.TASK_FAIL:
            case ExecutionState.TASK_CANCEL:
              skip = false; // Show task completion/failure
              break;
            default:
              skip = true;
              break;
          }
          break;
        case Actors.PLANNER:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        case 'planner' as any: // Handle string literal as fallback
          console.log('[ChatView] ✅ PLANNER event detected, state:', state);
          // Show ALL Planner events - they contain important planning information
          skip = false;
          if (state === ExecutionState.STEP_START || state === ExecutionState.ACT_START) {
            displayProgress = true;
          }
          // Always show Planner events, even if content is empty
          if (!content || content.trim().length === 0) {
            // Use state-based default messages
            if (state === ExecutionState.STEP_START) {
              content = 'Planning started...';
            } else if (state === ExecutionState.STEP_OK) {
              content = 'Planning completed';
            } else if (state === ExecutionState.ACT_START) {
              content = 'Planner processing...';
            } else if (state === ExecutionState.ACT_OK) {
              content = 'Planner action completed';
            }
          }
          break;
        case Actors.NAVIGATOR:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        case 'navigator' as any: // Handle string literal as fallback
          console.log('[ChatView] ✅ NAVIGATOR event detected, state:', state);
          // Show ALL Navigator events - they contain the actual automation steps
          skip = false;
          if (state === ExecutionState.STEP_START || state === ExecutionState.ACT_START) {
            displayProgress = true;
          } else if (state === ExecutionState.STEP_OK || state === ExecutionState.ACT_OK) {
            displayProgress = false;
          }
          // Skip only cache_content for ACT_START
          if (state === ExecutionState.ACT_START && content === 'cache_content') {
            skip = true;
          }
          // Always show Navigator events, even if content is empty
          if (!content || content.trim().length === 0) {
            // Use state-based default messages
            if (state === ExecutionState.STEP_START) {
              content = 'Navigation started...';
            } else if (state === ExecutionState.STEP_OK) {
              content = 'Navigation completed';
            } else if (state === ExecutionState.ACT_START) {
              content = 'Executing action...';
            } else if (state === ExecutionState.ACT_OK) {
              content = 'Action completed';
            }
          }
          break;
        case Actors.USER:
          skip = false; // Always show user messages
          break;
        default:
          // For unknown actors, show if they have content (might be new actor types)
          if (content && content.trim().length > 0) {
            console.log('[ChatView] ⚠️ Unknown actor, but showing because has content:', actor);
            skip = false;
          } else {
            skip = true;
          }
          break;
      }

      // Final check: if we have content and it's not a system internal message, show it
      if (skip && content && content.trim().length > 0 && actor !== Actors.SYSTEM) {
        skip = false;
      }

      if (!skip) {
        // Always show message if not skipped, even if content is empty (for progress messages)
        const displayContent = content || (displayProgress ? progressMessage : '');

        // Always add message for Planner and Navigator, even with minimal content
        if (displayContent && displayContent.trim().length > 0) {
          appendMessage({
            actor: actor as Actors,
            content: displayContent,
            timestamp: timestamp,
          });
        } else if (
          actor === Actors.PLANNER ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (actor as any) === 'planner' ||
          actor === Actors.NAVIGATOR ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (actor as any) === 'navigator'
        ) {
          // For Planner/Navigator, show a default message if content is empty
          const defaultMessage =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            actor === Actors.PLANNER || (actor as any) === 'planner'
              ? 'Planner processing...'
              : 'Navigator executing...';
          appendMessage({
            actor: actor as Actors,
            content: defaultMessage,
            timestamp: timestamp,
          });
        } else if (displayProgress) {
          // Show progress message even if content is empty
          appendMessage({
            actor: actor as Actors,
            content: progressMessage,
            timestamp: timestamp,
          });
        }
      }
    };

    const unsubscribe = webService.onEvent(handleTaskState);
    return unsubscribe;
  }, [appendMessage]);

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden border-0">
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 bg-white/50 px-4 py-3 backdrop-blur-sm dark:bg-black/20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Automation Steps</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Watch real-time execution of your automation tasks</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="mb-2 font-medium">No automation steps yet</p>
              <p className="text-sm opacity-70">Execute a prompt to see live automation steps here</p>
            </div>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
