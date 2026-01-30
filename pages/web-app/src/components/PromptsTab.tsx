import { useState, useEffect, useMemo } from 'react';
import {
  FiMessageSquare,
  FiList,
  FiGrid,
  FiSearch,
  FiPlus,
  FiPlay,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiCode,
  FiXCircle,
  FiSave,
  FiChevronDown,
} from 'react-icons/fi';
import { promptStorage, type Prompt } from '../lib/promptStorage';
import { webService, type WebServiceMessage } from '../lib/webService';
import { generateNewTaskId } from '../utils';
import { testSuiteStorage, type TestSuite } from '../lib/testSuiteStorage';
import { ExecutionState } from '../types/event';

interface PromptsTabProps {
  projectId: string;
  onExecutePrompt: (promptContent: string) => void;
}

export default function PromptsTab({ projectId, onExecutePrompt }: PromptsTabProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showGeneratedCodeModal, setShowGeneratedCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    prompt: Prompt;
    baseUrl: string;
    autoSavedTestCaseId?: string;
  } | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    promptContent: '',
    testType: 'UI Test' as Prompt['testType'],
    tags: '',
    additionalContext: '',
    baseUrl: '',
    additionalInformation: '',
  });

  useEffect(() => {
    // Load prompts and test suites in parallel for better performance
    Promise.all([loadPrompts(), loadTestSuites()]).catch(error => {
      console.error('Failed to load initial data:', error);
    });
  }, [projectId]);

  // Listen for generated test code
  useEffect(() => {
    const handleTestCodeGenerated = (event: Event) => {
      console.log('[PromptsTab] ========== testCodeGenerated event received ==========');
      console.log('[PromptsTab] Event type:', event.type);
      console.log('[PromptsTab] Event target:', event.target);

      const customEvent = event as CustomEvent;
      console.log('[PromptsTab] Event detail:', customEvent.detail);
      console.log('[PromptsTab] Event detail type:', typeof customEvent.detail);
      console.log('[PromptsTab] Event detail keys:', customEvent.detail ? Object.keys(customEvent.detail) : 'null');

      const detail = customEvent.detail || {};
      const { code, prompt, baseUrl, autoSavedTestCaseId } = detail;

      console.log('[PromptsTab] Extracted values:', {
        hasCode: !!code,
        codeType: typeof code,
        codeLength: code?.length,
        hasPrompt: !!prompt,
        promptType: typeof prompt,
        promptTitle: prompt?.title,
        hasBaseUrl: !!baseUrl,
        autoSavedTestCaseId,
      });

      if (!code || !prompt) {
        console.error('[PromptsTab] ❌ Invalid event data - missing code or prompt:', {
          hasCode: !!code,
          hasPrompt: !!prompt,
          detail: customEvent.detail,
          detailKeys: customEvent.detail ? Object.keys(customEvent.detail) : [],
        });
        return;
      }

      console.log('[PromptsTab] ✅ Valid event data received:', {
        codeLength: code.length,
        promptTitle: prompt.title,
        promptId: prompt.id,
        baseUrl: baseUrl,
      });

      console.log('[PromptsTab] Setting generated code and showing modal...');
      try {
        setGeneratedCode({ code, prompt, baseUrl, autoSavedTestCaseId });
        setShowGeneratedCodeModal(true);
        console.log('[PromptsTab] ✅ Modal state set - should be visible now');
      } catch (error) {
        console.error('[PromptsTab] ❌ Error setting modal state:', error);
      }

      // Load test suites if not loaded
      loadTestSuites();
    };

    console.log('[PromptsTab] Setting up testCodeGenerated event listener for project:', projectId);

    // Listen on window
    window.addEventListener('testCodeGenerated', handleTestCodeGenerated);

    // Also listen on document
    document.addEventListener('testCodeGenerated', handleTestCodeGenerated);

    // Debug: Log all custom events
    const debugHandler = (e: Event) => {
      if (e.type === 'testCodeGenerated') {
        console.log('[PromptsTab] DEBUG: testCodeGenerated event detected on', e.target);
      }
    };
    window.addEventListener('testCodeGenerated', debugHandler, true); // Use capture phase

    return () => {
      // Cleanup: Remove event listeners when component unmounts or projectId changes
      // This is normal React behavior to prevent memory leaks
      window.removeEventListener('testCodeGenerated', handleTestCodeGenerated);
      document.removeEventListener('testCodeGenerated', handleTestCodeGenerated);
      window.removeEventListener('testCodeGenerated', debugHandler, true);
    };
  }, [projectId]);

  // Debug: Log when modal state changes
  useEffect(() => {
    if (showGeneratedCodeModal || generatedCode) {
      console.log('[PromptsTab] Modal state changed:', {
        showGeneratedCodeModal,
        hasGeneratedCode: !!generatedCode,
        codeLength: generatedCode?.code?.length,
      });
    }
  }, [showGeneratedCodeModal, generatedCode]);

  const loadTestSuites = async () => {
    try {
      const suites = await testSuiteStorage.getTestSuitesByProject(projectId);
      setTestSuites(suites);
      if (suites.length > 0 && !selectedTestSuiteId) {
        setSelectedTestSuiteId(suites[0].id);
      }
    } catch (error) {
      console.error('Failed to load test suites:', error);
    }
  };

  const loadPrompts = async () => {
    try {
      setIsLoadingPrompts(true);
      const projectPrompts = await promptStorage.getPromptsByProject(projectId);
      setPrompts(projectPrompts);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setPrompts([]);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Memoize filtered prompts for better performance
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) return prompts;
    const query = searchQuery.toLowerCase();
    return prompts.filter(prompt => {
      return (
        prompt.title.toLowerCase().includes(query) ||
        prompt.description.toLowerCase().includes(query) ||
        prompt.promptContent.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  }, [prompts, searchQuery]);

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.promptContent.trim()) return;

    try {
      const tags = formData.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (editingPrompt) {
        await promptStorage.updatePrompt(editingPrompt.id, {
          ...formData,
          tags,
        });
      } else {
        await promptStorage.createPrompt({
          projectId,
          ...formData,
          tags,
        });
      }
      await loadPrompts();
      setShowCreateModal(false);
      setEditingPrompt(null);
      setFormData({
        title: '',
        description: '',
        promptContent: '',
        testType: 'UI Test',
        tags: '',
        additionalContext: '',
        baseUrl: '',
        additionalInformation: '',
      });
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      description: prompt.description,
      promptContent: prompt.promptContent,
      testType: prompt.testType,
      tags: prompt.tags.join(', '),
      additionalContext: prompt.additionalContext || '',
      baseUrl: prompt.baseUrl || '',
      additionalInformation: prompt.additionalInformation || '',
    });
    setShowCreateModal(true);
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
      await promptStorage.deletePrompt(id);
      await loadPrompts();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };

  const handleDuplicatePrompt = async (id: string) => {
    try {
      await promptStorage.duplicatePrompt(id);
      await loadPrompts();
    } catch (error) {
      console.error('Failed to duplicate prompt:', error);
    }
  };

  const handleExecutePrompt = async (promptContent: string) => {
    try {
      // Call the callback if provided (for navigation or other actions)
      if (onExecutePrompt) {
        onExecutePrompt(promptContent);
      }

      // Dispatch event to show generating notification
      window.dispatchEvent(new CustomEvent('promptExecutionStarted', { detail: { promptContent } }));

      // Send the prompt content to the LLM API via webService
      const taskId = generateNewTaskId();
      const message: WebServiceMessage = {
        type: 'new_task',
        task: promptContent,
        taskId: taskId,
        projectId, // Pass projectId for correct LLM settings
      };

      await webService.sendMessage(message);
    } catch (error) {
      console.error('Failed to execute prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute prompt';

      // Provide user-friendly error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('Could not establish connection') || errorMessage.includes('Extension not available')) {
        userMessage =
          'Extension not available. Please ensure:\n\n1. The Chrome extension is installed and enabled\n2. The extension ID is correctly configured in Settings → Extension\n3. The extension is not disabled or uninstalled\n4. Try reloading the extension if it was recently updated';
      }

      alert(`Error: ${userMessage}`);
    }
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Prompts</h2>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                className="glass-input w-64 rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/50 dark:text-white dark:placeholder:text-gray-400"
              />
            </div>
            {/* View Toggle */}
            <div className="glass-panel flex rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-md px-3 py-1.5 transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-white/5'
                }`}>
                <FiList size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-md px-3 py-1.5 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-600 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-white/5'
                }`}>
                <FiGrid size={18} />
              </button>
            </div>
            {/* Create Button */}
            <button
              type="button"
              onClick={() => {
                setEditingPrompt(null);
                setFormData({
                  title: '',
                  description: '',
                  promptContent: '',
                  testType: 'UI Test',
                  tags: '',
                  additionalContext: '',
                  baseUrl: '',
                  additionalInformation: '',
                });
                setShowCreateModal(true);
              }}
              className="glass-button flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30">
              <FiPlus size={18} />
              Create New Prompt
            </button>
          </div>
        </div>
      </div>

      {/* Prompts List/Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredPrompts.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <FiMessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No prompts yet</p>
              <p className="mt-2 text-sm">Create your first prompt to get started</p>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredPrompts.map(prompt => (
              <PromptListItem
                key={prompt.id}
                prompt={prompt}
                onEdit={() => handleEditPrompt(prompt)}
                onDelete={() => handleDeletePrompt(prompt.id)}
                onDuplicate={() => handleDuplicatePrompt(prompt.id)}
                onExecute={() => handleExecutePrompt(prompt.promptContent)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrompts.map(prompt => (
              <PromptGridItem
                key={prompt.id}
                prompt={prompt}
                onEdit={() => handleEditPrompt(prompt)}
                onDelete={() => handleDeletePrompt(prompt.id)}
                onDuplicate={() => handleDuplicatePrompt(prompt.id)}
                onExecute={() => handleExecutePrompt(prompt.promptContent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreatePromptModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreatePrompt}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPrompt(null);
            setFormData({
              title: '',
              description: '',
              promptContent: '',
              testType: 'UI Test',
              tags: '',
              additionalContext: '',
              baseUrl: '',
              additionalInformation: '',
            });
          }}
          editingPrompt={editingPrompt}
        />
      )}

      {/* Generated Test Code Modal */}
      {showGeneratedCodeModal && generatedCode && (
        <GeneratedCodeModal
          code={generatedCode.code}
          prompt={generatedCode.prompt}
          baseUrl={generatedCode.baseUrl}
          testSuites={testSuites}
          selectedTestSuiteId={selectedTestSuiteId}
          onTestSuiteChange={setSelectedTestSuiteId}
          onSave={async (testSuiteId, testCaseName) => {
            try {
              console.log('[PromptsTab] ========== Saving test case ==========');
              console.log('[PromptsTab] Test suite ID:', testSuiteId);
              console.log('[PromptsTab] Test case name:', testCaseName);
              console.log('[PromptsTab] Playwright code length:', generatedCode.code.length);
              console.log('[PromptsTab] Base URL:', generatedCode.baseUrl);
              console.log('[PromptsTab] Auto-saved ID:', generatedCode.autoSavedTestCaseId);

              let testCaseId = generatedCode.autoSavedTestCaseId;

              if (testCaseId) {
                // Update existing auto-saved test case
                console.log('[PromptsTab] Updating auto-saved test case:', testCaseId);
                await testSuiteStorage.updateTestCase(testCaseId, {
                  testSuiteId,
                  name: testCaseName || generatedCode.prompt.title,
                  // Ensure these are set if they weren't already
                  playwrightCode: generatedCode.code,
                  baseUrl: generatedCode.baseUrl,
                  status: 'pass',
                  lastRunAt: Date.now(),
                });
                console.log('[PromptsTab] ✅ Auto-saved test case updated');
              } else {
                // Create new test case (fallback)
                console.log('[PromptsTab] Creating new test case (no auto-save found)');
                const newTestCase = await testSuiteStorage.createTestCase({
                  testSuiteId,
                  name: testCaseName || generatedCode.prompt.title,
                  description:
                    generatedCode.prompt.description ||
                    `Test case generated from prompt: ${generatedCode.prompt.promptContent.substring(0, 100)}`,
                  prompt: generatedCode.prompt.promptContent,
                  playwrightCode: generatedCode.code,
                  baseUrl: generatedCode.baseUrl,
                  status: 'pass',
                  lastRunAt: Date.now(),
                });
                testCaseId = newTestCase.id;
                console.log('[PromptsTab] ✅ New test case created:', testCaseId);
              }

              setShowGeneratedCodeModal(false);
              setGeneratedCode(null);
              await loadTestSuites();

              // Notify to refresh test suites tab
              console.log('[PromptsTab] Dispatching testCaseCreated event');
              window.dispatchEvent(
                new CustomEvent('testCaseCreated', { detail: { testCaseId: testCaseId, suiteId: testSuiteId } }),
              );

              console.log('[PromptsTab] ✅ Test case saved successfully!');
            } catch (error) {
              console.error('[PromptsTab] ❌ Failed to save test case:', error);
              alert('Failed to save test case. Please try again.');
            }
          }}
          onClose={() => {
            setShowGeneratedCodeModal(false);
            setGeneratedCode(null);
          }}
        />
      )}
    </div>
  );
}

