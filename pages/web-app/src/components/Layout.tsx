import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import { GrHistory } from 'react-icons/gr';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">AITestGen</h1>
          <nav className="flex gap-2">
            <Link
              to="/dashboard"
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === '/dashboard' || location.pathname === '/'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}>
              Dashboard
            </Link>
            <Link
              to="/chat"
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === '/chat'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}>
              Chat
            </Link>
            <Link
              to="/projects"
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                location.pathname === '/projects'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}>
              Projects
            </Link>
          </nav>
        </div>
        <Link
          to="/settings"
          className={`rounded p-2 transition-colors ${
            location.pathname === '/settings'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          aria-label="Settings">
          <FiSettings className="size-5" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
