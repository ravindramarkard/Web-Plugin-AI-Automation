import React, { useState, useEffect } from 'react';
import { analyticsSettingsStore } from '@extension/storage';

import type { AnalyticsSettingsConfig } from '@extension/storage';

interface AnalyticsSettingsProps {}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = () => {
  const [settings, setSettings] = useState<AnalyticsSettingsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await analyticsSettingsStore.getSettings();
        setSettings(currentSettings);
      } catch (error) {
        console.error('Failed to load analytics settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Listen for storage changes
    const unsubscribe = analyticsSettingsStore.subscribe(loadSettings);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleAnalytics = async (enabled: boolean) => {
    if (!settings) return;

    try {
      await analyticsSettingsStore.updateSettings({ enabled });
      setSettings({ ...settings, enabled });
    } catch (error) {
      console.error('Failed to update analytics settings:', error);
    }
  };

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg glass-card p-6 text-left shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Analytics Settings</h2>
          <div className="animate-pulse">
            <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-slate-600"></div>
            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg glass-card p-6 text-left shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Analytics Settings</h2>
          <p className="text-red-600 dark:text-red-400">Failed to load analytics settings.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="glass-card p-6 text-left">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Analytics Settings</h2>

        <div className="space-y-6">
          {/* Main toggle */}
          <div className="my-6 rounded-lg glass-panel p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="analytics-enabled" className="text-base font-medium text-gray-900 dark:text-white">
                Help improve AITestGen
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => handleToggleAnalytics(e.target.checked)}
                  className="sr-only"
                  id="analytics-enabled"
                />
                <label
                  htmlFor="analytics-enabled"
                  className="block h-6 cursor-pointer overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 peer-checked:bg-blue-500">
                  <span className="sr-only">Toggle analytics</span>
                  <span
                    className={`block size-6 rounded-full bg-white dark:bg-slate-200 shadow transition-transform ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Share anonymous usage data to help us improve the extension
            </p>
          </div>

          {/* Information about what we collect */}
          <div className="rounded-md glass-panel p-4">
            <h3 className="mb-4 text-base font-medium text-gray-900 dark:text-white">What we collect:</h3>
            <ul className="list-disc space-y-2 pl-5 text-left text-sm text-gray-600 dark:text-gray-300">
              <li>Task execution metrics (start, completion, failure counts and duration)</li>
              <li>Domain names of websites visited (e.g., &quot;amazon.com&quot;, not full URLs)</li>
              <li>Error categories for failed tasks (no sensitive details)</li>
              <li>Anonymous usage statistics</li>
            </ul>

            <h3 className="mb-4 mt-6 text-base font-medium text-gray-900 dark:text-white">
              What we DON&apos;T collect:
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-left text-sm text-gray-600 dark:text-gray-300">
              <li>Personal information or login credentials</li>
              <li>Full URLs or page content</li>
              <li>Task instructions or user prompts</li>
              <li>Screen recordings or screenshots</li>
              <li>Any sensitive or private data</li>
            </ul>
          </div>

          {/* Opt-out message */}
          {!settings.enabled && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Analytics disabled. You can re-enable it anytime to help improve AITestGen.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
