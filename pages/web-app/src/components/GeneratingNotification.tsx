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
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg bg-purple-600 px-6 py-4 shadow-xl transition-all ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{
        animation: isVisible ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        boxShadow: '0 10px 25px -5px rgba(147, 51, 234, 0.5), 0 10px 10px -5px rgba(147, 51, 234, 0.2)',
      }}>
      <FiLoader className="size-6 animate-spin text-white" style={{ animation: 'spin 1s linear infinite' }} />
      <span className="text-lg font-semibold text-white">{message}</span>
    </div>
  );
}
