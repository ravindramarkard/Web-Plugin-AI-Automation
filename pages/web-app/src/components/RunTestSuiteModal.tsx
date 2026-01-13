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
}

export default function RunTestSuiteModal({ suite, projectId, onClose, onRun }: RunTestSuiteModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Run Test Suite</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">📁 {suite.name}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Override environment and execution settings for this run
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10 transition-colors">
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Environment Override */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Environment Override
              </label>
              <div className="relative">
                <select
                  value={environmentId}
                  onChange={e => setEnvironmentId(e.target.value)}
                  className="glass-input w-full appearance-none rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none">
                  <option value="" className="dark:bg-slate-800">
                    Suite's configured environment (Default)
                  </option>
                  {environments.map(env => (
                    <option key={env.id} value={env.id} className="dark:bg-slate-800">
                      {env.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <FiSettings size={14} />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Will use suite's configured environment.</p>
            </div>

            {/* Browser */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Browser</label>
              <div className="relative">
                <select
                  value={browser}
                  onChange={e => setBrowser(e.target.value)}
                  className="glass-input w-full appearance-none rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none">
                  <option value="chromium" className="dark:bg-slate-800">
                    Chromium
                  </option>
                  <option value="firefox" className="dark:bg-slate-800">
                    Firefox
                  </option>
                  <option value="webkit" className="dark:bg-slate-800">
                    Webkit
                  </option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <FiSettings size={14} />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Select browser for test execution</p>
            </div>

            {/* Execution Mode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Execution Mode</label>
              <div className="relative">
                <select
                  value={executionMode}
                  onChange={e => setExecutionMode(e.target.value as 'sequential' | 'parallel')}
                  className="glass-input w-full appearance-none rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none">
                  <option value="sequential" className="dark:bg-slate-800">
                    Sequential Execution
                  </option>
                  <option value="parallel" className="dark:bg-slate-800">
                    Parallel Execution
                  </option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <FiSettings size={14} />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Sequential: Run tests one after another. Parallel: Run tests simultaneously with multiple workers.
              </p>
            </div>

            {/* Filter by Tags */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Tags (optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. @smoke"
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Will run all tests in the suite (no tag filter).
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Run in Headless Mode */}
              <div className="glass-card flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/40 dark:hover:bg-white/10">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Run in Headless Mode</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={headless}
                    onChange={e => setHeadless(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white dark:after:bg-slate-200 after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>

              {/* Run in Parallel */}
              <div className="glass-card flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/40 dark:hover:bg-white/10">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Run in Parallel</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={runInParallel}
                    onChange={e => handleToggleParallel(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white dark:after:bg-slate-200 after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>
            </div>

            {/* Jira Integration */}
            <div className="pt-2">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                <FiExternalLink /> Jira Integration
              </div>

              <div className="glass-card flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/40 dark:hover:bg-white/10">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white dark:after:bg-slate-200 after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
                </label>
              </div>

              {!isJiraConfigured && (
                <p className="mt-1 text-xs text-orange-500">
                  Configure Jira integration in Environment settings to enable this feature.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-2.5 font-medium text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-green-500/20 hover:bg-green-700 hover:shadow-green-500/30">
              <FiPlay size={16} /> RUN SUITE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
