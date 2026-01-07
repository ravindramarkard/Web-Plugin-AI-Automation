import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiMessageSquare,
  FiList,
  FiFileText,
  FiSettings,
  FiArrowLeft,
  FiPlus,
  FiPlay,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCode,
  FiEye,
  FiCopy,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiTag,
  FiGrid,
  FiFolder,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiFile,
  FiDownload,
  FiSave,
  FiX,
  FiBarChart2,
  FiGlobe,
} from 'react-icons/fi';
import { projectStorage, type Project } from '../lib/projectStorage';
import { testSuiteStorage, type TestSuite, type TestCase, type TestSuiteSchedule } from '../lib/testSuiteStorage';
import SettingsPage from './SettingsPage';
import EnvironmentSettings from '../components/EnvironmentSettings';
import PromptsTab from '../components/PromptsTab';
import ChatView from '../components/ChatView';
import GeneratingNotification from '../components/GeneratingNotification';
import { webService } from '../lib/webService';
import { ExecutionState } from '../types/event';

type TabType = 'prompt' | 'test-suite' | 'report' | 'settings' | 'environments';

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('prompt');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [selectedTestSuite, setSelectedTestSuite] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [showCreateSuiteModal, setShowCreateSuiteModal] = useState(false);
  const [showCreateCaseModal, setShowCreateCaseModal] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [schedulingSuite, setSchedulingSuite] = useState<TestSuite | null>(null);
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTestCases, setIsLoadingTestCases] = useState(false);
  const [isLoadingTestSuites, setIsLoadingTestSuites] = useState(false);
  const [viewingPlaywrightCode, setViewingPlaywrightCode] = useState<{ testCase: TestCase } | null>(null);

  const [suiteFormData, setSuiteFormData] = useState({ name: '', description: '', testType: 'UI Tests' });
  const [selectedTestCasesForSuite, setSelectedTestCasesForSuite] = useState<Set<string>>(new Set());
  const [availableTestCases, setAvailableTestCases] = useState<TestCase[]>([]);
  const [testsInSuite, setTestsInSuite] = useState<TestCase[]>([]);
  const [caseFormData, setCaseFormData] = useState({ name: '', description: '', prompt: '', playwrightCode: '' });
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<{ testCase: TestCase } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('AI Generating script for you');

  // Define loadTestCases and loadTestSuites BEFORE useEffect hooks that use them
  const loadTestCases = async (suiteId?: string) => {
    try {
      setIsLoadingTestCases(true);
      console.log('[ProjectDetailPage] ========== Loading test cases ==========');

      if (suiteId) {
        // Load cases for a specific suite
        console.log('[ProjectDetailPage] Suite ID:', suiteId);
        const cases = await testSuiteStorage.getTestCasesBySuite(suiteId);
        console.log('[ProjectDetailPage] Loaded test cases for suite:', cases.length);
        setTestCases(Array.isArray(cases) ? cases : []);
      } else {
        // Load all test cases across all suites for the project
        const [allCases, projectSuites] = await Promise.all([
          testSuiteStorage.getTestCases(),
          testSuiteStorage.getTestSuitesByProject(projectId!),
        ]);
        const suiteIds = new Set(projectSuites.map(s => s.id));
        const projectCases = Array.isArray(allCases) ? allCases.filter(tc => suiteIds.has(tc.testSuiteId)) : [];
        console.log('[ProjectDetailPage] Loaded all test cases for project:', projectCases.length);
        setTestCases(projectCases);
      }
      console.log('[ProjectDetailPage] ========== Test cases loaded ==========');
    } catch (error) {
      console.error('[ProjectDetailPage] Failed to load test cases:', error);
      setTestCases([]);
    } finally {
      setIsLoadingTestCases(false);
    }
  };

  const loadTestSuites = async () => {
    if (!projectId) return;
    try {
      setIsLoadingTestSuites(true);
      const suites = await testSuiteStorage.getTestSuitesByProject(projectId);
      setTestSuites(Array.isArray(suites) ? suites : []);
      if (suites.length > 0 && !selectedTestSuite) {
        setSelectedTestSuite(suites[0].id);
      } else if (suites.length === 0) {
        setSelectedTestSuite(null);
      }
    } catch (error) {
      console.error('Failed to load test suites:', error);
      setTestSuites([]);
    } finally {
      setIsLoadingTestSuites(false);
    }
  };

  const loadProjectData = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      // Load project and test suites in parallel for better performance
      const [proj, suites] = await Promise.all([
        projectStorage.getProject(projectId),
        testSuiteStorage.getTestSuitesByProject(projectId),
      ]);

      if (!proj) {
        navigate('/projects');
        return;
      }

      setProject(proj);
      setTestSuites(Array.isArray(suites) ? suites : []);
      if (suites.length > 0 && !selectedTestSuite) {
        setSelectedTestSuite(suites[0].id);
      } else if (suites.length === 0) {
        setSelectedTestSuite(null);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    // When in "test-suite" tab, load cases based on selected suite
    if (activeTab === 'test-suite') {
      if (selectedTestSuite) {
        loadTestCases(selectedTestSuite);
      } else {
        // No suite selected, load all cases for project
        if (projectId) {
          loadTestCases();
        } else {
          setTestCases([]);
        }
      }
    }
  }, [selectedTestSuite, activeTab, projectId]);

  // Listen for test case creation events to refresh the list
  useEffect(() => {
    const handleTestCaseCreated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[ProjectDetailPage] ========== Test case created event received ==========');
      console.log('[ProjectDetailPage] Event detail:', customEvent.detail);
      console.log('[ProjectDetailPage] Test case ID:', customEvent.detail?.testCaseId);
      console.log('[ProjectDetailPage] Suite ID:', customEvent.detail?.suiteId);
      console.log('[ProjectDetailPage] Project ID:', customEvent.detail?.projectId);

      setIsGenerating(false);
      setGeneratingMessage('AI Generating script for you');

      // Always reload test suites first to update counts
      await loadTestSuites();
      console.log('[ProjectDetailPage] Test suites reloaded');

      // Always reload ALL test cases for the project (for "ALL TESTS" view)
      if (projectId) {
        console.log('[ProjectDetailPage] Reloading ALL test cases for project:', projectId);
        await loadTestCases(); // Load all test cases (no suiteId = all cases for project)
        console.log('[ProjectDetailPage] All test cases reloaded, count:', testCases.length);
      }

      // Also refresh if a specific suite is selected
      if (selectedTestSuite && customEvent.detail?.suiteId === selectedTestSuite) {
        console.log('[ProjectDetailPage] Also refreshing test cases for selected suite:', selectedTestSuite);
        await loadTestCases(selectedTestSuite);
      }
    };

    console.log('[ProjectDetailPage] Setting up testCaseCreated event listener');
    window.addEventListener('testCaseCreated', handleTestCaseCreated);
    return () => {
      console.log('[ProjectDetailPage] Removing testCaseCreated event listener');
      window.removeEventListener('testCaseCreated', handleTestCaseCreated);
    };
  }, [selectedTestSuite, projectId]); // Removed loadTestCases, loadTestSuites from dependencies to avoid infinite loops

  // Listen for execution events to show generating notification
  useEffect(() => {
    const handlePromptExecutionStarted = () => {
      setIsGenerating(true);
      setGeneratingMessage('AI Generating script for you');
    };

    const handleTestCodeGenerated = () => {
      // Hide notification when code is generated and modal is about to show
      setIsGenerating(false);
      setGeneratingMessage('AI Generating script for you');
    };

    const unsubscribe = webService.onEvent(event => {
      if (event.state === ExecutionState.TASK_START) {
        setIsGenerating(true);
        setGeneratingMessage('AI Generating script for you');
      } else if (event.state === ExecutionState.TASK_OK) {
        // Hide notification when task completes - code generation happens after
        setIsGenerating(false);
        setGeneratingMessage('AI Generating script for you');
      } else if (event.state === ExecutionState.TASK_FAIL || event.state === ExecutionState.TASK_CANCEL) {
        setIsGenerating(false);
        setGeneratingMessage('AI Generating script for you');
      }
    });

    window.addEventListener('promptExecutionStarted', handlePromptExecutionStarted);
    window.addEventListener('testCodeGenerated', handleTestCodeGenerated);

    return () => {
      unsubscribe();
      window.removeEventListener('promptExecutionStarted', handlePromptExecutionStarted);
      window.removeEventListener('testCodeGenerated', handleTestCodeGenerated);
    };
  }, []);

  const handleCreateSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !suiteFormData.name.trim()) return;

    try {
      const newSuite = await testSuiteStorage.createTestSuite({
        projectId,
        name: suiteFormData.name,
        description: suiteFormData.description,
      });

      // Add selected test cases to the suite
      for (const testCaseId of Array.from(selectedTestCasesForSuite)) {
        await testSuiteStorage.updateTestCase(testCaseId, {
          testSuiteId: newSuite.id,
        });
      }

      await loadTestSuites();
      setShowCreateSuiteModal(false);
      setEditingSuite(null);
      setSuiteFormData({ name: '', description: '', testType: 'UI Tests' });
      setSelectedTestCasesForSuite(new Set());
      setTestsInSuite([]);
    } catch (error) {
      console.error('Failed to create test suite:', error);
    }
  };

  const handleEditSuite = (suite: TestSuite) => {
    setEditingSuite(suite);
    setSuiteFormData({ name: suite.name, description: suite.description, testType: suite.testType || 'UI Tests' });
    setShowCreateSuiteModal(true);
  };

  const handleUpdateSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSuite || !suiteFormData.name.trim()) return;

    try {
      await testSuiteStorage.updateTestSuite(editingSuite.id, {
        name: suiteFormData.name,
        description: suiteFormData.description,
      });
      await loadTestSuites();
      setShowCreateSuiteModal(false);
      setEditingSuite(null);
      setSuiteFormData({ name: '', description: '', testType: 'UI Tests' });
    } catch (error) {
      console.error('Failed to update test suite:', error);
    }
  };

  const handleDeleteSuite = async (suiteId: string) => {
    if (
      !confirm('Are you sure you want to delete this test suite? All test cases in this suite will also be deleted.')
    ) {
      return;
    }

    try {
      // Get test cases in this suite first
      const cases = await testSuiteStorage.getTestCasesBySuite(suiteId);

      // Delete all test cases in this suite
      for (const testCase of cases) {
        await testSuiteStorage.deleteTestCase(testCase.id);
      }

      // Delete the test suite
      await testSuiteStorage.deleteTestSuite(suiteId);

      // If the deleted suite was selected, clear selection
      if (selectedTestSuite === suiteId) {
        setSelectedTestSuite(null);
        setTestCases([]);
      }

      await loadTestSuites();
    } catch (error) {
      console.error('Failed to delete test suite:', error);
      alert('Failed to delete test suite. Please try again.');
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestSuite || !caseFormData.name.trim() || !caseFormData.prompt.trim()) return;

    try {
      await testSuiteStorage.createTestCase({
        testSuiteId: selectedTestSuite,
        name: caseFormData.name,
        description: caseFormData.description,
        prompt: caseFormData.prompt,
      });
      await loadTestCases(selectedTestSuite);
      setShowCreateCaseModal(false);
      setCaseFormData({ name: '', description: '', prompt: '', playwrightCode: '' });
      setEditingTestCase(null);
    } catch (error) {
      console.error('Failed to create test case:', error);
    }
  };

  const handleEditCase = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setCaseFormData({
      name: testCase.name,
      description: testCase.description,
      prompt: testCase.plannerDescription || testCase.prompt,
      playwrightCode: testCase.playwrightCode || '',
    });
    setShowCreateCaseModal(true);
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestCase || !caseFormData.name.trim() || !caseFormData.prompt.trim()) return;

    try {
      await testSuiteStorage.updateTestCase(editingTestCase.id, {
        name: caseFormData.name,
        description: caseFormData.description,
        prompt: caseFormData.prompt,
        playwrightCode: caseFormData.playwrightCode,
      });
      await loadTestCases(selectedTestSuite!);
      setShowCreateCaseModal(false);
      setEditingTestCase(null);
      setCaseFormData({ name: '', description: '', prompt: '', playwrightCode: '' });
    } catch (error) {
      console.error('Failed to update test case:', error);
    }
  };

  const handleRunTestCase = async (testCase: TestCase) => {
    // Update status to running
    await testSuiteStorage.updateTestCase(testCase.id, { status: 'running', lastRunAt: Date.now() });
    await loadTestCases(selectedTestSuite!);

    // Navigate to prompt tab and execute
    setActiveTab('prompt');
    // You can trigger the chat to execute this prompt programmatically
    // For now, we'll just show a message
    setTimeout(async () => {
      // Simulate execution - in real implementation, this would trigger the automation
      const success = Math.random() > 0.3; // 70% success rate for demo
      await testSuiteStorage.updateTestCase(testCase.id, {
        status: success ? 'pass' : 'fail',
        executionTime: Math.floor(Math.random() * 5000) + 1000,
        errorMessage: success ? undefined : 'Test execution failed',
      });
      await loadTestCases(selectedTestSuite!);
    }, 2000);
  };

  const getIconEmoji = (iconValue: string) => {
    const icons: Record<string, string> = {
      folder: '📁',
      rocket: '🚀',
      briefcase: '💼',
      lightbulb: '💡',
      star: '⭐',
      heart: '❤️',
      fire: '🔥',
      gem: '💎',
      trophy: '🏆',
      target: '🎯',
      globe: '🌐',
      code: '💻',
      art: '🎨',
      music: '🎵',
      game: '🎮',
      book: '📚',
    };
    return icons[iconValue] || '📁';
  };

  if (isLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Generating Notification */}
      <GeneratingNotification isVisible={isGenerating} message={generatingMessage} />

      {/* Header */}
      <div
        className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className={`rounded p-2 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-2xl dark:bg-blue-900">
              {getIconEmoji(project.icon)}
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{project.name}</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{project.team || 'No team'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-slate-700">
          <TabButton
            icon={FiMessageSquare}
            label="Prompt"
            isActive={activeTab === 'prompt'}
            onClick={() => setActiveTab('prompt')}
            isDarkMode={isDarkMode}
          />
          <TabButton
            icon={FiList}
            label="Test Suite"
            isActive={activeTab === 'test-suite'}
            onClick={() => setActiveTab('test-suite')}
            isDarkMode={isDarkMode}
          />
          <TabButton
            icon={FiFileText}
            label="Report"
            isActive={activeTab === 'report'}
            onClick={() => setActiveTab('report')}
            isDarkMode={isDarkMode}
          />
          <TabButton
            icon={FiSettings}
            label="LLM Settings"
            isActive={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            isDarkMode={isDarkMode}
          />
          <TabButton
            icon={FiGlobe}
            label="Environment Settings"
            isActive={activeTab === 'environments'}
            onClick={() => setActiveTab('environments')}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'prompt' && (
          <div className="flex h-full">
            {/* Prompts List - Left Side */}
            <div className="w-1/3 overflow-y-auto border-r">
              <PromptsTab
                projectId={projectId!}
                isDarkMode={isDarkMode}
                onExecutePrompt={promptContent => {
                  // Execute prompt - events will be shown in chat view
                  console.log('Execute prompt:', promptContent);
                }}
              />
            </div>
            {/* Chat View - Right Side */}
            <div className="flex-1 overflow-hidden">
              <ChatView projectId={projectId!} isDarkMode={isDarkMode} />
            </div>
          </div>
        )}

        {activeTab === 'test-suite' && (
          <TestSuiteTab
            testSuites={testSuites}
            selectedTestSuite={selectedTestSuite}
            onSelectSuite={suiteId => {
              setSelectedTestSuite(suiteId);
              if (suiteId) {
                loadTestCases(suiteId);
              }
            }}
            testCases={testCases}
            onRunCase={handleRunTestCase}
            onCreateSuite={() => {
              setEditingSuite(null);
              setSuiteFormData({ name: '', description: '', testType: 'UI Tests' });
              setShowCreateSuiteModal(true);
            }}
            onEditSuite={handleEditSuite}
            onDeleteSuite={handleDeleteSuite}
            onSchedulerSuite={suite => {
              setSchedulingSuite(suite);
              setShowSchedulerModal(true);
            }}
            onRunSuite={suite => {
              // TODO: Implement run suite functionality
              console.log('Run test suite:', suite);
              alert(`Running test suite "${suite.name}" - Coming soon!`);
            }}
            onCreateCase={() => {
              setEditingTestCase(null);
              setCaseFormData({ name: '', description: '', prompt: '', playwrightCode: '' });
              setShowCreateCaseModal(true);
            }}
            onEditCase={handleEditCase}
            onViewPlaywrightCode={testCase => setViewingPlaywrightCode({ testCase })}
            onViewPrompt={testCase => setViewingPrompt({ testCase })}
            onRefreshTestCases={async () => {
              if (selectedTestSuite) {
                await loadTestCases(selectedTestSuite);
              } else if (projectId) {
                await loadTestCases();
              }
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === 'report' && <ReportTab projectId={projectId!} testSuites={testSuites} isDarkMode={isDarkMode} />}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto">
            <SettingsPage projectId={projectId} />
          </div>
        )}

        {activeTab === 'environments' && (
          <div className="h-full overflow-y-auto">
            <EnvironmentSettings projectId={projectId} isDarkMode={isDarkMode} />
          </div>
        )}
      </div>

      {/* Create/Edit Test Suite Modal */}
      {showCreateSuiteModal && projectId && (
        <CreateSuiteModal
          formData={suiteFormData}
          setFormData={setSuiteFormData}
          onSubmit={editingSuite ? handleUpdateSuite : handleCreateSuite}
          onClose={() => {
            setShowCreateSuiteModal(false);
            setEditingSuite(null);
            setSuiteFormData({ name: '', description: '', testType: 'UI Tests' });
            setSelectedTestCasesForSuite(new Set());
            setTestsInSuite([]);
          }}
          editingSuite={editingSuite}
          isDarkMode={isDarkMode}
          projectId={projectId}
          availableTestCases={availableTestCases}
          testsInSuite={testsInSuite}
          selectedTestCasesForSuite={selectedTestCasesForSuite}
          setSelectedTestCasesForSuite={setSelectedTestCasesForSuite}
          setTestsInSuite={setTestsInSuite}
          setAvailableTestCases={setAvailableTestCases}
        />
      )}

      {/* Create Test Case Modal */}
      {showCreateCaseModal && (
        <CreateCaseModal
          formData={caseFormData}
          setFormData={setCaseFormData}
          onSubmit={editingTestCase ? handleUpdateCase : handleCreateCase}
          onClose={() => {
            setShowCreateCaseModal(false);
            setCaseFormData({ name: '', description: '', prompt: '', playwrightCode: '' });
            setEditingTestCase(null);
          }}
          editingTestCase={editingTestCase}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Scheduler Modal */}
      {showSchedulerModal && schedulingSuite && (
        <SchedulerModal
          suite={schedulingSuite}
          onClose={() => {
            setShowSchedulerModal(false);
            setSchedulingSuite(null);
          }}
          onSave={async scheduleData => {
            await testSuiteStorage.updateTestSuite(schedulingSuite.id, { schedule: scheduleData });
            await loadTestSuites();
            setShowSchedulerModal(false);
            setSchedulingSuite(null);
          }}
          onDelete={async () => {
            await testSuiteStorage.updateTestSuite(schedulingSuite.id, { schedule: undefined });
            await loadTestSuites();
            setShowSchedulerModal(false);
            setSchedulingSuite(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}

      {/* View Playwright Code Modal */}
      {viewingPlaywrightCode && (
        <ViewCodeModal
          testCase={viewingPlaywrightCode.testCase}
          onClose={() => setViewingPlaywrightCode(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* View Prompt Modal */}
      {viewingPrompt && (
        <ViewPromptModal
          testCase={viewingPrompt.testCase}
          onClose={() => setViewingPrompt(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

interface ViewCodeModalProps {
  testCase: TestCase;
  onClose: () => void;
  isDarkMode: boolean;
}

function ViewCodeModal({ testCase, onClose, isDarkMode }: ViewCodeModalProps) {
  const [codeLineNumbers, setCodeLineNumbers] = useState<string[]>([]);
  const codeTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (testCase.playwrightCode) {
      const lines = testCase.playwrightCode.split('\n');
      setCodeLineNumbers(lines.map((_, i) => String(i + 1)));
    } else {
      setCodeLineNumbers([]);
    }
  }, [testCase.playwrightCode]);

  const handleCodeScroll = () => {
    if (codeTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = codeTextareaRef.current.scrollTop;
    }
  };

  const handleCopyCode = () => {
    if (testCase.playwrightCode) {
      navigator.clipboard.writeText(testCase.playwrightCode);
      alert('Playwright code copied to clipboard!');
    }
  };

  const handleDownloadCode = () => {
    if (testCase.playwrightCode) {
      const blob = new Blob([testCase.playwrightCode], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${testCase.name}.spec.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-4xl rounded-lg border p-6 shadow-xl ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Playwright Code</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{testCase.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}>
              <FiCopy size={14} />
              Copy
            </button>
            <button
              type="button"
              onClick={handleDownloadCode}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}>
              <FiDownload size={14} />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded p-1.5 transition-colors ${
                isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="relative">
          {/* Line Numbers */}
          {testCase.playwrightCode && (
            <div
              ref={lineNumbersRef}
              className={`absolute left-0 top-0 h-full overflow-hidden border-r pr-2 text-right font-mono text-xs ${
                isDarkMode ? 'border-slate-600 text-gray-500' : 'border-gray-300 text-gray-400'
              }`}
              style={{ width: '40px', paddingTop: '12px', paddingBottom: '12px' }}>
              {codeLineNumbers.map((line, idx) => (
                <div key={idx} className="leading-6">
                  {line}
                </div>
              ))}
            </div>
          )}
          {/* Code Display */}
          <textarea
            ref={codeTextareaRef}
            readOnly
            value={testCase.playwrightCode || 'No Playwright code available'}
            onScroll={handleCodeScroll}
            rows={20}
            className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${
              isDarkMode ? 'border-slate-600 bg-slate-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'
            } ${testCase.playwrightCode ? 'pl-12' : ''} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
}

interface ViewPromptModalProps {
  testCase: TestCase;
  onClose: () => void;
  isDarkMode: boolean;
}

function ViewPromptModal({ testCase, onClose, isDarkMode }: ViewPromptModalProps) {
  const promptText = testCase.plannerDescription || testCase.prompt || 'No automation prompt available';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-3xl rounded-lg border p-6 shadow-xl ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Automation Prompt
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{testCase.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1.5 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiX size={20} />
          </button>
        </div>

        <div className="mb-4">
          <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Prompt Details
          </label>
          <textarea
            readOnly
            value={promptText}
            rows={12}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${
              isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'
            } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {testCase.description && (
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                isDarkMode ? 'border-slate-600 bg-slate-700 text-gray-300' : 'border-gray-300 bg-gray-50 text-gray-700'
              }`}>
              {testCase.description}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              isDarkMode
                ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface SchedulerModalProps {
  suite: TestSuite;
  onClose: () => void;
  onSave: (schedule: TestSuiteSchedule) => Promise<void>;
  onDelete: () => Promise<void>;
  isDarkMode: boolean;
}

