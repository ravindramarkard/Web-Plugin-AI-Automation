import { useState, useEffect } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiGlobe,
  FiCheckCircle,
  FiXCircle,
  FiX,
  FiPlay,
  FiInfo,
  FiZap,
  FiFileText,
} from 'react-icons/fi';
import { environmentStorage, type Environment } from '../lib/environmentStorage';

interface EnvironmentSettingsProps {
  projectId?: string;
  isDarkMode: boolean;
}

export default function EnvironmentSettings({ projectId, isDarkMode }: EnvironmentSettingsProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    baseUrl: 'http://localhost:5050',
    apiUrl: 'https://api.example.com',
    username: 'testuser',
    password: 'password',
    timeout: 30000,
    browser: 'chromium' as 'chromium' | 'firefox' | 'webkit',
    headless: false,
    jiraEnabled: false,
    jiraUrl: 'https://company.atlassian.net',
    jiraUsername: 'username@company.com',
    jiraPassword: '',
    jiraProjectKey: 'PROJ',
    llmEnabled: false,
    llmProvider: 'OpenAI',
    llmModel: 'gpt-4, claude-3, etc.',
    llmApiKey: '',
    llmBaseUrl: 'https://api.openai.com/v1',
    authorizationEnabled: false,
    authType: 'Bearer Token' as 'Bearer Token' | 'API Key' | 'Basic Auth' | 'OAuth2',
    authToken: '',
  });

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      setIsLoading(true);
      const envs = await environmentStorage.getAllEnvironments();
      setEnvironments(envs);
    } catch (error) {
      console.error('Failed to load environments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.key.trim() || !formData.baseUrl.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if key already exists
    const existingEnv = environments.find(env => env.key.toLowerCase() === formData.key.toLowerCase());
    if (existingEnv) {
      alert(`Environment with key "${formData.key}" already exists. Please use a different key.`);
      return;
    }

    try {
      await environmentStorage.createEnvironment({
        ...formData,
        status: 'active',
      });
      await loadEnvironments();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create environment';
      alert(errorMessage);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnvironment || !formData.name.trim() || !formData.key.trim() || !formData.baseUrl.trim()) {
      return;
    }

    // Check if key already exists (excluding current environment)
    const existingEnv = environments.find(
      env => env.key.toLowerCase() === formData.key.toLowerCase() && env.id !== editingEnvironment.id,
    );
    if (existingEnv) {
      alert(`Environment with key "${formData.key}" already exists. Please use a different key.`);
      return;
    }

    try {
      await environmentStorage.updateEnvironment(editingEnvironment.id, formData);
      await loadEnvironments();
      setShowCreateModal(false);
      setEditingEnvironment(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update environment';
      alert(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this environment?')) return;

    try {
      await environmentStorage.deleteEnvironment(id);
      await loadEnvironments();
    } catch (error) {
      console.error('Failed to delete environment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete environment';
      alert(errorMessage);
    }
  };

  const handleEdit = (env: Environment) => {
    setEditingEnvironment(env);
    setFormData({
      name: env.name,
      key: env.key,
      description: env.description,
      baseUrl: env.baseUrl,
      apiUrl: env.apiUrl || '',
      username: env.username || '',
      password: env.password || '',
      timeout: env.timeout,
      browser: env.browser,
      headless: env.headless,
      jiraEnabled: env.jiraEnabled,
      jiraUrl: env.jiraUrl || 'https://company.atlassian.net',
      jiraUsername: env.jiraUsername || 'username@company.com',
      jiraPassword: env.jiraPassword || '',
      jiraProjectKey: env.jiraProjectKey || 'PROJ',
      llmEnabled: env.llmEnabled,
      llmProvider: env.llmProvider || 'OpenAI',
      llmModel: env.llmModel || 'gpt-4, claude-3, etc.',
      llmApiKey: env.llmApiKey || '',
      llmBaseUrl: env.llmBaseUrl || 'https://api.openai.com/v1',
      authorizationEnabled: env.authorizationEnabled,
      authType: env.authType || 'Bearer Token',
      authToken: env.authToken || '',
    });
    setShowCreateModal(true);
  };

  const handleTest = async (id: string) => {
    try {
      const result = await environmentStorage.testEnvironment(id);
      alert(result.message);
    } catch (error) {
      alert('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      key: '',
      description: '',
      baseUrl: 'http://localhost:5050',
      apiUrl: 'https://api.example.com',
      username: 'testuser',
      password: 'password',
      timeout: 30000,
      browser: 'chromium',
      headless: false,
      jiraEnabled: false,
      llmEnabled: false,
      authorizationEnabled: false,
    });
    setEditingEnvironment(null);
  };

  if (isLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading environments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiGlobe size={24} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Environments</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
            isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <FiPlus size={18} />
          New Environment
        </button>
      </div>

      {/* Environment Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {environments.map(env => (
          <div
            key={env.id}
            className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`mb-1 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{env.name}</h3>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Key: <span className="font-mono">{env.key}</span>
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  env.status === 'active'
                    ? isDarkMode
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-green-100 text-green-700'
                    : isDarkMode
                      ? 'bg-gray-900/50 text-gray-400'
                      : 'bg-gray-100 text-gray-700'
                }`}>
                {env.status.toUpperCase()}
              </span>
            </div>

            {env.description && (
              <p className={`mb-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{env.description}</p>
            )}

            <div className={`mb-3 space-y-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <div>
                <span className="font-medium">Base URL:</span> <span className="font-mono text-xs">{env.baseUrl}</span>
              </div>
              <div>
                <span className="font-medium">Browser:</span> {env.browser}
              </div>
              <div>
                <span className="font-medium">Timeout:</span> {env.timeout}ms
              </div>
              <div>
                <span className="font-medium">Headless:</span> {env.headless ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-medium">Jira Integration:</span>{' '}
                <span className={env.jiraEnabled ? 'text-green-600' : 'text-gray-500'}>
                  {env.jiraEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <div>
                <span className="font-medium">LLM Configuration:</span>{' '}
                <span className={env.llmEnabled ? 'text-green-600' : 'text-gray-500'}>
                  {env.llmEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTest(env.id)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                  isDarkMode
                    ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}>
                <FiPlay size={12} />
                Test
              </button>
              <button
                type="button"
                onClick={() => handleEdit(env)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                  isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                <FiEdit2 size={12} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(env.id)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                  isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'
                }`}>
                <FiTrash2 size={12} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {environments.length === 0 && (
        <div className={`py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No environments yet</p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Create your first environment
          </button>
        </div>
      )}

      {/* Create/Edit Environment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className={`w-full max-w-2xl rounded-lg border p-6 shadow-xl ${
              isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingEnvironment ? 'Edit Environment' : 'Create Environment'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className={`rounded p-1.5 transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={editingEnvironment ? handleUpdate : handleCreate}>
              {/* Environment Name */}
              <div className="mb-4">
                <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Environment Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., Development, Staging, Production"
                />
              </div>

              {/* Environment Key */}
              <div className="mb-4">
                <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Environment Key *
                </label>
                <input
                  type="text"
                  required
                  value={formData.key}
                  onChange={e => setFormData({ ...formData, key: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., dev, staging, prod"
                />
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Unique identifier (e.g., dev, staging, prod)
                </p>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Describe this environment"
                />
              </div>

              {/* Environment Variables Section */}
              <div className="mb-4">
                <h3 className={`mb-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Environment Variables
                </h3>

                {/* Base URL */}
                <div className="mb-3">
                  <label className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Base URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.baseUrl}
                    onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="http://localhost:5050"
                  />
                </div>

                {/* API URL */}
                <div className="mb-3">
                  <label className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    API URL
                  </label>
                  <input
                    type="url"
                    value={formData.apiUrl}
                    onChange={e => setFormData({ ...formData, apiUrl: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="https://api.example.com"
                  />
                </div>

                {/* Username */}
                <div className="mb-3">
                  <label className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="testuser"
                  />
                </div>

                {/* Password */}
                <div className="mb-3">
                  <label className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="password"
                  />
                </div>
              </div>

              {/* General Settings Section */}
              <div className="mb-4">
                <h3 className={`mb-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  General Settings
                </h3>

                {/* Timeout */}
                <div className="mb-3">
                  <label className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    value={formData.timeout}
                    onChange={e => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30000 })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="30000"
                  />
                </div>

                {/* Browser */}
                <div className="mb-3">
                  <label className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Browser
                  </label>
                  <select
                    value={formData.browser}
                    onChange={e =>
                      setFormData({ ...formData, browser: e.target.value as 'chromium' | 'firefox' | 'webkit' })
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'
                    } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                  </select>
                </div>

                {/* Headless Mode */}
                <div className="mb-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.headless}
                      onChange={e => setFormData({ ...formData, headless: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Headless Mode
                    </span>
                    <FiInfo size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                  </label>
                </div>
              </div>

              {/* Jira Integration */}
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.jiraEnabled}
                    onChange={e => setFormData({ ...formData, jiraEnabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Enable Jira
                  </span>
                  <FiInfo size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                </label>

                {formData.jiraEnabled && (
                  <div className="ml-6 mt-3 space-y-3">
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Jira URL
                      </label>
                      <input
                        type="url"
                        value={formData.jiraUrl}
                        onChange={e => setFormData({ ...formData, jiraUrl: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="https://company.atlassian.net"
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.jiraUsername}
                        onChange={e => setFormData({ ...formData, jiraUsername: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="username@company.com"
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Password/Token
                      </label>
                      <input
                        type="password"
                        value={formData.jiraPassword}
                        onChange={e => setFormData({ ...formData, jiraPassword: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="API token or password"
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Project Key
                      </label>
                      <input
                        type="text"
                        value={formData.jiraProjectKey}
                        onChange={e => setFormData({ ...formData, jiraProjectKey: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="PROJ"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* LLM Configuration */}
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.llmEnabled}
                    onChange={e => setFormData({ ...formData, llmEnabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Enable LLM for this environment
                  </span>
                  <FiInfo size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                </label>

                {formData.llmEnabled && (
                  <div className="ml-6 mt-3 space-y-3">
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Provider
                      </label>
                      <select
                        value={formData.llmProvider}
                        onChange={e => setFormData({ ...formData, llmProvider: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                        <option value="OpenAI">OpenAI</option>
                        <option value="Anthropic">Anthropic</option>
                        <option value="Gemini">Gemini</option>
                        <option value="Groq">Groq</option>
                        <option value="Ollama">Ollama</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={formData.llmModel}
                        onChange={e => setFormData({ ...formData, llmModel: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="gpt-4, claude-3, etc."
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        API Key
                      </label>
                      <input
                        type="password"
                        value={formData.llmApiKey}
                        onChange={e => setFormData({ ...formData, llmApiKey: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Your API key"
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={formData.llmBaseUrl}
                        onChange={e => setFormData({ ...formData, llmBaseUrl: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement LLM connection test
                        alert('LLM connection test - Coming soon!');
                      }}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}>
                      <FiZap size={14} />
                      Test LLM Connection
                    </button>
                  </div>
                )}
              </div>

              {/* Authorization Configuration */}
              <div className="mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.authorizationEnabled}
                    onChange={e => setFormData({ ...formData, authorizationEnabled: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Enable Authorization
                  </span>
                  <FiInfo size={14} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                </label>

                {formData.authorizationEnabled && (
                  <div className="ml-6 mt-3 space-y-3">
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Authentication Type
                      </label>
                      <select
                        value={formData.authType}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            authType: e.target.value as 'Bearer Token' | 'API Key' | 'Basic Auth' | 'OAuth2',
                          })
                        }
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                        <option value="Bearer Token">Bearer Token</option>
                        <option value="API Key">API Key</option>
                        <option value="Basic Auth">Basic Auth</option>
                        <option value="OAuth2">OAuth2</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className={`mb-1 block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Token
                      </label>
                      <input
                        type="password"
                        value={formData.authToken}
                        onChange={e => setFormData({ ...formData, authToken: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Enter token or use ${API_TOKEN}"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                  <FiFileText size={16} />
                  {editingEnvironment ? 'Update Environment' : 'Create Environment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
