import { useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';

interface GeneratingNotificationProps {
  isVisible: boolean;
  message?: string;
}

export default function GeneratingNotification({
  isVisible,
  message = 'AI Generating script for you',
}: GeneratingNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
    } else {
      // Fade out before hiding
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!show) return null;

  return (
    <div
      className={`glass-panel fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/20 px-6 py-4 shadow-2xl backdrop-blur-xl transition-all dark:bg-purple-900/30 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{
        animation: isVisible ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        boxShadow: '0 8px 32px 0 rgba(147, 51, 234, 0.25)',
      }}>
      <FiLoader
        className="size-6 animate-spin text-purple-600 dark:text-purple-300"
        style={{ animation: 'spin 1s linear infinite' }}
      />
      <span className="text-lg font-semibold text-purple-900 drop-shadow-sm dark:text-purple-100">{message}</span>
    </div>
  );
}
