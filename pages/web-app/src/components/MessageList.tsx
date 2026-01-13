import type { Message } from '@extension/storage';
import { ACTOR_PROFILES } from '@src/types/message';
import { memo } from 'react';

interface MessageListProps {
  messages: Message[];
}

export default memo(function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-full space-y-4">
      {messages.map((message, index) => (
        <MessageBlock
          key={`${message.actor}-${message.timestamp}-${index}`}
          message={message}
          isSameActor={index > 0 ? messages[index - 1].actor === message.actor : false}
        />
      ))}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isSameActor: boolean;
}

function MessageBlock({ message, isSameActor }: MessageBlockProps) {
  if (!message.actor) {
    console.error('No actor found');
    return <div />;
  }

  // Actor enum values are already lowercase strings (e.g., 'planner', 'navigator', 'user')
  // Convert to lowercase to ensure match with ACTOR_PROFILES keys
  const actorKey = (
    typeof message.actor === 'string' ? message.actor : String(message.actor)
  ).toLowerCase() as keyof typeof ACTOR_PROFILES;
  const actor = ACTOR_PROFILES[actorKey];

  if (!actor) {
    console.warn(`Unknown actor: ${message.actor} (key: ${actorKey}), falling back to system`);
    // Fallback to system actor if not found
    const fallbackActor = ACTOR_PROFILES.system;
    return (
      <div
        className={`flex max-w-full gap-3 rounded-xl p-3 transition-colors glass-card ${
          !isSameActor ? 'mt-4' : 'mt-1'
        }`}>
        {!isSameActor && (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full shadow-lg ring-2 ring-white/10"
            style={{ backgroundColor: fallbackActor.iconBackground }}>
            <img src={fallbackActor.icon} alt={fallbackActor.name} className="size-6 drop-shadow-sm" />
          </div>
        )}
        {isSameActor && <div className="w-8" />}
        <div className="min-w-0 flex-1">
          {!isSameActor && (
            <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{String(message.actor)}</div>
          )}
          <div className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  const isProgress = message.content === 'Showing progress...';

  return (
    <div
      className={`flex max-w-full gap-3 rounded-xl p-3 transition-colors glass-card ${!isSameActor ? 'mt-4' : 'mt-1'}`}>
      {!isSameActor && (
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full shadow-lg ring-2 ring-white/10"
          style={{ backgroundColor: actor.iconBackground }}>
          <img src={actor.icon} alt={actor.name} className="size-6 drop-shadow-sm" />
        </div>
      )}
      {isSameActor && <div className="w-8" />}

      <div className="min-w-0 flex-1">
        {!isSameActor && <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">{actor.name}</div>}

        <div className="space-y-0.5">
          <div className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
            {isProgress ? (
              <div className="h-1 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                <div className="animate-progress h-full bg-blue-500" />
              </div>
            ) : (
              message.content
            )}
          </div>
          {!isProgress && (
            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(message.timestamp)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Formats a timestamp (in milliseconds) to a readable time string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if the message is from today
  const isToday = date.toDateString() === now.toDateString();

  // Check if the message is from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  // Check if the message is from this year
  const isThisYear = date.getFullYear() === now.getFullYear();

  // Format the time (HH:MM)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr; // Just show the time for today's messages
  }

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  if (isThisYear) {
    // Show month and day for this year
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }

  // Show full date for older messages
  return `${date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}, ${timeStr}`;
}
