import React, { useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiPlay, FiSettings, FiExternalLink } from 'react-icons/fi';
import { environmentStorage, type Environment } from '../lib/environmentStorage';
import { TestSuite } from '../lib/testSuiteStorage';

export interface RunSuiteOptions {
  environmentId?: string;
  browser?: string;
  headless?: boolean;
  parallel?: boolean;
  tags?: string;
  jiraLogging?: boolean;
}

interface RunTestSuiteModalProps {
  suite: TestSuite;
  projectId: string;
  onClose: () => void;
  onRun: (options: RunSuiteOptions) => Promise<void>;
  isDarkMode: boolean;
}

export default function RunTestSuiteModal({ suite, projectId, onClose, onRun, isDarkMode }: RunTestSuiteModalProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loadingEnvs, setLoadingEnvs] = useState(true);

  // Form State
  const [environmentId, setEnvironmentId] = useState('');
  const [browser, setBrowser] = useState('chromium');
  const [executionMode, setExecutionMode] = useState<'sequential' | 'parallel'>('sequential');
  const [tags, setTags] = useState('');
  const [headless, setHeadless] = useState(true);
  const [runInParallel, setRunInParallel] = useState(false); // Toggle switch
  const [jiraLogging, setJiraLogging] = useState(false);

  // Derived state for Jira warning
  const selectedEnv = environments.find(e => e.id === environmentId);
  const isJiraConfigured = selectedEnv?.jiraEnabled;

  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        setLoadingEnvs(true);
        const envs = await environmentStorage.getAllEnvironments(projectId);
        setEnvironments(envs);
        // Select first active environment by default
        const activeEnv = envs.find(e => e.status === 'active');
        if (activeEnv) {
          setEnvironmentId(activeEnv.id);
        } else if (envs.length > 0) {
          setEnvironmentId(envs[0].id);
        }
      } catch (error) {
        console.error('Failed to load environments:', error);
      } finally {
        setLoadingEnvs(false);
      }
    };
    loadEnvironments();
  }, [projectId]);

  // Sync execution mode dropdown with parallel toggle
  useEffect(() => {
    if (executionMode === 'parallel') {
      setRunInParallel(true);
    } else {
      setRunInParallel(false);
    }
  }, [executionMode]);

  const handleToggleParallel = (checked: boolean) => {
    setRunInParallel(checked);
    setExecutionMode(checked ? 'parallel' : 'sequential');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRun({
      environmentId: environmentId || undefined,
      browser,
      headless,
      parallel: runInParallel,
      tags: tags || undefined,
      jiraLogging,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-lg rounded-lg shadow-xl ${
          isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
        }`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div>
            <h2 className="text-xl font-bold">Run Test Suite</h2>
            <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1">📁 {suite.name}</span>
            </div>
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Override environment and execution settings for this run
            </p>
          </div>
          <button
            onClick={onClose}
            className={`rounded-full p-1 transition-colors ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Environment Override */}
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Environment Override
              </label>
              <select
                value={environmentId}
                onChange={e => setEnvironmentId(e.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-700 text-white focus:border-blue-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}>
                <option value="">Suite's configured environment (Default)</option>
                {environments.map(env => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Will use suite's configured environment.
              </p>
            </div>

            {/* Browser */}
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Browser
              </label>
              <select
                value={browser}
                onChange={e => setBrowser(e.target.value)}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-700 text-white focus:border-blue-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}>
                <option value="chromium">Chromium</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">Webkit</option>
              </select>
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Select browser for test execution
              </p>
            </div>

            {/* Execution Mode */}
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Execution Mode
              </label>
              <select
                value={executionMode}
                onChange={e => setExecutionMode(e.target.value as 'sequential' | 'parallel')}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-700 text-white focus:border-blue-500'
                    : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}>
                <option value="sequential">Sequential Execution</option>
                <option value="parallel">Parallel Execution</option>
              </select>
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Sequential: Run tests one after another. Parallel: Run tests simultaneously with multiple workers.
              </p>
            </div>

            {/* Filter by Tags */}
            <div>
              <label className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Filter by Tags (optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. @smoke"
                className={`w-full rounded border px-3 py-2 text-sm ${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-500 focus:border-blue-500'
                    : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Will run all tests in the suite (no tag filter).
              </p>
            </div>

            <div className="pt-2">
              {/* Run in Headless Mode */}
              <div className="flex items-center justify-between py-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Run in Headless Mode
                </span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={headless}
                    onChange={e => setHeadless(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
                </label>
              </div>

              {/* Run in Parallel */}
              <div className="flex items-center justify-between py-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Run in Parallel
                </span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={runInParallel}
                    onChange={e => handleToggleParallel(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
                </label>
              </div>
            </div>

            {/* Jira Integration */}
            <div className="pt-2">
              <div
                className={`mb-2 flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <FiExternalLink /> Jira Integration
              </div>

              <div className="flex items-center justify-between py-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Log failures to Jira {isJiraConfigured ? '' : '(Not configured)'}
                </span>
                <label
                  className={`relative inline-flex items-center ${!isJiraConfigured ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={jiraLogging}
                    onChange={e => setJiraLogging(e.target.checked)}
                    disabled={!isJiraConfigured}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
                </label>
              </div>

              {!isJiraConfigured && (
                <p className="mt-1 text-xs text-orange-500">
                  Configure Jira integration in Environment settings to enable this feature.
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 flex justify-end gap-3">
            {/* Cancel button usually top right, but modal standard has actions at bottom */}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Run Button */}
            <button
              type="submit"
              className="flex items-center gap-2 rounded bg-green-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700">
              <FiPlay size={16} /> RUN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
