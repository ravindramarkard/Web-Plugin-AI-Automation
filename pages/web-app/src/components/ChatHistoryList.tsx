/* eslint-disable react/prop-types */
import { FaTrash } from 'react-icons/fa';
import { BsBookmark } from 'react-icons/bs';
import { t } from '@extension/i18n';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

interface ChatHistoryListProps {
  sessions: ChatSession[];
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
  onSessionBookmark: (sessionId: string) => void;
  visible: boolean;
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  sessions,
  onSessionSelect,
  onSessionDelete,
  onSessionBookmark,
  visible,
}) => {
  if (!visible) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200">{t('chat_history_title')}</h2>
      {sessions.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center text-gray-500 dark:text-gray-400">
          {t('chat_history_empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => (
            <div
              key={session.id}
              className="glass-card group relative cursor-pointer rounded-lg p-3 transition-all hover:bg-white/20 dark:hover:bg-white/10">
              <button
                onClick={() => onSessionSelect(session.id)}
                className="w-full text-left focus:outline-none"
                type="button">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">{session.title}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(session.createdAt)}</p>
              </button>

              {/* Bookmark button - top right */}
              {onSessionBookmark && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onSessionBookmark(session.id);
                  }}
                  className="glass-button absolute right-2 top-2 rounded p-1.5 text-blue-500 opacity-0 transition-all group-hover:opacity-100"
                  aria-label={t('chat_history_bookmark')}
                  type="button">
                  <BsBookmark size={14} />
                </button>
              )}

              {/* Delete button - bottom right */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onSessionDelete(session.id);
                }}
                className="glass-button absolute bottom-2 right-2 rounded p-1.5 text-gray-400 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                aria-label={t('chat_history_delete')}
                type="button">
                <FaTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatHistoryList;
