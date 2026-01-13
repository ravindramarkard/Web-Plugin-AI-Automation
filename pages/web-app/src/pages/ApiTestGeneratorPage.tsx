import { useState, useEffect } from 'react';
import {
  FiCloud,
  FiFile,
  FiGlobe,
  FiDatabase,
  FiCheckCircle,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiSettings,
  FiPlay,
} from 'react-icons/fi';
import { environmentStorage, type Environment } from '../lib/environmentStorage';
import { apiPost, API_ENDPOINTS } from '../lib/apiConfig';

interface ApiTestGeneratorPageProps {
  projectId?: string;
}

interface Endpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  operationId: string;
}

export default function ApiTestGeneratorPage({ projectId }: ApiTestGeneratorPageProps) {
  const [activeTab, setActiveTab] = useState<'api' | 'environment' | 'swagger' | 'file'>('environment');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null);
  const [isStep1Open, setIsStep1Open] = useState(true);
  const [isStep2Open, setIsStep2Open] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [filterText, setFilterText] = useState('');

  const [selectedEndpointIndices, setSelectedEndpointIndices] = useState<Set<number>>(new Set());
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(
    new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  );

  // Step 3 state
  const [isStep3Open, setIsStep3Open] = useState(false);
  const [testName, setTestName] = useState('');
  const [testFramework, setTestFramework] = useState('Playwright API');
  const [generationMode, setGenerationMode] = useState<'independent' | 'e2e' | 'variations'>('independent');
  const [variationTypes, setVariationTypes] = useState<Record<string, boolean>>({
    'Happy Path': true,
    'Edge Cases': false,
    'Performance Tests': false,
    'Data Validation': false,
    'Error Cases': false,
    'Security Tests': false,
    'Boundary Conditions': false,
  });
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Fetch environments on mount
  useEffect(() => {
    const loadEnvironments = async () => {
      const envs = await environmentStorage.getAllEnvironments(projectId);
      setEnvironments(envs);
      if (envs.length > 0) {
        setSelectedEnvId(envs[0].id);
        const env = envs[0];
        setSelectedEnv(env);
        setSwaggerUrl(
          env.variables?.['SWAGGER_URL'] ||
            env.apiUrl ||
            (env.baseUrl ? env.baseUrl.replace(/\/+$/, '') + '/swagger.json' : ''),
        );
      }
    };
    loadEnvironments();
  }, [projectId]);

  const handleEnvChange = (envId: string) => {
    setSelectedEnvId(envId);
    const env = environments.find(e => e.id === envId);
    setSelectedEnv(env || null);
    if (env) {
      setSwaggerUrl(
        env.variables?.['SWAGGER_URL'] ||
          env.apiUrl ||
          (env.baseUrl ? env.baseUrl.replace(/\/+$/, '') + '/swagger.json' : ''),
      );
    } else {
      setSwaggerUrl('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          setFileContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadEndpoints = async () => {
    setIsLoading(true);
    try {
      let response;

      if (activeTab === 'environment' && selectedEnv && swaggerUrl) {
        response = await apiPost<{ success: boolean; endpoints: Endpoint[] }>(
          `${API_ENDPOINTS.testGen}/parse-swagger`,
          {
            source: 'url',
            url: swaggerUrl,
            authType: selectedEnv.authType,
            authToken: selectedEnv.authToken,
            username: selectedEnv.username,
            password: selectedEnv.password,
          },
        );
      } else if (activeTab === 'swagger' && swaggerUrl) {
        response = await apiPost<{ success: boolean; endpoints: Endpoint[] }>(
          `${API_ENDPOINTS.testGen}/parse-swagger`,
          {
            source: 'url',
            url: swaggerUrl,
          },
        );
      } else if (activeTab === 'file' && fileContent) {
        response = await apiPost<{ success: boolean; endpoints: Endpoint[] }>(
          `${API_ENDPOINTS.testGen}/parse-swagger`,
          {
            source: 'text',
            content: fileContent,
          },
        );
      }

      if (response) {
        if (response.success && Array.isArray(response.endpoints)) {
          setEndpoints(response.endpoints);
          setIsStep1Open(false);
          setIsStep2Open(true);
          setStep2Complete(false);
          setIsStep3Open(false);
        } else {
          alert('No endpoints found in the provided source.');
        }
      }
    } catch (error) {
      console.error('Failed to load endpoints:', error);
      alert('Failed to load endpoints: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEndpointSelection = (index: number) => {
    const newSet = new Set(selectedEndpointIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedEndpointIndices(newSet);
  };

  const toggleMethodFilter = (method: string) => {
    const newSet = new Set(selectedMethods);
    if (newSet.has(method)) {
      newSet.delete(method);
    } else {
      newSet.add(method);
    }
    setSelectedMethods(newSet);
  };

  const filteredEndpoints = endpoints
    .map((ep, index) => ({ ...ep, originalIndex: index }))
    .filter(
      ep =>
        (ep.path.toLowerCase().includes(filterText.toLowerCase()) ||
          ep.summary?.toLowerCase().includes(filterText.toLowerCase())) &&
        selectedMethods.has(ep.method),
    );

  const handleSelectAll = () => {
    const newSet = new Set(selectedEndpointIndices);
    filteredEndpoints.forEach(ep => newSet.add(ep.originalIndex));
    setSelectedEndpointIndices(newSet);
  };

  const handleDeselectAll = () => {
    const newSet = new Set(selectedEndpointIndices);
    filteredEndpoints.forEach(ep => newSet.delete(ep.originalIndex));
    setSelectedEndpointIndices(newSet);
  };

  const handleGenerateTests = async () => {
    if (selectedEndpointIndices.size === 0) {
      alert('Please select at least one endpoint to generate tests.');
      return;
    }
    if (!testName.trim()) {
      alert('Please enter a test name.');
      return;
    }
    if (!projectId) {
      alert('Project ID is missing.');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedEndpoints = endpoints.filter((_, index) => selectedEndpointIndices.has(index));

      const response = await apiPost<{ success: boolean; testCaseId: string; generatedCode?: string }>(
        `${API_ENDPOINTS.testGen}/generate-api-tests`,
        {
          projectId,
          endpoints: selectedEndpoints,
          testName,
          testFramework,
          generationMode,
          variationTypes:
            generationMode === 'variations' ? Object.keys(variationTypes).filter(k => variationTypes[k]) : undefined,
          additionalInstructions,
          authDetails: selectedEnv
            ? {
                type: selectedEnv.authType,
                token: selectedEnv.authToken,
                username: selectedEnv.username,
                password: selectedEnv.password,
                apiKey: selectedEnv.variables?.['API_KEY'],
              }
            : undefined,
          baseUrl: selectedEnv?.baseUrl || swaggerUrl, // Fallback
        },
      );

      if (response.success && response.testCaseId) {
        // Navigate to the test case or show success
        alert(
          "Tests generated successfully! You can find them in the 'Generated API Tests' suite in the Test Suites tab.",
        );
        if (response.generatedCode) {
          setGeneratedCode(response.generatedCode);
        }
      } else {
        alert('Failed to generate tests: ' + (response as any).error);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { id: 'environment', label: 'From Environment', icon: FiDatabase },
    { id: 'swagger', label: 'Swagger URL', icon: FiGlobe },
    { id: 'file', label: 'Upload File', icon: FiFile },
  ];

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      alert('Code copied to clipboard!');
    }
  };

  const handleDownloadCode = () => {
    if (generatedCode) {
      const extension = testFramework === 'Rest Assured + TestNG' ? 'java' : 'ts';
      const blob = new Blob([generatedCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${testName.replace(/\s+/g, '_')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-transparent p-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <FiCloud className="text-blue-600" />
          API Test Generator
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Generate robust automated test cases from your API endpoints using AI
        </p>
      </header>

      <div className="space-y-6">
        {/* Step 1: Choose Endpoint Loading Method */}
        <div className="glass-card overflow-hidden rounded-xl p-0">
          <button
            onClick={() => setIsStep1Open(!isStep1Open)}
            className="glass-panel flex w-full items-center justify-between border-b border-white/10 px-6 py-4 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30">
                1
              </div>
              <div className="text-left">
                <h2 className="font-semibold text-gray-900 dark:text-white">Choose Endpoint Loading Method</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select how you want to load your API endpoints for test generation
                </p>
              </div>
            </div>
            {isStep1Open ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
          </button>

          {isStep1Open && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <FiCloud className="text-blue-500" />
                  Endpoint Loading Configuration
                </h3>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-4">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                          flex items-center gap-2 rounded-t-lg border-b-2 py-3 px-4 text-sm font-medium transition-all
                          ${
                            activeTab === tab.id
                              ? 'border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50/50 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800/50 dark:hover:text-gray-300'
                          }
                        `}>
                        <tab.icon className={activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'} />
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="glass-panel rounded-xl p-6">
                  {activeTab === 'environment' && (
                    <div className="space-y-6">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Load from a configured environment's Swagger URL
                        </label>
                        <select
                          value={selectedEnvId}
                          onChange={e => handleEnvChange(e.target.value)}
                          className="glass-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:text-white sm:text-sm">
                          <option value="" disabled>
                            Select Environment
                          </option>
                          {environments.map(env => (
                            <option key={env.id} value={env.id} className="dark:bg-gray-800">
                              {env.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedEnv && (
                        <div className="glass-panel rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                          <div className="mb-4 flex items-center gap-2">
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                              OAUTH2
                            </span>
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
                              ENABLED
                            </span>
                          </div>

                          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Authentication Details
                          </h4>

                          <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Username:</span>
                              <span className="font-mono text-sm text-gray-900 dark:text-white">
                                {selectedEnv.username || '-'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Password:</span>
                              <span className="font-mono text-sm text-gray-900 dark:text-white">********</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">API Key:</span>
                              <span className="font-mono text-sm text-gray-900 dark:text-white">
                                {selectedEnv.variables?.['API_KEY']
                                  ? '${API_KEY}'
                                  : selectedEnv.authType === 'API Key'
                                    ? '${API_KEY}'
                                    : '-'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Token:</span>
                              <span className="font-mono text-sm text-gray-900 dark:text-white">
                                {selectedEnv.variables?.['API_TOKEN']
                                  ? '${API_TOKEN}'
                                  : selectedEnv.authToken
                                    ? '${authToken}'
                                    : '-'}
                              </span>
                            </div>
                            {/* Display custom variables if any */}
                            {selectedEnv.variables &&
                              Object.entries(selectedEnv.variables).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{key}:</span>
                                  <span className="font-mono text-sm text-gray-900 dark:text-white">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'swagger' && (
                    <div className="space-y-6">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Swagger / OpenAPI Specification URL
                        </label>
                        <input
                          type="text"
                          value={swaggerUrl}
                          onChange={e => setSwaggerUrl(e.target.value)}
                          placeholder="https://petstore.swagger.io/v2/swagger.json"
                          className="glass-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Enter the full URL to the swagger.json or openapi.json file.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'file' && (
                    <div className="space-y-6">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Upload Swagger / OpenAPI File
                        </label>
                        <div className="glass-panel flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 dark:border-gray-600">
                          <div className="space-y-1 text-center">
                            <FiFile className="mx-auto size-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer rounded-md font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500 dark:text-blue-400">
                                <span>Upload a file</span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  className="sr-only"
                                  accept=".json,.yaml,.yml"
                                  onChange={handleFileChange}
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">JSON, YAML up to 10MB</p>
                            {fileName && (
                              <p className="mt-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                                Selected: {fileName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleLoadEndpoints}
                    disabled={
                      isLoading ||
                      (activeTab === 'environment' && !selectedEnvId) ||
                      (activeTab === 'swagger' && !swaggerUrl) ||
                      (activeTab === 'file' && !fileContent)
                    }
                    className={`glass-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                      ${
                        isLoading ||
                        (activeTab === 'environment' && !selectedEnvId) ||
                        (activeTab === 'swagger' && !swaggerUrl) ||
                        (activeTab === 'file' && !fileContent)
                          ? 'bg-blue-400/50 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                      }`}>
                    {isLoading ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FiCloud className="size-4" />
                        Load Endpoints
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Endpoints */}
        {endpoints.length > 0 && (
          <div className="glass-card overflow-hidden rounded-xl p-0">
            <button
              onClick={() => setIsStep2Open(!isStep2Open)}
              className="glass-panel flex w-full items-center justify-between border-b border-white/10 px-6 py-4 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 shadow-sm dark:bg-blue-900/50 dark:text-blue-300">
                  2
                </div>
                <div className="text-left">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Select Endpoints</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose which API endpoints you want to generate tests for
                  </p>
                </div>
              </div>
              {isStep2Open ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
            </button>

            {isStep2Open && (
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FiCheckCircle className="text-blue-500" />
                    Endpoint Selection
                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {selectedEndpointIndices.size} selected
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="glass-button rounded-lg px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="glass-button rounded-lg px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="relative mb-4">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search endpoints by path or summary..."
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    className="glass-input block w-full rounded-lg border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pb-4">
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                    <button
                      key={method}
                      onClick={() => toggleMethodFilter(method)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        selectedMethods.has(method)
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'glass-button border border-gray-200 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300'
                      }`}>
                      {method}
                    </button>
                  ))}
                </div>

                {filteredEndpoints.length > 0 ? (
                  <div className="glass-panel max-h-[500px] space-y-2 overflow-y-auto rounded-xl p-2 pr-2">
                    {filteredEndpoints.map(endpoint => (
                      <div
                        key={endpoint.originalIndex}
                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                          selectedEndpointIndices.has(endpoint.originalIndex)
                            ? 'border-blue-500 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-900/20'
                            : 'border-transparent bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10'
                        }`}
                        onClick={() => toggleEndpointSelection(endpoint.originalIndex)}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                              selectedEndpointIndices.has(endpoint.originalIndex)
                                ? 'border-blue-500 bg-blue-500 text-white'
                                : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'
                            }`}>
                            {selectedEndpointIndices.has(endpoint.originalIndex) && (
                              <FiCheckCircle className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span
                            className={`w-16 rounded px-2 py-1 text-center text-xs font-bold ${
                              endpoint.method === 'GET'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                : endpoint.method === 'POST'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                  : endpoint.method === 'PUT'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                                    : endpoint.method === 'DELETE'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                            {endpoint.method}
                          </span>
                          <div className="flex-1 overflow-hidden">
                            <h4
                              className="truncate font-mono text-sm font-medium text-gray-900 dark:text-white"
                              title={endpoint.path}>
                              {endpoint.path}
                            </h4>
                            {endpoint.summary && (
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400" title={endpoint.summary}>
                                {endpoint.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel rounded-xl border border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">
                      {endpoints.length === 0
                        ? 'No endpoints loaded. Please load endpoints in Step 1.'
                        : 'No endpoints match your search filters.'}
                    </p>
                  </div>
                )}

                {endpoints.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-6 dark:border-white/10">
                    <button
                      disabled={selectedEndpointIndices.size === 0}
                      onClick={() => {
                        setIsStep2Open(false);
                        setStep2Complete(true);
                        setIsStep3Open(true);
                      }}
                      className={`glass-button flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all ${
                        selectedEndpointIndices.size > 0
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                          : 'cursor-not-allowed bg-gray-300 dark:bg-gray-700'
                      }`}>
                      <FiSettings className="h-5 w-5" />
                      Next: Configure Tests ({selectedEndpointIndices.size} selected)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure & Generate */}
        {step2Complete && (
          <div className="glass-card overflow-hidden rounded-xl p-0">
            <button
              onClick={() => setIsStep3Open(!isStep3Open)}
              className="glass-panel flex w-full items-center justify-between border-b border-white/10 px-6 py-4 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 shadow-sm dark:bg-blue-900/50 dark:text-blue-300">
                  3
                </div>
                <div className="text-left">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Configure & Generate</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set up generation options and create your test suite
                  </p>
                </div>
              </div>
              {isStep3Open ? <FiChevronUp className="text-gray-500" /> : <FiChevronDown className="text-gray-500" />}
            </button>

            {isStep3Open && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <FiSettings className="text-blue-500" />
                    Generation Settings
                  </h3>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Test Suite Name
                      </label>
                      <input
                        type="text"
                        value={testName}
                        onChange={e => setTestName(e.target.value)}
                        placeholder="e.g., User Management API Tests"
                        className="glass-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Test Framework
                      </label>
                      <select
                        value={testFramework}
                        onChange={e => setTestFramework(e.target.value)}
                        className="glass-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm">
                        <option value="Playwright API" className="dark:bg-gray-800">
                          Playwright API (Recommended)
                        </option>
                        <option value="Jest + Supertest" className="dark:bg-gray-800">
                          Jest + Supertest
                        </option>
                        <option value="Axios + Mocha" className="dark:bg-gray-800">
                          Axios + Mocha
                        </option>
                        <option value="Rest Assured + TestNG" className="dark:bg-gray-800">
                          Rest Assured + TestNG
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Generation Mode
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={generationMode === 'independent'}
                            onChange={() => setGenerationMode('independent')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Independent Tests</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={generationMode === 'e2e'}
                            onChange={() => setGenerationMode('e2e')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">E2E Suite</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={generationMode === 'variations'}
                            onChange={() => setGenerationMode('variations')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Test Variations</span>
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {generationMode === 'independent'
                          ? 'Generates isolated tests for each endpoint.'
                          : generationMode === 'e2e'
                            ? 'Generates a chained workflow using selected endpoints.'
                            : 'Generates multiple scenarios (positive, negative, edge cases) for comprehensive coverage.'}
                      </p>

                      {generationMode === 'variations' && (
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {Object.keys(variationTypes).map(type => (
                            <label key={type} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={variationTypes[type]}
                                onChange={e => setVariationTypes(prev => ({ ...prev, [type]: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    value={additionalInstructions}
                    onChange={e => setAdditionalInstructions(e.target.value)}
                    placeholder="e.g., Use data-driven tests, handle edge cases for invalid IDs..."
                    rows={4}
                    className="glass-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:text-sm"
                  />
                </div>

                <div className="flex items-center justify-end border-t border-gray-200 pt-6 dark:border-white/10">
                  <button
                    onClick={handleGenerateTests}
                    disabled={isGenerating || selectedEndpointIndices.size === 0}
                    className={`glass-button 
                    flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${
                      isGenerating || selectedEndpointIndices.size === 0
                        ? 'cursor-not-allowed bg-gray-400 dark:bg-gray-600'
                        : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
                    }
                  `}>
                    {isGenerating ? (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Generating Tests...
                      </>
                    ) : (
                      <>
                        <FiPlay className="size-4" />
                        Generate {selectedEndpointIndices.size} Tests
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generated Code Result */}
        {generatedCode && (
          <div className="glass-card overflow-hidden rounded-xl p-0">
            <div className="glass-panel flex w-full items-center justify-between border-b border-white/10 bg-green-50/50 px-6 py-4 dark:bg-green-900/20">
              <div className="flex items-center gap-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-sm">
                  <FiCheckCircle className="size-5" />
                </div>
                <div className="text-left">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Generated API Test Code</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Review, copy, or download your generated test script
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex justify-end gap-2">
                <button
                  onClick={handleCopyCode}
                  className="glass-button flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">
                  <FiFile className="size-4" />
                  Copy Code
                </button>
                <button
                  onClick={handleDownloadCode}
                  className="glass-button flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-md hover:bg-blue-700 shadow-blue-500/30">
                  <FiCloud className="size-4" />
                  Download File
                </button>
              </div>

              <div className="max-h-[500px] overflow-auto rounded-xl bg-gray-900 p-4 shadow-inner">
                <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
