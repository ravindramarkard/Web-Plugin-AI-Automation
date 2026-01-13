import { useState, useEffect } from 'react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSettings,
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
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}>
        <span
          className={`${
            checked ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-200 transition-transform`}
        />
      </button>
    </div>
  );
}

export default function EnvironmentSettings({ projectId }: EnvironmentSettingsProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [variableList, setVariableList] = useState<{ key: string; value: string }[]>([]);
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
    authKey: '',
    authValue: '',
    authLocation: 'header' as 'header' | 'query',
    authUsername: '',
    authPassword: '',
    oauthClientId: '',
    oauthClientSecret: '',
    oauthTokenUrl: '',
    oauthScope: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      setIsLoading(true);
      const envs = await environmentStorage.getAllEnvironments(projectId);
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
      const variables = variableList.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      await environmentStorage.createEnvironment(
        {
          ...formData,
          variables,
        },
        projectId,
      );
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
      const variables = variableList.reduce(
        (acc, { key, value }) => {
          if (key.trim()) acc[key.trim()] = value;
          return acc;
        },
        {} as Record<string, string>,
      );

      await environmentStorage.updateEnvironment(editingEnvironment.id, {
        ...formData,
        variables,
      });
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
      authKey: env.authKey || '',
      authValue: env.authValue || '',
      authLocation: env.authLocation || 'header',
      authUsername: env.authUsername || '',
      authPassword: env.authPassword || '',
      oauthClientId: env.oauthClientId || '',
      oauthClientSecret: env.oauthClientSecret || '',
      oauthTokenUrl: env.oauthTokenUrl || '',
      oauthScope: env.oauthScope || '',
      status: env.status || 'active',
    });
    // Convert variables object to array for the form
    if (env.variables && typeof env.variables === 'object') {
      const vars = Object.entries(env.variables).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      setVariableList(vars);
    } else {
      setVariableList([]);
    }

    setShowCreateModal(true);
  };

  const handleTest = async (id: string) => {
    try {
      const result = await environmentStorage.testEnvironment(id, projectId);
      alert(result.message);
    } catch (error) {
      alert('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const resetForm = () => {
    setVariableList([]);
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
      authType: 'Bearer Token',
      authToken: '',
      authKey: '',
      authValue: '',
      authLocation: 'header',
      authUsername: '',
      authPassword: '',
      oauthClientId: '',
      oauthClientSecret: '',
      oauthTokenUrl: '',
      oauthScope: '',
      status: 'active',
    });
    setEditingEnvironment(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading environments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FiSettings size={20} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Environments</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="glass-button flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/40">
          <FiPlus size={18} />
          New Environment
        </button>
      </div>

      {/* Environment Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {environments.map(env => (
          <div
            key={env.id}
            className="glass-card group relative flex flex-col justify-between rounded-2xl p-5 transition-all hover:scale-[1.02]">
            <div>
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{env.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{env.key}</p>
                </div>
                {env.status === 'active' ? (
                  <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-bold text-green-500">
                    <FiCheckCircle size={14} /> ACTIVE
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-1 text-xs font-bold text-gray-400">
                    <FiXCircle size={14} /> INACTIVE
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                {env.description || 'No description provided'}
              </div>

              {/* Details Grid */}
              <div className="mb-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Base URL</span>
                  <span
                    className="max-w-[150px] truncate font-mono text-xs text-gray-900 dark:text-gray-200"
                    title={env.baseUrl}>
                    {env.baseUrl}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Browser</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-200">{env.browser}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Timeout</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-200">{env.timeout}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Headless</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-gray-200">
                    {env.headless ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Integrations */}
              <div className="mb-6 space-y-3 border-t border-gray-200/50 pt-4 dark:border-white/5">
                <div className="glass-card flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Jira Integration</span>
                  <span className={`font-bold ${env.jiraEnabled ? 'text-green-500' : 'text-red-400'}`}>
                    {env.jiraEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="glass-card flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">LLM Configuration</span>
                  <span className={`font-bold ${env.llmEnabled ? 'text-green-500' : 'text-red-400'}`}>
                    {env.llmEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleTest(env.id)}
                className="glass-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-500/20 dark:text-gray-300 dark:hover:bg-white/10">
                <FiPlay size={12} /> Test
              </button>
              <button
                type="button"
                onClick={() => handleEdit(env)}
                className="glass-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-500/20 dark:text-blue-400">
                <FiEdit2 size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(env.id)}
                className="glass-button flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/20 dark:text-red-400">
                <FiTrash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {environments.length === 0 && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          <p>No environments yet</p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Create your first environment
          </button>
        </div>
      )}

      {/* Create/Edit Environment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-panel flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200/50 p-6 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingEnvironment ? 'Edit Environment' : 'Create New Environment'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-full p-2 text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10 transition-colors">
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="environment-form" onSubmit={editingEnvironment ? handleUpdate : handleCreate}>
                {/* Environment Status Toggle */}
                <div className="glass-card mb-6 rounded-xl p-4">
                  <Toggle
                    label="Enable Environment"
                    checked={formData.status === 'active'}
                    onChange={checked => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    When disabled, this environment cannot be used for running tests.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Environment Name */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Environment Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                      placeholder="e.g., Development, Staging, Production"
                    />
                  </div>

                  {/* Environment Key */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Environment Key *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.key}
                      onChange={e => setFormData({ ...formData, key: e.target.value })}
                      className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                      placeholder="e.g., dev, staging, prod"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Unique identifier (e.g., dev, staging, prod)
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe this environment"
                  />
                </div>

                {/* Environment Variables Section */}
                <div className="mb-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Environment Variables
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Base URL */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Base URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={formData.baseUrl}
                        onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                        className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="http://localhost:5050"
                      />
                    </div>

                    {/* API URL */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">API URL</label>
                      <input
                        type="url"
                        value={formData.apiUrl}
                        onChange={e => setFormData({ ...formData, apiUrl: e.target.value })}
                        className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://api.example.com"
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                        className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="testuser"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="password"
                      />
                    </div>

                    {/* Timeout */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        min="1000"
                        value={formData.timeout}
                        onChange={e => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30000 })}
                        className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="30000"
                      />
                    </div>

                    {/* Browser */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Browser</label>
                      <select
                        value={formData.browser}
                        onChange={e =>
                          setFormData({ ...formData, browser: e.target.value as 'chromium' | 'firefox' | 'webkit' })
                        }
                        className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="chromium" className="dark:bg-slate-800">
                          Chromium
                        </option>
                        <option value="firefox" className="dark:bg-slate-800">
                          Firefox
                        </option>
                        <option value="webkit" className="dark:bg-slate-800">
                          WebKit
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Headless Mode Toggle */}
                  <div className="mt-4 glass-card rounded-lg p-3">
                    <Toggle
                      label="Headless Mode"
                      checked={formData.headless}
                      onChange={checked => setFormData({ ...formData, headless: checked })}
                    />
                  </div>
                </div>

                {/* Custom Variables Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Custom Variables
                    </h3>
                    <button
                      type="button"
                      onClick={() => setVariableList([...variableList, { key: '', value: '' }])}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                      <FiPlus size={14} /> Add Variable
                    </button>
                  </div>

                  <div className="glass-card rounded-lg p-4">
                    {variableList.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">
                        No custom variables defined. Add variables to use them in your tests.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {variableList.map((item, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Key (e.g. API_KEY)"
                                value={item.key}
                                onChange={e => {
                                  const newList = [...variableList];
                                  newList[index].key = e.target.value;
                                  setVariableList(newList);
                                }}
                                className="glass-input w-full rounded px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Value"
                                value={item.value}
                                onChange={e => {
                                  const newList = [...variableList];
                                  newList[index] = { ...newList[index], value: e.target.value };
                                  setVariableList(newList);
                                }}
                                className="glass-input w-full rounded px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newList = variableList.filter((_, i) => i !== index);
                                setVariableList(newList);
                              }}
                              className="p-2 text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                              title="Remove variable">
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Jira Integration Section */}
                <div className="mb-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Jira Integration
                  </h3>
                  <div className="glass-card rounded-lg p-4">
                    <Toggle
                      label="Enable Jira"
                      checked={formData.jiraEnabled}
                      onChange={checked => setFormData({ ...formData, jiraEnabled: checked })}
                    />

                    {formData.jiraEnabled && (
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Jira URL
                          </label>
                          <input
                            type="url"
                            value={formData.jiraUrl}
                            onChange={e => setFormData({ ...formData, jiraUrl: e.target.value })}
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://company.atlassian.net"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Username
                          </label>
                          <input
                            type="text"
                            value={formData.jiraUsername}
                            onChange={e => setFormData({ ...formData, jiraUsername: e.target.value })}
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="username@company.com"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Password/Token
                          </label>
                          <input
                            type="password"
                            value={formData.jiraPassword}
                            onChange={e => setFormData({ ...formData, jiraPassword: e.target.value })}
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="API token or password"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Project Key
                          </label>
                          <input
                            type="text"
                            value={formData.jiraProjectKey}
                            onChange={e => setFormData({ ...formData, jiraProjectKey: e.target.value })}
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="PROJ"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* LLM Configuration (Optional/Extra but preserved for consistency) */}
                <div className="mb-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    LLM Configuration
                  </h3>
                  <div className="glass-card rounded-lg p-4">
                    <Toggle
                      label="Enable LLM"
                      checked={formData.llmEnabled}
                      onChange={checked => setFormData({ ...formData, llmEnabled: checked })}
                    />

                    {formData.llmEnabled && (
                      <div className="mt-4 grid grid-cols-1 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Provider
                          </label>
                          <select
                            value={formData.llmProvider}
                            onChange={e => setFormData({ ...formData, llmProvider: e.target.value })}
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="OpenAI" className="dark:bg-slate-800">
                              OpenAI
                            </option>
                            <option value="Anthropic" className="dark:bg-slate-800">
                              Anthropic
                            </option>
                            <option value="Gemini" className="dark:bg-slate-800">
                              Gemini
                            </option>
                            <option value="Groq" className="dark:bg-slate-800">
                              Groq
                            </option>
                            <option value="Ollama" className="dark:bg-slate-800">
                              Ollama
                            </option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Model
                            </label>
                            <input
                              type="text"
                              value={formData.llmModel}
                              onChange={e => setFormData({ ...formData, llmModel: e.target.value })}
                              className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="gpt-4, claude-3, etc."
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              API Key
                            </label>
                            <input
                              type="password"
                              value={formData.llmApiKey}
                              onChange={e => setFormData({ ...formData, llmApiKey: e.target.value })}
                              className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Your API key"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Base URL
                          </label>
                          <input
                            type="url"
                            value={formData.llmBaseUrl}
                            onChange={e => setFormData({ ...formData, llmBaseUrl: e.target.value })}
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://api.openai.com/v1"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => alert('LLM connection test - Coming soon!')}
                          className="flex items-center justify-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                          <FiZap size={14} />
                          Test LLM Connection
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Authorization Configuration */}
                <div className="mb-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Authorization
                  </h3>
                  <div className="glass-card rounded-lg p-4">
                    <Toggle
                      label="Enable Authorization"
                      checked={formData.authorizationEnabled}
                      onChange={checked => setFormData({ ...formData, authorizationEnabled: checked })}
                    />

                    {formData.authorizationEnabled && (
                      <div className="mt-4 grid grid-cols-1 gap-4">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                            className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="Bearer Token" className="dark:bg-slate-800">
                              Bearer Token
                            </option>
                            <option value="API Key" className="dark:bg-slate-800">
                              API Key
                            </option>
                            <option value="Basic Auth" className="dark:bg-slate-800">
                              Basic Auth
                            </option>
                            <option value="OAuth2" className="dark:bg-slate-800">
                              OAuth2
                            </option>
                          </select>
                        </div>

                        {formData.authType === 'Bearer Token' && (
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Token
                            </label>
                            <input
                              type="password"
                              value={formData.authToken}
                              onChange={e => setFormData({ ...formData, authToken: e.target.value })}
                              className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter token or use ${API_TOKEN}"
                            />
                          </div>
                        )}

                        {formData.authType === 'API Key' && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Key
                                </label>
                                <input
                                  type="text"
                                  value={formData.authKey}
                                  onChange={e => setFormData({ ...formData, authKey: e.target.value })}
                                  className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="e.g. X-API-Key"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Value
                                </label>
                                <input
                                  type="password"
                                  value={formData.authValue}
                                  onChange={e => setFormData({ ...formData, authValue: e.target.value })}
                                  className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter key value"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Add To
                              </label>
                              <select
                                value={formData.authLocation}
                                onChange={e =>
                                  setFormData({ ...formData, authLocation: e.target.value as 'header' | 'query' })
                                }
                                className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="header" className="dark:bg-slate-800">
                                  Header
                                </option>
                                <option value="query" className="dark:bg-slate-800">
                                  Query Params
                                </option>
                              </select>
                            </div>
                          </>
                        )}

                        {formData.authType === 'Basic Auth' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username
                              </label>
                              <input
                                type="text"
                                value={formData.authUsername}
                                onChange={e => setFormData({ ...formData, authUsername: e.target.value })}
                                className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Username"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                              </label>
                              <input
                                type="password"
                                value={formData.authPassword}
                                onChange={e => setFormData({ ...formData, authPassword: e.target.value })}
                                className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Password"
                              />
                            </div>
                          </div>
                        )}

                        {formData.authType === 'OAuth2' && (
                          <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Client ID
                                </label>
                                <input
                                  type="text"
                                  value={formData.oauthClientId}
                                  onChange={e => setFormData({ ...formData, oauthClientId: e.target.value })}
                                  className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Client ID"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Client Secret
                                </label>
                                <input
                                  type="password"
                                  value={formData.oauthClientSecret}
                                  onChange={e => setFormData({ ...formData, oauthClientSecret: e.target.value })}
                                  className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Client Secret"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Access Token URL
                              </label>
                              <input
                                type="url"
                                value={formData.oauthTokenUrl}
                                onChange={e => setFormData({ ...formData, oauthTokenUrl: e.target.value })}
                                className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://auth.example.com/oauth/token"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Scope
                              </label>
                              <input
                                type="text"
                                value={formData.oauthScope}
                                onChange={e => setFormData({ ...formData, oauthScope: e.target.value })}
                                className="glass-input w-full rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="read write"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 p-6 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10">
                Cancel
              </button>
              <button
                type="button"
                onClick={editingEnvironment ? handleUpdate : handleCreate}
                className="glass-button flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                <FiFileText size={16} />
                {editingEnvironment ? 'Update Environment' : 'Create Environment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
