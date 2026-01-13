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
    <div className="flex h-screen flex-col bg-transparent">
      {/* Header */}
      <header className="glass sticky top-0 z-50 flex items-center justify-between border-b-0 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent dark:from-blue-400 dark:to-purple-400">
            AITestGen
          </h1>
          <nav className="flex gap-2">
            <Link
              to="/dashboard"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                location.pathname === '/dashboard' || location.pathname === '/'
                  ? 'bg-blue-500/10 text-blue-700 backdrop-blur-sm dark:bg-blue-400/10 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}>
              Dashboard
            </Link>
            <Link
              to="/chat"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                location.pathname === '/chat'
                  ? 'bg-blue-500/10 text-blue-700 backdrop-blur-sm dark:bg-blue-400/10 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}>
              Chat
            </Link>
            <Link
              to="/projects"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                location.pathname === '/projects'
                  ? 'bg-blue-500/10 text-blue-700 backdrop-blur-sm dark:bg-blue-400/10 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}>
              Projects
            </Link>
            {/* <Link
              to="/api-test-generator"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                location.pathname === '/api-test-generator'
                  ? 'bg-blue-500/10 text-blue-700 backdrop-blur-sm dark:bg-blue-400/10 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
              }`}>
              API Test Gen
            </Link> */}
          </nav>
        </div>
        <Link
          to="/settings"
          className={`rounded-lg p-2 transition-all ${
            location.pathname === '/settings'
              ? 'bg-blue-500/10 text-blue-700 backdrop-blur-sm dark:bg-blue-400/10 dark:text-blue-300'
              : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white'
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