interface GeneratedCodeModalProps {
  code: string;
  prompt: Prompt;
  baseUrl: string;
  testSuites: TestSuite[];
  selectedTestSuiteId: string;
  onTestSuiteChange: (suiteId: string) => void;
  onSave: (testSuiteId: string, testCaseName: string) => Promise<void>;
  onClose: () => void;
}

function GeneratedCodeModal({
  code,
  prompt,
  baseUrl,
  testSuites,
  selectedTestSuiteId,
  onTestSuiteChange,
  onSave,
  onClose,
}: GeneratedCodeModalProps) {
  const [testCaseName, setTestCaseName] = useState(prompt.title || 'Generated Test');
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  const handleSave = async () => {
    if (!selectedTestSuiteId) {
      alert('Please select a test suite');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(selectedTestSuiteId, testCaseName);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <FiCode size={20} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Generated Test Code</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
            <FiXCircle size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Test Case Info */}
          <div className="mb-6 rounded-xl border border-white/10 bg-white/50 p-6 dark:bg-white/5">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Case Name *
              </label>
              <input
                type="text"
                value={testCaseName}
                onChange={e => setTestCaseName(e.target.value)}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                placeholder="Enter test case name"
              />
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Test Suite *</label>
              <div className="relative">
                <select
                  value={selectedTestSuiteId}
                  onChange={e => onTestSuiteChange(e.target.value)}
                  className="glass-input w-full appearance-none rounded-xl px-4 py-3 text-sm text-gray-900 outline-none dark:text-white">
                  <option value="" className="dark:bg-slate-800">
                    Select a test suite
                  </option>
                  {testSuites.map(suite => (
                    <option key={suite.id} value={suite.id} className="dark:bg-slate-800">
                      {suite.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <FiGrid size={16} />
                </div>
              </div>
            </div>
            {testSuites.length === 0 && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                No test suites found. Please create a test suite first in the Test Suites tab.
              </p>
            )}
          </div>

          {/* Code Display */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Playwright Test Code</h3>
              <button
                type="button"
                onClick={handleCopyCode}
                className="glass-button flex items-center gap-2 rounded-lg bg-gray-200/50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300/50 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">
                <FiCopy size={12} />
                Copy Code
              </button>
            </div>
            <div
              className="relative max-h-96 overflow-auto rounded-xl border border-white/10 bg-[#1e1e1e] shadow-inner"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              }}>
              <pre
                className="m-0 p-4 text-xs leading-relaxed text-white"
                style={{
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  whiteSpace: 'pre',
                  overflowWrap: 'normal',
                  wordBreak: 'normal',
                  fontFamily: 'inherit',
                  backgroundColor: '#1e1e1e',
                  color: '#ffffff',
                  margin: 0,
                  padding: '1rem',
                }}>
                <code
                  className="block"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: '#ffffff',
                    display: 'block',
                  }}>
                  {code}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-200/50 px-6 py-2.5 font-medium text-gray-700 backdrop-blur-sm transition-all hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedTestSuiteId || !testCaseName.trim() || isSaving}
            className={`glass-button flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold text-white shadow-lg transition-all ${
              !selectedTestSuiteId || !testCaseName.trim() || isSaving
                ? 'cursor-not-allowed opacity-50'
                : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30'
            }`}>
            <FiSave size={18} />
            {isSaving ? 'Saving...' : 'Save Test Case'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptListItemProps {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExecute: () => void;
}

function PromptListItem({ prompt, onEdit, onDelete, onDuplicate, onExecute }: PromptListItemProps) {
  return (
    <div className="glass-card group flex items-center gap-4 rounded-xl p-4 transition-all hover:shadow-lg dark:hover:shadow-white/5">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white">{prompt.title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {prompt.description || prompt.baseUrl || 'No description'}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {prompt.testType}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Created: {new Date(prompt.createdAt).toLocaleDateString()}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Tags: {prompt.tags.length > 0 ? prompt.tags.join(', ') : 'None'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onExecute}
          className="glass-button rounded-lg border border-blue-200/50 bg-blue-50/50 p-2 text-blue-600 hover:bg-blue-100/50 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
          title="Execute">
          <FiPlay size={18} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          title="Edit">
          <FiEdit2 size={18} />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          title="Duplicate">
          <FiCopy size={18} />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50/50 dark:text-red-400 dark:hover:bg-red-900/20"
          title="Delete">
          <FiTrash2 size={18} />
        </button>
      </div>
    </div>
  );
}

interface PromptGridItemProps {
  prompt: Prompt;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExecute: () => void;
}

function PromptGridItem({ prompt, onEdit, onDelete, onDuplicate, onExecute }: PromptGridItemProps) {
  return (
    <div className="glass-card group relative flex flex-col rounded-xl p-5 transition-all hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-white/5">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="line-clamp-1 flex-1 font-semibold text-gray-900 dark:text-white">{prompt.title}</h3>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onExecute}
            className="glass-button rounded-lg bg-blue-50/50 p-1.5 text-blue-600 hover:bg-blue-100/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
            title="Execute">
            <FiPlay size={16} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="glass-button rounded-lg p-1.5 text-gray-500 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-white/10"
            title="Edit">
            <FiEdit2 size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="glass-button rounded-lg p-1.5 text-red-500 hover:bg-red-50/50 dark:text-red-400 dark:hover:bg-red-900/20"
            title="Delete">
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>
      <p className="mb-4 line-clamp-3 flex-1 text-sm text-gray-600 dark:text-gray-400">
        {prompt.description || prompt.baseUrl || 'No description'}
      </p>
      <div className="space-y-2 border-t border-gray-100 pt-3 text-xs dark:border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Type</span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {prompt.testType}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Created</span>
          <span className="text-gray-900 dark:text-white">{new Date(prompt.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Tags</span>
          <span className="max-w-[60%] truncate text-gray-900 dark:text-white">
            {prompt.tags.length > 0 ? prompt.tags.join(', ') : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PromptFormData {
  title: string;
  description: string;
  promptContent: string;
  testType: Prompt['testType'];
  tags: string;
  additionalContext: string;
  baseUrl: string;
  additionalInformation: string;
}

interface CreatePromptModalProps {
  formData: PromptFormData;
  setFormData: (data: PromptFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editingPrompt: Prompt | null;
}

function CreatePromptModal({ formData, setFormData, onSubmit, onClose, editingPrompt }: CreatePromptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
            <FiXCircle size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          {/* Title */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="Enter prompt title"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="Enter prompt description"
            />
          </div>

          {/* Prompt Content */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Content *</label>
            <textarea
              required
              value={formData.promptContent}
              onChange={e => setFormData({ ...formData, promptContent: e.target.value })}
              rows={6}
              className="glass-input w-full rounded-xl px-4 py-3 font-mono text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="Enter your test prompt (e.g., 'Navigate to login, enter username/password, click login, validate dashboard')"
            />
          </div>

          {/* Test Type */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Test Type</label>
            <div className="relative">
              <select
                value={formData.testType}
                onChange={e => setFormData({ ...formData, testType: e.target.value as Prompt['testType'] })}
                className="glass-input w-full appearance-none rounded-xl px-4 py-3 text-sm text-gray-900 outline-none dark:text-white">
                <option value="UI Test" className="dark:bg-slate-800">
                  UI Test
                </option>
                <option value="API Test" className="dark:bg-slate-800">
                  API Test
                </option>
                <option value="Integration Test" className="dark:bg-slate-800">
                  Integration Test
                </option>
                <option value="E2E Test" className="dark:bg-slate-800">
                  E2E Test
                </option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                <FiChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="smoke, regression, critical"
            />
          </div>

          {/* Additional Context */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Context
            </label>
            <textarea
              value={formData.additionalContext}
              onChange={e => setFormData({ ...formData, additionalContext: e.target.value })}
              rows={3}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="Any additional context for the test"
            />
          </div>

          {/* Base URL */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Base URL</label>
            <input
              type="url"
              value={formData.baseUrl}
              onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="https://example.com"
            />
          </div>

          {/* Additional Information */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional Information
            </label>
            <textarea
              value={formData.additionalInformation}
              onChange={e => setFormData({ ...formData, additionalInformation: e.target.value })}
              rows={3}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="Any additional information or requirements"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-200/50 px-6 py-2.5 font-medium text-gray-700 backdrop-blur-sm transition-all hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
              <FiSave size={18} />
              {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