function SchedulerModal({ suite, onClose, onSave, onDelete, isDarkMode }: SchedulerModalProps) {
  const [cronExpression, setCronExpression] = useState(suite.schedule?.cronExpression || '0 9 * * 1-5');
  const [environment, setEnvironment] = useState(suite.schedule?.environment || '');
  const [enabled, setEnabled] = useState(suite.schedule?.enabled ?? true);
  const [headless, setHeadless] = useState(suite.schedule?.headless ?? true);
  const [workers, setWorkers] = useState(suite.schedule?.workers || 1);
  const [environments] = useState<string[]>([
    'Bank App Testing -Dev ()',
    'Bank App Testing -Staging ()',
    'Bank App Testing -Prod ()',
  ]);

  const cronExamples = [
    { expression: '0 9 * * 1-5', description: 'Every weekday at 9:00 AM' },
    { expression: '0 */2 * * *', description: 'Every 2 hours' },
    { expression: '0 0 * * 0', description: 'Every Sunday at midnight' },
    { expression: '30 14 * * *', description: 'Every day at 2:30 PM' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cronExpression.trim() || !environment.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const schedule: TestSuiteSchedule = {
      cronExpression: cronExpression.trim(),
      environment,
      enabled,
      headless,
      workers: Math.max(1, Math.min(10, workers)),
      createdAt: suite.schedule?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(schedule);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-2xl rounded-lg border p-6 shadow-xl ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiClock size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-700'} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Schedule</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1.5 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Cron Expression */}
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Cron Expression *
            </label>
            <input
              type="text"
              required
              value={cronExpression}
              onChange={e => setCronExpression(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="0 9 * * 1-5"
            />
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Schedule when to run the test suite (minute hour day month weekday)
            </p>
            <div className={`mt-2 space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {cronExamples.map((example, idx) => (
                <div key={idx} className="text-xs">
                  <code className={`rounded px-1 py-0.5 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    {example.expression}
                  </code>{' '}
                  - {example.description}
                </div>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Environment *
            </label>
            <select
              required
              value={environment}
              onChange={e => setEnvironment(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}>
              <option value="">Select environment</option>
              {environments.map(env => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
          </div>

          {/* Enable Schedule */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Enable Schedule
              </span>
            </label>
            <p className={`ml-6 mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Uncheck to disable the schedule without deleting it
            </p>
          </div>

          {/* Headless Mode */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={headless}
                onChange={e => setHeadless(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Run in Headless Mode
              </span>
            </label>
            <p className={`ml-6 mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Run tests without opening browser windows
            </p>
          </div>

          {/* Number of Workers */}
          <div className="mb-6">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Number of Workers
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={workers}
              onChange={e => setWorkers(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Number of parallel test workers (1-10)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div>
              {suite.schedule && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this schedule?')) {
                      await onDelete();
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}>
                  <FiX size={16} />
                  Delete Schedule
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
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
                <FiCheckCircle size={16} />
                Update Schedule
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TabButtonProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

function TabButton({ icon: Icon, label, isActive, onClick, isDarkMode }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
      }`}>
      <Icon size={18} />
      {label}
    </button>
  );
}

interface TestSuiteTabProps {
  testSuites: TestSuite[];
  selectedTestSuite: string | null;
  onSelectSuite: (suiteId: string | null) => void;
  testCases: TestCase[];
  onRunCase: (testCase: TestCase) => void;
  onCreateSuite: () => void;
  onEditSuite: (suite: TestSuite) => void;
  onDeleteSuite: (suiteId: string) => void;
  onSchedulerSuite?: (suite: TestSuite) => void;
  onRunSuite?: (suite: TestSuite) => void;
  onCreateCase: () => void;
  onEditCase?: (testCase: TestCase) => void;
  onViewPlaywrightCode?: (testCase: TestCase) => void;
  onViewPrompt?: (testCase: TestCase) => void;
  onRefreshTestCases?: () => Promise<void>;
  isDarkMode: boolean;
}

function TestSuiteTab({
  testSuites,
  selectedTestSuite,
  onSelectSuite,
  testCases,
  onRunCase,
  onCreateSuite,
  onEditSuite,
  onDeleteSuite,
  onSchedulerSuite,
  onRunSuite,
  onCreateCase,
  onEditCase,
  onViewPlaywrightCode,
  onViewPrompt,
  onRefreshTestCases,
  isDarkMode,
}: TestSuiteTabProps) {
  const [view, setView] = useState<'overview' | 'test-suites' | 'collections' | 'all-tests' | 'tags'>('all-tests');
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'ui' | 'api'>('ui');
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());

  // Filter test cases by type
  const filteredTestCases = testCases.filter(testCase => {
    if (testTypeFilter === 'all') return true;
    // Determine type based on prompt content or description
    const testType =
      testCase.prompt?.toLowerCase().includes('api') || testCase.description?.toLowerCase().includes('api')
        ? 'api'
        : 'ui';
    return testType === testTypeFilter;
  });

  const uiTestCount = testCases.filter(tc => {
    const testType =
      tc.prompt?.toLowerCase().includes('api') || tc.description?.toLowerCase().includes('api') ? 'api' : 'ui';
    return testType === 'ui';
  }).length;

  const apiTestCount = testCases.filter(tc => {
    const testType =
      tc.prompt?.toLowerCase().includes('api') || tc.description?.toLowerCase().includes('api') ? 'api' : 'ui';
    return testType === 'api';
  }).length;

  const handleSelectAll = () => {
    if (selectedTestCases.size === filteredTestCases.length && filteredTestCases.length > 0) {
      setSelectedTestCases(new Set());
    } else {
      setSelectedTestCases(new Set(filteredTestCases.map(tc => tc.id)));
    }
  };

  const handleSelectTestCase = (testCaseId: string) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCases(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedTestCases.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTestCases.size} test case(s)?`)) return;

    try {
      const { testSuiteStorage } = await import('../lib/testSuiteStorage');
      for (const testCaseId of selectedTestCases) {
        await testSuiteStorage.deleteTestCase(testCaseId);
      }
      setSelectedTestCases(new Set());
      // Trigger refresh via callback if available, otherwise reload
      if (onRefreshTestCases) {
        await onRefreshTestCases();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete test cases:', error);
      alert('Failed to delete test cases. Please try again.');
    }
  };

  const handleRefresh = async () => {
    // Trigger reload of test cases via callback if available
    if (onRefreshTestCases) {
      await onRefreshTestCases();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Navigation Tabs */}
      <div className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6`}>
        <div className="flex space-x-8">
          <NavTab
            label="OVERVIEW"
            isActive={view === 'overview'}
            onClick={() => setView('overview')}
            isDarkMode={isDarkMode}
          />
          <NavTab
            label="TEST SUITES"
            isActive={view === 'test-suites'}
            onClick={() => setView('test-suites')}
            isDarkMode={isDarkMode}
          />
          <NavTab
            label="COLLECTIONS"
            isActive={view === 'collections'}
            onClick={() => setView('collections')}
            isDarkMode={isDarkMode}
          />
          <NavTab
            label="ALL TESTS"
            isActive={view === 'all-tests'}
            onClick={() => setView('all-tests')}
            isDarkMode={isDarkMode}
          />
          <NavTab label="TAGS" isActive={view === 'tags'} onClick={() => setView('tags')} isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Content Area */}
      {view === 'all-tests' ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header with filters and actions */}
          <div
            className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Test Cases{' '}
                {testCases.length > 0 && (
                  <span className="text-base font-normal text-gray-500">({testCases.length})</span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCreateCase}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                    isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  <FiPlus size={18} />
                  Add Test Case
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}>
                  <FiRefreshCw size={16} />
                  REFRESH
                </button>
                <button
                  type="button"
                  onClick={onCreateCase}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                    isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  <FiCode size={16} />
                  TEST GEN
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedTestCases.size === 0}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                    selectedTestCases.size === 0 ? 'cursor-not-allowed opacity-50' : ''
                  } ${
                    isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}>
                  <FiTrash2 size={16} />
                  DELETE ALL TESTS
                </button>
              </div>
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setTestTypeFilter('ui')}
                className={`pb-2 font-medium transition-colors ${
                  testTypeFilter === 'ui'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                }`}>
                UI TESTS ({uiTestCount})
              </button>
              <button
                type="button"
                onClick={() => setTestTypeFilter('api')}
                className={`pb-2 font-medium transition-colors ${
                  testTypeFilter === 'api'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-300'
                      : 'text-gray-600 hover:text-gray-900'
                }`}>
                API TESTS ({apiTestCount})
              </button>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total: {testCases.length} tests
              </div>
            </div>
          </div>

          {/* Test Cases Table */}
          <div className="flex-1 overflow-auto">
            <table className={`w-full ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <thead className={`sticky top-0 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-4 py-3 text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={selectedTestCases.size === filteredTestCases.length && filteredTestCases.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    NAME
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    DESCRIPTION
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    CODE
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    ENVIRONMENT
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    TAG
                  </th>
                  <th
                    className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTestCases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className={`px-4 py-12 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No test cases found
                    </td>
                  </tr>
                ) : (
                  filteredTestCases.map(testCase => {
                    const testType =
                      testCase.prompt?.toLowerCase().includes('api') ||
                      testCase.description?.toLowerCase().includes('api')
                        ? 'api'
                        : 'ui';
                    return (
                      <tr
                        key={testCase.id}
                        className={`border-b ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTestCases.has(testCase.id)}
                            onChange={() => handleSelectTestCase(testCase.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {testCase.name}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {testCase.description || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {testCase.playwrightCode ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                              }`}>
                              Available
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-100 text-gray-700'
                              }`}>
                              -
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {testCase.baseUrl || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              testType === 'ui'
                                ? isDarkMode
                                  ? 'bg-red-900/50 text-red-400'
                                  : 'bg-red-100 text-red-800'
                                : isDarkMode
                                  ? 'bg-blue-900/50 text-blue-400'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                            {testType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {onEditCase && (
                              <button
                                type="button"
                                onClick={() => onEditCase(testCase)}
                                className={`rounded p-1.5 transition-colors ${
                                  isDarkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-gray-100'
                                }`}
                                title="Edit test case">
                                <FiEdit2 size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRunCase(testCase)}
                              className={`rounded p-1.5 transition-colors ${
                                isDarkMode ? 'text-green-400 hover:bg-slate-700' : 'text-green-600 hover:bg-gray-100'
                              }`}
                              title="Run test">
                              <FiPlay size={16} />
                            </button>
                            {testCase.playwrightCode && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onViewPlaywrightCode) {
                                    onViewPlaywrightCode(testCase);
                                  }
                                }}
                                className={`rounded p-1.5 transition-colors ${
                                  isDarkMode
                                    ? 'text-purple-400 hover:bg-slate-700'
                                    : 'text-purple-600 hover:bg-gray-100'
                                }`}
                                title="View Playwright code">
                                <FiCode size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : view === 'test-suites' ? (
        <div className="flex h-full">
          {/* Test Suites Sidebar */}
          <div
            className={`w-64 border-r ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-4`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Test Suites</h2>
              <button
                type="button"
                onClick={onCreateSuite}
                className={`rounded p-1.5 transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <FiPlus size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {testSuites.map(suite => (
                <div
                  key={suite.id}
                  className={`group relative rounded-lg transition-colors ${
                    selectedTestSuite === suite.id
                      ? isDarkMode
                        ? 'bg-blue-900/50'
                        : 'bg-blue-100'
                      : isDarkMode
                        ? 'hover:bg-slate-700'
                        : 'hover:bg-gray-100'
                  }`}>
                  <button
                    type="button"
                    onClick={() => onSelectSuite(suite.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                      selectedTestSuite === suite.id
                        ? isDarkMode
                          ? 'text-blue-400'
                          : 'text-blue-700'
                        : isDarkMode
                          ? 'text-gray-400'
                          : 'text-gray-700'
                    }`}>
                    <div className="font-medium">{suite.name}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {suite.testCases.length} test cases
                    </div>
                  </button>
                  {/* Action buttons - show on hover */}
                  <div
                    className={`absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                      selectedTestSuite === suite.id ? 'opacity-100' : ''
                    }`}>
                    {onSchedulerSuite && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSchedulerSuite(suite);
                        }}
                        className={`rounded p-1.5 transition-colors ${
                          isDarkMode
                            ? 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        } shadow-sm`}
                        title="Schedule test suite">
                        <FiClock size={14} />
                      </button>
                    )}
                    {onRunSuite && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onRunSuite(suite);
                        }}
                        className={`rounded px-2 py-1 transition-colors ${
                          isDarkMode
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        } flex items-center gap-1 shadow-sm`}
                        title="Run test suite">
                        <FiBarChart2 size={14} />
                        <span className="text-xs font-medium">RUN</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onEditSuite(suite);
                      }}
                      className={`rounded p-1.5 transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 text-blue-400 hover:bg-slate-600'
                          : 'bg-white text-blue-600 hover:bg-blue-50'
                      } shadow-sm`}
                      title="Edit test suite">
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteSuite(suite.id);
                      }}
                      className={`rounded p-1.5 transition-colors ${
                        isDarkMode
                          ? 'bg-slate-700 text-red-400 hover:bg-slate-600'
                          : 'bg-white text-red-600 hover:bg-red-50'
                      } shadow-sm`}
                      title="Delete test suite">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Cases Content */}
          <div className={`flex flex-1 flex-col overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
            {selectedTestSuite ? (
              <>
                {/* Test Cases Header */}
                <div
                  className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Test Cases{' '}
                      {testCases.length > 0 && (
                        <span className="text-base font-normal text-gray-500">({testCases.length})</span>
                      )}
                    </h2>
                    <button
                      type="button"
                      onClick={onCreateCase}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                      <FiPlus size={18} />
                      Add Test Case
                    </button>
                  </div>
                </div>

                {/* Test Cases Table */}
                {testCases.length === 0 ? (
                  <div
                    className={`flex flex-1 items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-center">
                      <p>No test cases yet</p>
                      <button
                        type="button"
                        onClick={onCreateCase}
                        className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Create your first test case
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className={`w-full ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                      <thead className={`sticky top-0 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                        <tr>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            NAME
                          </th>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            DESCRIPTION
                          </th>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            CODE
                          </th>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            AUTOMATION PROMPT
                          </th>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            ENVIRONMENT
                          </th>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            TAG
                          </th>
                          <th
                            className={`px-4 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {testCases.map(testCase => {
                          const testType =
                            testCase.prompt?.toLowerCase().includes('api') ||
                            testCase.description?.toLowerCase().includes('api')
                              ? 'api'
                              : 'ui';
                          return (
                            <tr
                              key={testCase.id}
                              className={`border-b ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                              <td className="px-4 py-3">
                                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {testCase.name}
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {testCase.description || '-'}
                              </td>
                              <td className="px-4 py-3">
                                {testCase.playwrightCode ? (
                                  <button
                                    type="button"
                                    onClick={() => onViewPlaywrightCode?.(testCase)}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                                      isDarkMode
                                        ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                    }`}>
                                    Available
                                    <FiEye size={12} />
                                  </button>
                                ) : (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                      isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {testCase.prompt || testCase.plannerDescription ? (
                                  <button
                                    type="button"
                                    onClick={() => onViewPrompt?.(testCase)}
                                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                                      isDarkMode
                                        ? 'bg-blue-900/50 text-blue-400 hover:bg-blue-900/70'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    }`}>
                                    View Steps
                                    <FiEye size={12} />
                                  </button>
                                ) : (
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                      isDarkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    -
                                  </span>
                                )}
                              </td>
                              <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {testCase.baseUrl || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    testType === 'ui'
                                      ? isDarkMode
                                        ? 'bg-red-900/50 text-red-400'
                                        : 'bg-red-100 text-red-800'
                                      : isDarkMode
                                        ? 'bg-blue-900/50 text-blue-400'
                                        : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {testType.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {onEditCase && (
                                    <button
                                      type="button"
                                      onClick={() => onEditCase(testCase)}
                                      className={`rounded p-1.5 transition-colors ${
                                        isDarkMode
                                          ? 'text-blue-400 hover:bg-slate-700'
                                          : 'text-blue-600 hover:bg-gray-100'
                                      }`}
                                      title="Edit test case">
                                      <FiEdit2 size={16} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onRunCase(testCase)}
                                    className={`rounded p-1.5 transition-colors ${
                                      isDarkMode
                                        ? 'text-green-400 hover:bg-slate-700'
                                        : 'text-green-600 hover:bg-gray-100'
                                    }`}
                                    title="Run test">
                                    <FiPlay size={16} />
                                  </button>
                                  {testCase.playwrightCode && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (onViewPlaywrightCode) {
                                          onViewPlaywrightCode(testCase);
                                        }
                                      }}
                                      className={`rounded p-1.5 transition-colors ${
                                        isDarkMode
                                          ? 'text-purple-400 hover:bg-slate-700'
                                          : 'text-purple-600 hover:bg-gray-100'
                                      }`}
                                      title="View Playwright code">
                                      <FiCode size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div
                className={`flex h-full items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="text-center">
                  <p>Select a test suite to view test cases</p>
                  {testSuites.length === 0 && (
                    <button
                      type="button"
                      onClick={onCreateSuite}
                      className={`mt-4 rounded-lg px-4 py-2 font-medium ${
                        isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                      Create Test Suite
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex flex-1 items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>{view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} view coming soon</p>
        </div>
      )}
    </div>
  );
}

interface NavTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

function NavTab({ label, isActive, onClick, isDarkMode }: NavTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 pt-4 font-medium transition-colors ${
        isActive
          ? 'text-blue-600'
          : isDarkMode
            ? 'text-gray-400 hover:text-gray-300'
            : 'text-gray-600 hover:text-gray-900'
      }`}>
      {label}
      {isActive && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500"></div>}
    </button>
  );
}

interface TestCaseCardProps {
  testCase: TestCase;
  onRun: () => void;
  isDarkMode: boolean;
}

function TestCaseCard({ testCase, onRun, isDarkMode }: TestCaseCardProps) {
  const [showPlaywrightCode, setShowPlaywrightCode] = useState(false);

  const statusColors = {
    pass: isDarkMode ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50',
    fail: isDarkMode ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50',
    pending: isDarkMode ? 'text-gray-400 bg-gray-900/20' : 'text-gray-600 bg-gray-50',
    running: isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50',
  };

  const StatusIcon = {
    pass: FiCheckCircle,
    fail: FiXCircle,
    pending: FiClock,
    running: FiClock,
  }[testCase.status];

  const handleCopyCode = () => {
    if (testCase.playwrightCode) {
      navigator.clipboard.writeText(testCase.playwrightCode);
      alert('Playwright code copied to clipboard!');
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{testCase.name}</h3>
          {testCase.description && (
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{testCase.description}</p>
          )}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[testCase.status]}`}>
          <StatusIcon size={14} />
          {testCase.status}
        </span>
      </div>
      <div
        className={`mb-3 rounded bg-gray-100 p-2 text-sm ${isDarkMode ? 'bg-slate-700 text-gray-300' : 'text-gray-700'}`}>
        <div className="font-medium">Prompt:</div>
        <div className="mt-1 truncate">{testCase.prompt}</div>
      </div>

      {/* Playwright Code Section */}
      {testCase.playwrightCode && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowPlaywrightCode(!showPlaywrightCode)}
            className={`flex w-full items-center justify-between rounded-lg border p-2 text-sm transition-colors ${
              isDarkMode
                ? 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}>
            <div className="flex items-center gap-2">
              <FiCode size={16} />
              <span className="font-medium">Playwright Code</span>
            </div>
            <FiEye size={16} />
          </button>
          {showPlaywrightCode && (
            <div
              className={`mt-2 rounded-lg border ${isDarkMode ? 'border-slate-600 bg-slate-900' : 'border-gray-300 bg-gray-50'} p-3`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Generated Playwright Test Script
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                    isDarkMode
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}>
                  <FiCopy size={12} />
                  Copy
                </button>
              </div>
              <pre
                className={`max-h-64 overflow-auto rounded p-2 text-xs ${isDarkMode ? 'bg-slate-950 text-gray-300' : 'bg-white text-gray-800'}`}>
                <code>{testCase.playwrightCode}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {testCase.lastRunAt ? `Last run: ${new Date(testCase.lastRunAt).toLocaleString()}` : 'Not run yet'}
          {testCase.executionTime && ` (${(testCase.executionTime / 1000).toFixed(1)}s)`}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={testCase.status === 'running'}
          className={`flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            testCase.status === 'running'
              ? 'cursor-not-allowed opacity-50'
              : isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <FiPlay size={14} />
          Run
        </button>
      </div>
      {testCase.errorMessage && (
        <div
          className={`mt-2 rounded bg-red-50 p-2 text-xs text-red-600 ${isDarkMode ? 'bg-red-900/20 text-red-400' : ''}`}>
          {testCase.errorMessage}
        </div>
      )}
    </div>
  );
}

interface ReportTabProps {
  projectId: string;
  testSuites: TestSuite[];
  isDarkMode: boolean;
}

function ReportTab({ projectId, testSuites, isDarkMode }: ReportTabProps) {
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(
    testSuites.length > 0 ? testSuites[0].id : null,
  );
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllCases = async () => {
      try {
        setIsLoading(true);
        // Load all test cases in parallel for better performance
        const casePromises = testSuites.map(suite => testSuiteStorage.getTestCasesBySuite(suite.id));
        const allSuiteCases = await Promise.all(casePromises);
        const cases = allSuiteCases.flat();
        setAllTestCases(cases);
      } catch (error) {
        console.error('Failed to load test cases:', error);
        setAllTestCases([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (testSuites.length > 0) {
      loadAllCases();
    } else {
      setAllTestCases([]);
      setIsLoading(false);
    }
  }, [testSuites]);

  // Overall stats across all suites
  const overallStats = {
    total: allTestCases.length,
    passed: allTestCases.filter(c => c.status === 'pass').length,
    failed: allTestCases.filter(c => c.status === 'fail').length,
    pending: allTestCases.filter(c => c.status === 'pending').length,
  };

  // Stats for selected suite
  const selectedSuite = testSuites.find(s => s.id === selectedSuiteId);
  const selectedSuiteCases = selectedSuite ? allTestCases.filter(c => c.testSuiteId === selectedSuiteId) : [];
  const suiteStats = selectedSuite
    ? {
        total: selectedSuiteCases.length,
        passed: selectedSuiteCases.filter(c => c.status === 'pass').length,
        failed: selectedSuiteCases.filter(c => c.status === 'fail').length,
        pending: selectedSuiteCases.filter(c => c.status === 'pending').length,
      }
    : { total: 0, passed: 0, failed: 0, pending: 0 };

  if (isLoading) {
    return (
      <div className={`flex h-full items-center justify-center ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div
        className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Test Report</h2>
      </div>

      {/* Overall Stats */}
      <div
        className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
        <h3 className={`mb-3 text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Overall Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatBox label="Total" value={overallStats.total} color="blue" isDarkMode={isDarkMode} />
          <StatBox label="Passed" value={overallStats.passed} color="green" isDarkMode={isDarkMode} />
          <StatBox label="Failed" value={overallStats.failed} color="red" isDarkMode={isDarkMode} />
          <StatBox label="Pending" value={overallStats.pending} color="gray" isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Suite Tabs */}
      <div className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} px-6`}>
        <div className="flex gap-1 overflow-x-auto">
          {testSuites.map(suite => {
            const suiteCases = allTestCases.filter(c => c.testSuiteId === suite.id);
            const isActive = selectedSuiteId === suite.id;
            return (
              <button
                key={suite.id}
                type="button"
                onClick={() => setSelectedSuiteId(suite.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : isDarkMode
                      ? 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}>
                {suite.name}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : isDarkMode
                        ? 'bg-slate-700 text-gray-400'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                  {suiteCases.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Suite Report */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedSuite ? (
          <SuiteReport
            suite={selectedSuite}
            testCases={selectedSuiteCases}
            stats={suiteStats}
            isDarkMode={isDarkMode}
          />
        ) : (
          <div className={`flex h-full items-center justify-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>No test suite selected</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'gray';
  isDarkMode: boolean;
}

function StatBox({ label, value, color, isDarkMode }: StatBoxProps) {
  const colorClasses = {
    blue: isDarkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200',
    green: isDarkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-200',
    red: isDarkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200',
    gray: isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</div>
      <div className={`mt-1 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

interface SuiteReportProps {
  suite: TestSuite;
  testCases: TestCase[];
  stats: { total: number; passed: number; failed: number; pending: number };
  isDarkMode: boolean;
}

function SuiteReport({ suite, testCases, stats, isDarkMode }: SuiteReportProps) {
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  const toggleCase = (caseId: string) => {
    const newExpanded = new Set(expandedCases);
    if (newExpanded.has(caseId)) {
      newExpanded.delete(caseId);
    } else {
      newExpanded.add(caseId);
    }
    setExpandedCases(newExpanded);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Playwright code copied to clipboard!');
  };

  const handleDownloadCode = (code: string, name: string) => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.spec.ts`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const passedPercentage = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : '0';
  const failedPercentage = stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : '0';
  const pendingPercentage = stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Suite KPIs */}
      <div>
        <h3 className={`mb-3 text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{suite.name}</h3>
        {suite.description && (
          <p className={`mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{suite.description}</p>
        )}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div
            className={`rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total</div>
            <div className={`mt-1 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.total}
            </div>
          </div>
          <div
            className={`rounded-lg border p-4 ${isDarkMode ? 'border-green-700 bg-green-900/20' : 'border-green-200 bg-green-50'}`}>
            <div className={`text-sm font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Passed</div>
            <div className={`mt-1 text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {stats.passed}
            </div>
            <div className={`mt-1 text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {passedPercentage}%
            </div>
          </div>
          <div
            className={`rounded-lg border p-4 ${isDarkMode ? 'border-red-700 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
            <div className={`text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Failed</div>
            <div className={`mt-1 text-2xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {stats.failed}
            </div>
            <div className={`mt-1 text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{failedPercentage}%</div>
          </div>
          <div
            className={`rounded-lg border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-900/20' : 'border-gray-200 bg-gray-50'}`}>
            <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending</div>
            <div className={`mt-1 text-2xl font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stats.pending}
            </div>
            <div className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{pendingPercentage}%</div>
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        <h4 className={`text-md font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Test Cases</h4>
        {testCases.length === 0 ? (
          <div
            className={`rounded-lg border p-4 text-center ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No test cases in this suite</p>
          </div>
        ) : (
          testCases.map(testCase => {
            const isExpanded = expandedCases.has(testCase.id);
            const statusColors = {
              pass: isDarkMode ? 'text-green-400 bg-green-900/20' : 'text-green-600 bg-green-50',
              fail: isDarkMode ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50',
              pending: isDarkMode ? 'text-gray-400 bg-gray-900/20' : 'text-gray-600 bg-gray-50',
              running: isDarkMode ? 'text-blue-400 bg-blue-900/20' : 'text-blue-600 bg-blue-50',
            };

            return (
              <div
                key={testCase.id}
                className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h5 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {testCase.name}
                        </h5>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[testCase.status]}`}>
                          {testCase.status === 'pass' && <FiCheckCircle size={12} />}
                          {testCase.status === 'fail' && <FiXCircle size={12} />}
                          {testCase.status === 'pending' && <FiClock size={12} />}
                          {testCase.status === 'running' && <FiClock size={12} />}
                          {testCase.status}
                        </span>
                      </div>
                      {testCase.description && (
                        <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {testCase.description}
                        </p>
                      )}
                      {testCase.plannerDescription && (
                        <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {testCase.plannerDescription}
                        </p>
                      )}
                    </div>
                    {testCase.playwrightCode && (
                      <button
                        type="button"
                        onClick={() => toggleCase(testCase.id)}
                        className={`ml-4 rounded p-1.5 transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}>
                        {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                      </button>
                    )}
                  </div>
                  {testCase.errorMessage && (
                    <div
                      className={`mt-2 rounded bg-red-50 p-2 text-xs text-red-600 ${
                        isDarkMode ? 'bg-red-900/20 text-red-400' : ''
                      }`}>
                      {testCase.errorMessage}
                    </div>
                  )}
                </div>

                {/* Expanded Playwright Code */}
                {isExpanded && testCase.playwrightCode && (
                  <div
                    className={`border-t ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'} p-4`}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Playwright Code
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(testCase.playwrightCode!)}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                            isDarkMode
                              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}>
                          <FiCopy size={12} />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCode(testCase.playwrightCode!, testCase.name)}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                            isDarkMode
                              ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}>
                          <FiDownload size={12} />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={testCase.playwrightCode}
                        rows={15}
                        className={`w-full rounded-lg border px-3 py-2 font-mono text-xs ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-950 text-white'
                            : 'border-gray-300 bg-white text-gray-900'
                        } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface CreateSuiteModalProps {
  formData: { name: string; description: string; testType: string };
  setFormData: (data: { name: string; description: string; testType: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editingSuite: TestSuite | null;
  isDarkMode: boolean;
  projectId: string;
  availableTestCases: TestCase[];
  testsInSuite: TestCase[];
  selectedTestCasesForSuite: Set<string>;
  setSelectedTestCasesForSuite: (set: Set<string>) => void;
  setTestsInSuite: (tests: TestCase[]) => void;
  setAvailableTestCases: (tests: TestCase[]) => void;
}

function CreateSuiteModal({
  formData,
  setFormData,
  onSubmit,
  onClose,
  editingSuite,
  isDarkMode,
  projectId,
  availableTestCases,
  testsInSuite,
  selectedTestCasesForSuite,
  setSelectedTestCasesForSuite,
  setTestsInSuite,
  setAvailableTestCases,
}: CreateSuiteModalProps) {
  const [selectedAvailableTests, setSelectedAvailableTests] = useState<Set<string>>(new Set());
  const [selectedInSuiteTests, setSelectedInSuiteTests] = useState<Set<string>>(new Set());

  // Load available test cases when modal opens
  useEffect(() => {
    const loadTestCases = async () => {
      const [allCases, projectSuites] = await Promise.all([
        testSuiteStorage.getTestCases(),
        testSuiteStorage.getTestSuitesByProject(projectId),
      ]);
      const suiteIds = new Set(projectSuites.map(s => s.id));
      const projectCases = Array.isArray(allCases)
        ? allCases.filter(tc => suiteIds.has(tc.testSuiteId) || !tc.testSuiteId)
        : [];

      if (editingSuite) {
        // For editing, separate tests in suite from available tests
        const suiteCases = projectCases.filter(tc => tc.testSuiteId === editingSuite.id);
        const available = projectCases.filter(tc => tc.testSuiteId !== editingSuite.id || !tc.testSuiteId);
        setTestsInSuite(suiteCases);
        setAvailableTestCases(available);
        setSelectedTestCasesForSuite(new Set(suiteCases.map(tc => tc.id)));
      } else {
        // For creating, all tests are available
        setTestsInSuite([]);
        setAvailableTestCases(projectCases);
        setSelectedTestCasesForSuite(new Set());
      }
    };
    loadTestCases();
  }, [projectId, editingSuite]);

  const handleMoveToSuite = () => {
    const testsToMove = availableTestCases.filter(tc => selectedAvailableTests.has(tc.id));
    setTestsInSuite([...testsInSuite, ...testsToMove]);
    setAvailableTestCases(availableTestCases.filter(tc => !selectedAvailableTests.has(tc.id)));
    setSelectedTestCasesForSuite(new Set([...selectedTestCasesForSuite, ...testsToMove.map(tc => tc.id)]));
    setSelectedAvailableTests(new Set());
  };

  const handleMoveAllToSuite = () => {
    setTestsInSuite([...testsInSuite, ...availableTestCases]);
    setSelectedTestCasesForSuite(new Set([...selectedTestCasesForSuite, ...availableTestCases.map(tc => tc.id)]));
    setAvailableTestCases([]);
    setSelectedAvailableTests(new Set());
  };

  const handleMoveFromSuite = () => {
    const testsToMove = testsInSuite.filter(tc => selectedInSuiteTests.has(tc.id));
    setAvailableTestCases([...availableTestCases, ...testsToMove]);
    setTestsInSuite(testsInSuite.filter(tc => !selectedInSuiteTests.has(tc.id)));
    const newSelected = new Set(selectedTestCasesForSuite);
    testsToMove.forEach(tc => newSelected.delete(tc.id));
    setSelectedTestCasesForSuite(newSelected);
    setSelectedInSuiteTests(new Set());
  };

  const handleMoveAllFromSuite = () => {
    setAvailableTestCases([...availableTestCases, ...testsInSuite]);
    setTestsInSuite([]);
    setSelectedTestCasesForSuite(new Set());
    setSelectedInSuiteTests(new Set());
  };

  const toggleAvailableTest = (testId: string) => {
    const newSelected = new Set(selectedAvailableTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedAvailableTests(newSelected);
  };

  const toggleInSuiteTest = (testId: string) => {
    const newSelected = new Set(selectedInSuiteTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedInSuiteTests(newSelected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-5xl rounded-lg border shadow-xl ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          }`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {editingSuite ? 'Edit Test Suite' : 'Create Test Suite'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1.5 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6">
            {/* Basic Information */}
            <div className="mb-6 space-y-4">
              <div>
                <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Test Suite Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter test suite name"
                />
              </div>
              <div>
                <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    isDarkMode
                      ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter test suite description"
                />
              </div>
              <div>
                <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Test Type
                </label>
                <select
                  value={formData.testType || 'UI Tests'}
                  onChange={e => setFormData({ ...formData, testType: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    isDarkMode ? 'border-slate-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-900'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                  <option value="UI Tests">UI Tests</option>
                  <option value="API Tests">API Tests</option>
                  <option value="Integration Tests">Integration Tests</option>
                </select>
              </div>
            </div>

            {/* Test Selection Panels */}
            <div className="mb-6 flex gap-4">
              {/* Left Panel - Tests in Suite */}
              <div
                className={`flex-1 rounded-lg border ${
                  isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                }`}>
                <div className={`border-b px-4 py-3 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Tests in Suite ({testsInSuite.length})
                  </h3>
                </div>
                <div className={`max-h-64 overflow-y-auto p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  {testsInSuite.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FiFile size={48} className={`mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No tests in suite</p>
                      <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Select tests from the right panel.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {testsInSuite.map(testCase => (
                        <label
                          key={testCase.id}
                          className={`flex cursor-pointer items-center gap-2 rounded border p-2 transition-colors ${
                            selectedInSuiteTests.has(testCase.id)
                              ? isDarkMode
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-blue-500 bg-blue-50'
                              : isDarkMode
                                ? 'border-slate-700 hover:bg-slate-700'
                                : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                          <input
                            type="checkbox"
                            checked={selectedInSuiteTests.has(testCase.id)}
                            onChange={() => toggleInSuiteTest(testCase.id)}
                            className="rounded border-gray-300"
                          />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {testCase.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow Buttons */}
              <div className="flex flex-col justify-center gap-2">
                <button
                  type="button"
                  onClick={handleMoveAllFromSuite}
                  disabled={testsInSuite.length === 0}
                  className={`rounded border p-2 transition-colors ${
                    testsInSuite.length === 0
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                        : 'border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Move all from suite">
                  <FiChevronLeft size={20} />
                  <FiChevronLeft size={20} className="-ml-3" />
                </button>
                <button
                  type="button"
                  onClick={handleMoveFromSuite}
                  disabled={selectedInSuiteTests.size === 0}
                  className={`rounded border p-2 transition-colors ${
                    selectedInSuiteTests.size === 0
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                        : 'border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Move selected from suite">
                  <FiChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleMoveToSuite}
                  disabled={selectedAvailableTests.size === 0}
                  className={`rounded border p-2 transition-colors ${
                    selectedAvailableTests.size === 0
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                        : 'border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Move selected to suite">
                  <FiChevronRight size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleMoveAllToSuite}
                  disabled={availableTestCases.length === 0}
                  className={`rounded border p-2 transition-colors ${
                    availableTestCases.length === 0
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode
                        ? 'border-slate-600 bg-slate-700 text-gray-300 hover:bg-slate-600'
                        : 'border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Move all to suite">
                  <FiChevronRight size={20} />
                  <FiChevronRight size={20} className="-ml-3" />
                </button>
              </div>

              {/* Right Panel - Available Tests */}
              <div
                className={`flex-1 rounded-lg border ${
                  isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
                }`}>
                <div className={`border-b px-4 py-3 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
                  <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Available Tests ({availableTestCases.length})
                  </h3>
                </div>
                <div className={`max-h-64 overflow-y-auto p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  {availableTestCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FiFile size={48} className={`mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No available tests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableTestCases.map(testCase => (
                        <label
                          key={testCase.id}
                          className={`flex cursor-pointer items-center gap-2 rounded border p-2 transition-colors ${
                            selectedAvailableTests.has(testCase.id)
                              ? isDarkMode
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-blue-500 bg-blue-50'
                              : isDarkMode
                                ? 'border-slate-700 hover:bg-slate-700'
                                : 'border-gray-200 hover:bg-gray-50'
                          }`}>
                          <input
                            type="checkbox"
                            checked={selectedAvailableTests.has(testCase.id)}
                            onChange={() => toggleAvailableTest(testCase.id)}
                            className="rounded border-gray-300"
                          />
                          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {testCase.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Suite Summary */}
            <div
              className={`mb-6 rounded-lg border p-4 ${
                isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
              }`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Suite Summary: {testsInSuite.length} test(s) configured • {availableTestCases.length} test(s) available
                to add.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-end gap-3 border-t px-6 py-4 ${
              isDarkMode ? 'border-slate-700' : 'border-gray-200'
            }`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
              {editingSuite ? 'Save Changes' : 'Create Suite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CreateCaseModalProps {
  formData: { name: string; description: string; prompt: string; playwrightCode: string };
  setFormData: (data: { name: string; description: string; prompt: string; playwrightCode: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editingTestCase?: TestCase | null;
  isDarkMode: boolean;
}

function CreateCaseModal({
  formData,
  setFormData,
  onSubmit,
  onClose,
  editingTestCase,
  isDarkMode,
}: CreateCaseModalProps) {
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [codeLineNumbers, setCodeLineNumbers] = useState<string[]>([]);
  const codeTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);

  // Update line numbers when code changes
  useEffect(() => {
    if (formData.playwrightCode) {
      const lines = formData.playwrightCode.split('\n');
      setCodeLineNumbers(lines.map((_, i) => String(i + 1)));
    } else {
      setCodeLineNumbers([]);
    }
  }, [formData.playwrightCode]);

  // Sync scrolling between textarea and line numbers
  const handleCodeScroll = () => {
    if (codeTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = codeTextareaRef.current.scrollTop;
    }
  };

  const handleCopyCode = () => {
    if (formData.playwrightCode) {
      navigator.clipboard.writeText(formData.playwrightCode);
      alert('Playwright code copied to clipboard!');
    }
  };

  const handleDownloadCode = () => {
    if (formData.playwrightCode) {
      const blob = new Blob([formData.playwrightCode], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${editingTestCase?.name || 'test'}.spec.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCancelEdit = () => {
    if (editingTestCase) {
      setFormData({
        ...formData,
        playwrightCode: editingTestCase.playwrightCode || '',
      });
    }
    setIsEditingCode(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-4xl rounded-lg border p-6 shadow-xl ${
          isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {editingTestCase ? 'Edit Test Case' : 'Create Test Case'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1.5 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Test Case Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter test case name"
            />
          </div>
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
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter description"
            />
          </div>
          <div className="mb-4">
            <label className={`mb-2 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Automation Prompt *
            </label>
            <textarea
              required
              value={formData.prompt}
              onChange={e => setFormData({ ...formData, prompt: e.target.value })}
              rows={4}
              className={`w-full rounded-lg border px-3 py-2 ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
              } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter the automation prompt for this test case"
            />
            <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Note: Planner description will appear here after the test case is executed with the planner agent.
            </p>
          </div>

          {/* Playwright Code Section - Only show when editing */}
          {editingTestCase && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Playwright Code
                </label>
                <div className="flex items-center gap-2">
                  {!isEditingCode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditingCode(true)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                          isDarkMode
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                        <FiEdit2 size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                          isDarkMode
                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}>
                        <FiCopy size={12} />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCode}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                          isDarkMode
                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}>
                        <FiDownload size={12} />
                        Download
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                          isDarkMode
                            ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingCode(false)}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                          isDarkMode
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="relative">
                {/* Line Numbers */}
                {formData.playwrightCode && (
                  <div
                    ref={lineNumbersRef}
                    className={`absolute left-0 top-0 h-full overflow-hidden border-r pr-2 text-right font-mono text-xs ${
                      isDarkMode ? 'border-slate-600 text-gray-500' : 'border-gray-300 text-gray-400'
                    }`}
                    style={{ width: '40px', paddingTop: '12px', paddingBottom: '12px' }}>
                    {codeLineNumbers.map((line, idx) => (
                      <div key={idx} className="leading-6">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
                {/* Code Textarea */}
                <textarea
                  ref={codeTextareaRef}
                  readOnly={!isEditingCode}
                  value={formData.playwrightCode}
                  onChange={e => setFormData({ ...formData, playwrightCode: e.target.value })}
                  onScroll={handleCodeScroll}
                  rows={15}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-sm ${
                    isDarkMode
                      ? isEditingCode
                        ? 'border-slate-600 bg-slate-700 text-white placeholder:text-gray-400'
                        : 'border-slate-600 bg-slate-900 text-white placeholder:text-gray-400'
                      : isEditingCode
                        ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500'
                        : 'border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500'
                  } ${formData.playwrightCode ? 'pl-12' : ''} focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Playwright code will appear here after test execution"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Note: Edit the Playwright code directly. Changes will be saved when you update the test case.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
              {editingTestCase ? 'Update Test Case' : 'Create Test Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
