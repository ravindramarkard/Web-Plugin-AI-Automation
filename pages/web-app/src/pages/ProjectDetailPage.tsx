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
  FiMonitor,
  FiCpu,
  FiTarget,
  FiActivity,
  FiCheckSquare,
} from 'react-icons/fi';
import { BiBug } from 'react-icons/bi';
import { projectStorage, type Project } from '../lib/projectStorage';
import { testSuiteStorage, type TestSuite, type TestCase, type TestSuiteSchedule } from '../lib/testSuiteStorage';
import SettingsPage from './SettingsPage';
import EnvironmentSettings from '../components/EnvironmentSettings';
import PromptsTab from '../components/PromptsTab';
import type { RunSuiteOptions } from '../components/RunTestSuiteModal';
import RunTestSuiteModal from '../components/RunTestSuiteModal';
import ChatView from '../components/ChatView';
import GeneratingNotification from '../components/GeneratingNotification';
import { webService } from '../lib/webService';
import { apiPost, API_ENDPOINTS } from '../lib/apiConfig';
import { startCodegen } from '../lib/testGenAPI';
import { ExecutionState } from '../types/event';
import ApiTestGeneratorPage from './ApiTestGeneratorPage';

type TabType = 'prompt' | 'test-suite' | 'report' | 'settings' | 'environments' | 'api-test-gen';

// Helper to determine test type
const getTestType = (tc: TestCase): 'ui' | 'api' => {
  if (tc.testType) {
    if (tc.testType.toLowerCase().includes('api')) return 'api';
    if (tc.testType.toLowerCase().includes('ui')) return 'ui';
  }
  // Fallback to prompt/description
  return tc.prompt?.toLowerCase().includes('api') || tc.description?.toLowerCase().includes('api') ? 'api' : 'ui';
};

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
  const [showRunSuiteModal, setShowRunSuiteModal] = useState(false);
  const [suiteToRun, setSuiteToRun] = useState<TestSuite | null>(null);
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
  const [sidebarWidth, setSidebarWidth] = useState(1000); // Default width for prompt sidebar

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
        const projectCases = Array.isArray(allCases)
          ? allCases.filter(tc => tc.testSuiteId && suiteIds.has(tc.testSuiteId as string))
          : [];
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
        testType: suiteFormData.testType as any,
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
        testType: suiteFormData.testType as any,
      });

      // Update test cases
      const updatePromises = [];

      // 1. Add/Ensure selected tests are in the suite
      for (const testCaseId of Array.from(selectedTestCasesForSuite)) {
        updatePromises.push(
          testSuiteStorage.updateTestCase(testCaseId, {
            testSuiteId: editingSuite.id,
          }),
        );
      }

      // 2. Remove tests that were moved out of the suite
      // These are tests in availableTestCases that still have this suite's ID
      for (const testCase of availableTestCases) {
        if (testCase.testSuiteId === editingSuite.id) {
          updatePromises.push(
            testSuiteStorage.updateTestCase(testCase.id, {
              testSuiteId: null as any,
            }),
          );
        }
      }

      await Promise.all(updatePromises);

      await loadTestSuites();
      // Reload cases if we are viewing this suite
      if (selectedTestSuite === editingSuite.id) {
        await loadTestCases(editingSuite.id);
      }

      setShowCreateSuiteModal(false);
      setEditingSuite(null);
      setSuiteFormData({ name: '', description: '', testType: 'UI Tests' });
    } catch (error) {
      console.error('Failed to update test suite:', error);
    }
  };

  const handleDeleteSuite = async (suiteId: string) => {
    if (!confirm('Are you sure you want to delete this test suite? Test cases will be moved to "Unassigned" suite.')) {
      return;
    }

    try {
      // Delete the test suite (server handles moving test cases to Unassigned)
      await testSuiteStorage.deleteTestSuite(suiteId);

      // If the deleted suite was selected, clear selection
      if (selectedTestSuite === suiteId) {
        setSelectedTestSuite(null);
        setTestCases([]);
      }

      await loadTestSuites();

      // Reload all test cases to show them in "All Tests" (they are now unassigned)
      if (projectId) {
        await loadTestCases();
      }
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

  const handleRunTestCase = async (testCase: TestCase, debug: boolean = false) => {
    // Update status to running
    await testSuiteStorage.updateTestCase(testCase.id, { status: 'running', lastRunAt: Date.now() });
    await loadTestCases(selectedTestSuite!);

    // Navigate to prompt tab and execute
    setActiveTab('prompt');

    try {
      console.log(`[ProjectDetailPage] Triggering execution for test case: ${testCase.id} (Debug: ${debug})`);

      // Trigger server-side execution
      const response = await apiPost<{ success: boolean; result: any }>(
        `${API_ENDPOINTS.execution}/run/${testCase.id}`,
        { debug },
      );

      console.log('[ProjectDetailPage] Execution complete:', response);

      // Reload cases to reflect new status
      await loadTestCases(selectedTestSuite!);

      if (response.success && response.result.success) {
        // Optional: show success notification
      } else {
        alert(`Test failed: ${response.result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[ProjectDetailPage] Execution failed:', error);
      await testSuiteStorage.updateTestCase(testCase.id, {
        status: 'fail',
        errorMessage: error instanceof Error ? error.message : 'Execution failed to start',
        lastRunAt: Date.now(),
      });
      await loadTestCases(selectedTestSuite!);
      alert('Failed to start test execution. Check console for details.');
    }
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

  const handleRunSuite = async (suiteId: string) => {
    const suite = testSuites.find(s => s.id === suiteId);
    if (suite) {
      setSuiteToRun(suite);
      setShowRunSuiteModal(true);
    }
  };

  const handleExecuteSuite = async (options: RunSuiteOptions) => {
    if (!suiteToRun) return;
    const suiteId = suiteToRun.id;

    try {
      setShowRunSuiteModal(false);

      // Ideally show a proper loading indicator
      const btn = document.getElementById(`run-suite-${suiteId}`);
      if (btn) (btn as HTMLButtonElement).disabled = true;

      await apiPost(`${API_ENDPOINTS.execution}/run-suite/${suiteId}`, options);
      alert('Suite execution completed! You can now view the reports.');

      if (btn) (btn as HTMLButtonElement).disabled = false;
      setSuiteToRun(null);
    } catch (error: any) {
      console.error('Failed to run suite:', error);
      alert('Failed to run suite: ' + error.message);
      const btn = document.getElementById(`run-suite-${suiteId}`);
      if (btn) (btn as HTMLButtonElement).disabled = false;
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      // Min width 300px, Max width 1200px
      if (newWidth > 300 && newWidth < 1200) {
        setSidebarWidth(newWidth);
      }
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent">
        <div className="glass-panel rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Generating Notification */}
      <GeneratingNotification isVisible={isGenerating} message={generatingMessage} />

      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-4 dark:border-white/5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="rounded p-2 text-gray-600 transition-colors hover:bg-white/10 dark:text-gray-400 dark:hover:bg-white/10">
            <FiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-2xl dark:bg-blue-900/50">
              {getIconEmoji(project.icon)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{project.team || 'No team'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-white/10 dark:border-white/5">
          <TabButton
            icon={FiMessageSquare}
            label="Prompt"
            isActive={activeTab === 'prompt'}
            onClick={() => setActiveTab('prompt')}
          />
          <TabButton
            icon={FiList}
            label="Test Suite"
            isActive={activeTab === 'test-suite'}
            onClick={() => setActiveTab('test-suite')}
          />
          <TabButton
            icon={FiFileText}
            label="Report"
            isActive={activeTab === 'report'}
            onClick={() => setActiveTab('report')}
          />
          <TabButton
            icon={FiSettings}
            label="LLM Settings"
            isActive={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
          <TabButton
            icon={FiGlobe}
            label="Environment Settings"
            isActive={activeTab === 'environments'}
            onClick={() => setActiveTab('environments')}
          />
          <TabButton
            icon={FiGlobe}
            label="API Test Gen"
            isActive={activeTab === 'api-test-gen'}
            onClick={() => setActiveTab('api-test-gen')}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'prompt' && (
          <div className="flex h-full">
            {/* Prompts List - Left Side */}
            <div className="overflow-y-auto border-r" style={{ width: sidebarWidth, flexShrink: 0 }}>
              <PromptsTab
                projectId={projectId!}
                onExecutePrompt={promptContent => {
                  // Execute prompt - events will be shown in chat view
                  console.log('Execute prompt:', promptContent);
                }}
              />
            </div>

            {/* Resizer Handle */}
            <div
              className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400 hover:bg-blue-500 active:bg-blue-600 dark:bg-slate-700 dark:hover:bg-blue-600"
              onMouseDown={handleResizeMouseDown}
            />

            {/* Chat View - Right Side */}
            <div className="flex-1 overflow-hidden">
              <ChatView />
            </div>
          </div>
        )}

        {activeTab === 'api-test-gen' && (
          <div className="h-full overflow-y-auto">
            <ApiTestGeneratorPage projectId={projectId} />
          </div>
        )}

        {activeTab === 'test-suite' && (
          <TestSuiteTab
            projectId={projectId || ''}
            testSuites={testSuites}
            selectedTestSuite={selectedTestSuite}
            onSelectSuite={suiteId => {
              setSelectedTestSuite(suiteId);
              if (suiteId) {
                loadTestCases(suiteId);
              } else {
                loadTestCases();
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
            onRunSuite={suite => handleRunSuite(suite.id)}
            onCreateCase={() => {
              setEditingTestCase(null);
              setCaseFormData({ name: '', description: '', prompt: '', playwrightCode: '' });
              setShowCreateCaseModal(true);
            }}
            onEditCase={handleEditCase}
            onViewPlaywrightCode={testCase => setViewingPlaywrightCode({ testCase })}
            onViewPrompt={testCase => setViewingPrompt({ testCase })}
            onRefreshTestCases={async view => {
              if (view === 'all-tests') {
                await loadTestCases();
              } else if (selectedTestSuite) {
                await loadTestCases(selectedTestSuite);
              } else if (projectId) {
                await loadTestCases();
              }
            }}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab projectId={projectId!} testSuites={testSuites} onRunSuite={handleRunSuite} />
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto">
            <SettingsPage projectId={projectId} />
          </div>
        )}

        {activeTab === 'environments' && (
          <div className="h-full overflow-y-auto">
            <EnvironmentSettings projectId={projectId} />
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
        />
      )}

      {/* Run Test Suite Modal */}
      {showRunSuiteModal && suiteToRun && projectId && (
        <RunTestSuiteModal
          suite={suiteToRun}
          projectId={projectId}
          onClose={() => {
            setShowRunSuiteModal(false);
            setSuiteToRun(null);
          }}
          onRun={handleExecuteSuite}
        />
      )}

      {/* View Playwright Code Modal */}
      {viewingPlaywrightCode && (
        <ViewCodeModal testCase={viewingPlaywrightCode.testCase} onClose={() => setViewingPlaywrightCode(null)} />
      )}

      {/* View Prompt Modal */}
      {viewingPrompt && <ViewPromptModal testCase={viewingPrompt.testCase} onClose={() => setViewingPrompt(null)} />}
    </div>
  );
}

interface ViewCodeModalProps {
  testCase: TestCase;
  onClose: () => void;
}

function ViewCodeModal({ testCase, onClose }: ViewCodeModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-4xl rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Playwright Code</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{testCase.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="glass-button flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white/10 dark:text-gray-200">
              <FiCopy size={14} />
              Copy
            </button>
            <button
              type="button"
              onClick={handleDownloadCode}
              className="glass-button flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white/10 dark:text-gray-200">
              <FiDownload size={14} />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="glass-input relative overflow-hidden rounded-xl">
          {/* Line Numbers */}
          {testCase.playwrightCode && (
            <div
              ref={lineNumbersRef}
              className="absolute left-0 top-0 h-full overflow-hidden border-r border-white/10 bg-black/5 pr-2 text-right font-mono text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400"
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
            className="w-full bg-transparent px-3 py-2 font-mono text-sm text-gray-800 focus:outline-none dark:text-gray-200"
            style={{
              resize: 'vertical',
              paddingLeft: testCase.playwrightCode ? '48px' : '12px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface ViewPromptModalProps {
  testCase: TestCase;
  onClose: () => void;
}

function ViewPromptModal({ testCase, onClose }: ViewPromptModalProps) {
  const promptText = testCase.plannerDescription || testCase.prompt || 'No automation prompt available';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Automation Prompt</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{testCase.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
            <FiX size={20} />
          </button>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Prompt Details</label>
          <textarea
            readOnly
            value={promptText}
            rows={12}
            className="glass-input w-full rounded-xl p-4 font-mono text-sm text-gray-800 outline-none dark:text-gray-200"
          />
        </div>

        {testCase.description && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <div className="glass-input rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300">
              {testCase.description}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="glass-button rounded-xl bg-white/10 px-6 py-2.5 font-medium text-gray-700 transition-all hover:bg-white/20 dark:text-white">
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
}

function SchedulerModal({ suite, onClose, onSave, onDelete }: SchedulerModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              <FiClock size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Schedule</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Cron Expression */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Cron Expression *</label>
            <input
              type="text"
              required
              value={cronExpression}
              onChange={e => setCronExpression(e.target.value)}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
              placeholder="0 9 * * 1-5"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Schedule when to run the test suite (minute hour day month weekday)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cronExamples.map((example, idx) => (
                <div
                  key={idx}
                  className="glass-card flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-200/50 dark:text-gray-400 dark:hover:bg-white/10"
                  onClick={() => setCronExpression(example.expression)}>
                  <code className="font-mono font-semibold text-blue-600 dark:text-blue-400">{example.expression}</code>
                  <span>{example.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Environment *</label>
            <div className="relative">
              <select
                required
                value={environment}
                onChange={e => setEnvironment(e.target.value)}
                className="glass-input w-full appearance-none rounded-xl px-4 py-3 text-sm text-gray-900 outline-none dark:text-white">
                <option value="" className="dark:bg-slate-800">
                  Select environment
                </option>
                {environments.map(env => (
                  <option key={env} value={env} className="dark:bg-slate-800">
                    {env}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                <FiChevronDown size={16} />
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            {/* Enable Schedule */}
            <div className="glass-card rounded-xl p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                  className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Enable Schedule</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
                </div>
              </label>
            </div>

            {/* Headless Mode */}
            <div className="glass-card rounded-xl p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={headless}
                  onChange={e => setHeadless(e.target.checked)}
                  className="size-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Headless Mode</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Run without UI</span>
                </div>
              </label>
            </div>
          </div>

          {/* Number of Workers */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Workers</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={workers}
                onChange={e => setWorkers(parseInt(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-500 dark:bg-gray-700"
              />
              <div className="glass-input flex h-10 w-16 items-center justify-center rounded-lg font-mono font-medium">
                {workers}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Parallel test workers (1-10)</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-gray-200/50 pt-6 dark:border-white/10">
            <div>
              {suite.schedule && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this schedule?')) {
                      await onDelete();
                    }
                  }}
                  className="glass-button flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20">
                  <FiTrash2 size={16} />
                  Delete Schedule
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-6 py-2.5 font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10">
                Cancel
              </button>
              <button
                type="submit"
                className="glass-button flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                <FiCheckCircle size={18} />
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
}

function TabButton({ icon: Icon, label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
      }`}>
      <Icon size={18} />
      {label}
    </button>
  );
}

interface TestSuiteTabProps {
  projectId: string;
  testSuites: TestSuite[];
  selectedTestSuite: string | null;
  onSelectSuite: (suiteId: string | null) => void;
  testCases: TestCase[];
  onRunCase: (testCase: TestCase, debug?: boolean) => void;
  onCreateSuite: () => void;
  onEditSuite: (suite: TestSuite) => void;
  onDeleteSuite: (suiteId: string) => void;
  onSchedulerSuite?: (suite: TestSuite) => void;
  onRunSuite?: (suite: TestSuite) => void;
  onCreateCase: () => void;
  onEditCase?: (testCase: TestCase) => void;
  onViewPlaywrightCode?: (testCase: TestCase) => void;
  onViewPrompt?: (testCase: TestCase) => void;
  onRefreshTestCases?: (view?: string) => Promise<void>;
}

function TestSuiteTab({
  projectId,
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
}: TestSuiteTabProps) {
  const [view, setView] = useState<'overview' | 'test-suites' | 'collections' | 'all-tests' | 'tags'>('all-tests');
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'ui' | 'api'>('ui');
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());

  // Test Gen Modal State
  const [showTestGenModal, setShowTestGenModal] = useState(false);
  const [testGenUrl, setTestGenUrl] = useState('');
  const [testGenName, setTestGenName] = useState('');
  const [isTestGenRunning, setIsTestGenRunning] = useState(false);

  const handleStartCodegen = async () => {
    if (!testGenUrl || !testGenName) {
      alert('Please enter URL and Name');
      return;
    }

    setIsTestGenRunning(true);
    try {
      await startCodegen(testGenUrl, testGenName, projectId, selectedTestSuite);
      setShowTestGenModal(false);
      setTestGenUrl('');
      setTestGenName('');
      if (onRefreshTestCases) onRefreshTestCases(view);
    } catch (error: any) {
      console.error(error);
      alert('Failed to generate test: ' + error.message);
    } finally {
      setIsTestGenRunning(false);
    }
  };

  // Sidebar resizing
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = mouseMoveEvent.clientX - sidebarRef.current.getBoundingClientRect().left;
        if (newWidth >= 200 && newWidth <= 800) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing],
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Filter test cases by type
  const filteredTestCases = testCases.filter(testCase => {
    if (testTypeFilter === 'all') return true;
    const testType = getTestType(testCase);
    return testType === testTypeFilter;
  });

  const uiTestCount = testCases.filter(tc => getTestType(tc) === 'ui').length;
  const apiTestCount = testCases.filter(tc => getTestType(tc) === 'api').length;

  // Overview Stats Calculation
  const totalPrompts = testCases.filter(tc => tc.prompt).length;
  const totalTestCases = testCases.length;
  const successRate =
    totalTestCases > 0
      ? ((testCases.filter(tc => tc.status === 'pass').length / totalTestCases) * 100).toFixed(1)
      : '0.0';
  const recentExecutions = testCases.filter(tc => {
    if (!tc.lastRunAt) return false;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return tc.lastRunAt > sevenDaysAgo;
  }).length;

  // Mock Recent Activity (derived from test cases)
  const recentActivity = testCases
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 8)
    .map(tc => ({
      id: tc.id,
      type: tc.status === 'pass' ? 'success' : tc.status === 'fail' ? 'error' : 'info',
      message: `${tc.status === 'pass' ? 'Passed' : tc.status === 'fail' ? 'Failed' : 'Updated'} test case: ${tc.name}`,
      time: new Date(tc.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

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
        await onRefreshTestCases(view);
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
      await onRefreshTestCases(view);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* Navigation Tabs */}
      <div className="glass-panel sticky top-0 z-10 border-b border-white/10 px-6 backdrop-blur-md">
        <div className="flex space-x-8">
          <NavTab label="OVERVIEW" isActive={view === 'overview'} onClick={() => setView('overview')} />
          <NavTab label="TEST SUITES" isActive={view === 'test-suites'} onClick={() => setView('test-suites')} />
          <NavTab label="COLLECTIONS" isActive={view === 'collections'} onClick={() => setView('collections')} />
          <NavTab
            label="ALL TESTS"
            isActive={view === 'all-tests'}
            onClick={() => {
              setView('all-tests');
              onSelectSuite(null);
            }}
          />
          <NavTab label="TAGS" isActive={view === 'tags'} onClick={() => setView('tags')} />
        </div>
      </div>

      {/* Content Area */}
      {view === 'overview' ? (
        <div className="flex-1 overflow-auto p-6">
          {/* Stats Cards Row */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {/* TOTAL PROMPTS */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-blue-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    TOTAL PROMPTS
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalPrompts}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">AI-generated test prompts</p>
                </div>
                <div className="rounded-full bg-blue-50 p-2 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400">
                  <FiEdit2 size={16} />
                </div>
              </div>
            </div>

            {/* TOTAL UI & API TCS */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-green-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    TOTAL UI & API TCS
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{totalTestCases}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">UI & API test cases</p>
                </div>
                <div className="rounded-full bg-green-50 p-2 text-green-500 dark:bg-green-900/30 dark:text-green-400">
                  <FiCheckCircle size={16} />
                </div>
              </div>
            </div>

            {/* TOTAL UI TCS */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-emerald-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    TOTAL UI TCS
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{uiTestCount}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">UI test cases</p>
                </div>
                <div className="rounded-full bg-emerald-50 p-2 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <FiMonitor size={16} />
                </div>
              </div>
            </div>

            {/* TOTAL API TCS */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-sky-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    TOTAL API TCS
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{apiTestCount}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">API test cases</p>
                </div>
                <div className="rounded-full bg-sky-50 p-2 text-sky-500 dark:bg-sky-900/30 dark:text-sky-400">
                  <FiCpu size={16} />
                </div>
              </div>
            </div>

            {/* TEST MANAGEMENT */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-orange-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    TEST MANAGEMENT
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{testSuites.length}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Organized test collections</p>
                </div>
                <div className="rounded-full bg-orange-50 p-2 text-orange-500 dark:bg-orange-900/30 dark:text-orange-400">
                  <FiBarChart2 size={16} />
                </div>
              </div>
            </div>

            {/* ENVIRONMENTS */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-purple-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    ENVIRONMENTS
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">4</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Configured test environments</p>
                </div>
                <div className="rounded-full bg-purple-50 p-2 text-purple-500 dark:bg-purple-900/30 dark:text-purple-400">
                  <FiSettings size={16} />
                </div>
              </div>
            </div>

            {/* SUCCESS RATE */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-red-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    SUCCESS RATE
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{successRate}%</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Test execution success rate</p>
                </div>
                <div className="rounded-full bg-red-50 p-2 text-red-500 dark:bg-red-900/30 dark:text-red-400">
                  <FiTarget size={16} />
                </div>
              </div>
            </div>

            {/* RECENT EXECUTIONS */}
            <div className="glass-card relative overflow-hidden rounded-xl border-t-4 border-t-teal-500 p-4 transition-transform hover:scale-105">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    RECENT EXECUTIONS
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{recentExecutions}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Tests run in last 7 days</p>
                </div>
                <div className="rounded-full bg-teal-50 p-2 text-teal-500 dark:bg-teal-900/30 dark:text-teal-400">
                  <FiPlay size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <div className="glass-panel rounded-xl">
              {recentActivity.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {recentActivity.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                      <div
                        className={`rounded-full p-2 ${
                          activity.type === 'success'
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : activity.type === 'error'
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                        {activity.type === 'success' ? (
                          <FiCheckCircle size={16} />
                        ) : activity.type === 'error' ? (
                          <FiXCircle size={16} />
                        ) : (
                          <FiActivity size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No recent activity</div>
              )}
            </div>
          </div>
        </div>
      ) : view === 'all-tests' ? (
        <div className="glass-panel m-6 flex flex-1 flex-col overflow-hidden rounded-xl border border-white/10 shadow-xl">
          {/* Header with filters and actions */}
          <div className="glass-panel border-b border-white/10 px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Test Cases{' '}
                {testCases.length > 0 && (
                  <span className="text-base font-normal text-gray-500">({testCases.length})</span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onCreateCase}
                  className="glass-button flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30">
                  <FiPlus size={18} />
                  Add Test Case
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="glass-button flex items-center gap-2 rounded-lg bg-gray-500/10 px-4 py-2 font-medium text-gray-700 transition-all hover:bg-gray-500/20 dark:text-gray-200 dark:hover:bg-gray-500/30">
                  <FiRefreshCw size={16} />
                  REFRESH
                </button>
                <button
                  type="button"
                  onClick={() => setShowTestGenModal(true)}
                  className="glass-button flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30">
                  <FiCode size={16} />
                  TEST GEN
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedTestCases.size === 0}
                  className={`glass-button flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white shadow-lg transition-all ${
                    selectedTestCases.size === 0
                      ? 'cursor-not-allowed bg-red-600/50 opacity-50 shadow-none'
                      : 'bg-red-600 shadow-red-500/20 hover:shadow-red-500/30'
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
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}>
                UI TESTS ({uiTestCount})
              </button>
              <button
                type="button"
                onClick={() => setTestTypeFilter('api')}
                className={`pb-2 font-medium transition-colors ${
                  testTypeFilter === 'api'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}>
                API TESTS ({apiTestCount})
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total: {testCases.length} tests</div>
            </div>
          </div>

          {/* Test Cases Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="glass-panel sticky top-0 z-10 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTestCases.size === filteredTestCases.length && filteredTestCases.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 accent-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">NAME</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    DESCRIPTION
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">CODE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ENVIRONMENT
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">TAG</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTestCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      No test cases found
                    </td>
                  </tr>
                ) : (
                  filteredTestCases.map(testCase => {
                    const testType = getTestType(testCase);
                    return (
                      <tr
                        key={testCase.id}
                        className="border-b border-gray-200 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedTestCases.has(testCase.id)}
                            onChange={() => handleSelectTestCase(testCase.id)}
                            className="rounded border-gray-300 accent-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{testCase.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {testCase.description || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {testCase.playwrightCode ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-400">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {testCase.baseUrl || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              testType === 'ui'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
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
                                className="rounded p-1.5 text-blue-600 transition-colors hover:bg-black/5 dark:text-blue-400 dark:hover:bg-white/10"
                                title="Edit test case">
                                <FiEdit2 size={16} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRunCase(testCase)}
                              className="rounded p-1.5 text-green-600 transition-colors hover:bg-black/5 dark:text-green-400 dark:hover:bg-white/10"
                              title="Run test">
                              <FiPlay size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRunCase(testCase, true)}
                              className="rounded p-1.5 text-orange-600 transition-colors hover:bg-black/5 dark:text-orange-400 dark:hover:bg-white/10"
                              title="Debug mode">
                              <BiBug size={16} />
                            </button>
                            {testCase.playwrightCode && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onViewPlaywrightCode) {
                                    onViewPlaywrightCode(testCase);
                                  }
                                }}
                                className="rounded p-1.5 text-purple-600 transition-colors hover:bg-black/5 dark:text-purple-400 dark:hover:bg-white/10"
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
            ref={sidebarRef}
            style={{ width: sidebarWidth, minWidth: 200 }}
            className="glass-panel relative z-20 border-r border-white/10 p-4 shadow-xl">
            {/* Resizer Handle */}
            <div
              onMouseDown={startResizing}
              className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 ${
                isResizing ? 'bg-blue-500' : 'bg-transparent'
              }`}
              style={{ zIndex: 10, cursor: 'col-resize' }}
            />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Test Suites</h2>
              <button
                type="button"
                onClick={onCreateSuite}
                className="glass-button rounded p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700">
                <FiPlus size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {testSuites.map(suite => (
                <div
                  key={suite.id}
                  className={`glass-card group relative rounded-xl transition-all ${
                    selectedTestSuite === suite.id
                      ? 'border-blue-500/30 bg-blue-500/10 shadow-md'
                      : 'hover:border-white/20 hover:bg-white/5 dark:hover:bg-white/5'
                  }`}>
                  <button
                    type="button"
                    onClick={() => onSelectSuite(suite.id)}
                    className="w-full rounded-xl px-4 py-3 text-left transition-colors">
                    <div
                      className={`font-medium ${selectedTestSuite === suite.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {suite.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                        className="glass-button rounded-lg p-1.5 text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title="Schedule test suite">
                        <FiClock size={14} />
                      </button>
                    )}
                    {onRunSuite && (
                      <button
                        type="button"
                        id={`run-suite-${suite.id}`}
                        onClick={e => {
                          e.stopPropagation();
                          onRunSuite(suite);
                        }}
                        className="glass-button flex items-center gap-1 rounded-lg bg-green-600/90 px-2 py-1 text-white shadow-sm transition-colors hover:bg-green-600"
                        title="Run test suite">
                        <FiPlay size={12} />
                        <span className="text-xs font-bold">RUN</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onEditSuite(suite);
                      }}
                      className="glass-button rounded-lg p-1.5 text-blue-500 transition-colors hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit test suite">
                      <FiEdit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteSuite(suite.id);
                      }}
                      className="glass-button rounded-lg p-1.5 text-red-500 transition-colors hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete test suite">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Cases Content */}
          <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
            {selectedTestSuite ? (
              <>
                {/* Test Cases Header */}
                <div className="glass-panel sticky top-0 z-10 border-b border-white/10 px-6 py-4 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Test Cases{' '}
                      {testCases.length > 0 && (
                        <span className="text-base font-normal text-gray-500">({testCases.length})</span>
                      )}
                    </h2>
                    <button
                      type="button"
                      onClick={onCreateCase}
                      className="glass-button flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-700">
                      <FiPlus size={18} />
                      Add Test Case
                    </button>
                  </div>
                </div>

                {/* Test Cases Table */}
                {testCases.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <p>No test cases yet</p>
                      <button
                        type="button"
                        onClick={onCreateCase}
                        className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                        Create your first test case
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full">
                      <thead className="glass-panel sticky top-0 z-10 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            NAME
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            DESCRIPTION
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            CODE
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            AUTOMATION PROMPT
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            ENVIRONMENT
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                            TAG
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                              className="border-b border-gray-200 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900 dark:text-white">{testCase.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {testCase.description || '-'}
                              </td>
                              <td className="px-4 py-3">
                                {testCase.playwrightCode ? (
                                  <button
                                    type="button"
                                    onClick={() => onViewPlaywrightCode?.(testCase)}
                                    className="glass-button inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30">
                                    Available
                                    <FiEye size={12} />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {testCase.prompt || testCase.plannerDescription ? (
                                  <button
                                    type="button"
                                    onClick={() => onViewPrompt?.(testCase)}
                                    className="glass-button inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30">
                                    View Steps
                                    <FiEye size={12} />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                {testCase.baseUrl || '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                    testType === 'ui'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
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
                                      className="rounded p-1.5 text-blue-600 transition-colors hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-slate-700"
                                      title="Edit test case">
                                      <FiEdit2 size={16} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onRunCase(testCase)}
                                    className="rounded p-1.5 text-green-600 transition-colors hover:bg-gray-100 dark:text-green-400 dark:hover:bg-slate-700"
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
                                      className="rounded p-1.5 text-purple-600 transition-colors hover:bg-gray-100 dark:text-purple-400 dark:hover:bg-slate-700"
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
              <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p>Select a test suite to view test cases</p>
                  {testSuites.length === 0 && (
                    <button
                      type="button"
                      onClick={onCreateSuite}
                      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
                      Create Test Suite
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
          <p>{view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')} view coming soon</p>
        </div>
      )}

      {/* Test Gen Modal */}
      {showTestGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-xl p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Generate Test Case</h3>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Application URL</label>
              <input
                type="text"
                value={testGenUrl}
                onChange={e => setTestGenUrl(e.target.value)}
                placeholder="https://example.com"
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Test Case Name</label>
              <input
                type="text"
                value={testGenName}
                onChange={e => setTestGenName(e.target.value)}
                placeholder="e.g. Login Flow"
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTestGenModal(false)}
                className="rounded-xl px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartCodegen}
                disabled={isTestGenRunning || !testGenUrl || !testGenName}
                className="glass-button flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none">
                {isTestGenRunning ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <FiMonitor size={16} />
                    Start Recording
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NavTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavTab({ label, isActive, onClick }: NavTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 pt-4 font-medium transition-colors ${
        isActive
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'
      }`}>
      {label}
      {isActive && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500"></div>}
    </button>
  );
}

interface TestCaseCardProps {
  testCase: TestCase;
  onRun: () => void;
}

function TestCaseCard({ testCase, onRun }: TestCaseCardProps) {
  const [showPlaywrightCode, setShowPlaywrightCode] = useState(false);

  const statusColors = {
    pass: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
    fail: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
    pending: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
    running: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
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
    <div className="glass-card mb-4 rounded-xl p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{testCase.name}</h3>
          {testCase.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{testCase.description}</p>
          )}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[testCase.status]}`}>
          <StatusIcon size={14} />
          {testCase.status}
        </span>
      </div>
      <div className="mb-3 rounded-lg bg-white/40 p-3 text-sm backdrop-blur-sm dark:bg-black/20">
        <div className="font-medium text-gray-700 dark:text-gray-300">Prompt:</div>
        <div className="mt-1 truncate text-gray-600 dark:text-gray-400">{testCase.prompt}</div>
      </div>

      {/* Playwright Code Section */}
      {testCase.playwrightCode && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowPlaywrightCode(!showPlaywrightCode)}
            className="glass-button flex w-full items-center justify-between rounded-lg p-2 text-sm">
            <div className="flex items-center gap-2">
              <FiCode size={16} />
              <span className="font-medium">Playwright Code</span>
            </div>
            <FiEye size={16} />
          </button>
          {showPlaywrightCode && (
            <div className="glass-panel mt-2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Generated Playwright Test Script
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-white/20 dark:hover:bg-white/10">
                  <FiCopy size={12} />
                  Copy
                </button>
              </div>
              <pre className="max-h-64 overflow-auto rounded bg-gray-50/50 p-2 text-xs backdrop-blur-sm dark:bg-black/30">
                <code className="text-gray-800 dark:text-gray-300">{testCase.playwrightCode}</code>
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {testCase.lastRunAt ? `Last run: ${new Date(testCase.lastRunAt).toLocaleString()}` : 'Not run yet'}
          {testCase.executionTime && ` (${(testCase.executionTime / 1000).toFixed(1)}s)`}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={testCase.status === 'running'}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            testCase.status === 'running' ? 'cursor-not-allowed opacity-50' : 'glass-button'
          }`}>
          <FiPlay size={14} />
          Run
        </button>
      </div>
      {testCase.errorMessage && (
        <div className="mt-2 rounded bg-red-50/80 p-2 text-xs text-red-600 backdrop-blur-sm dark:bg-red-900/30 dark:text-red-400">
          {testCase.errorMessage}
        </div>
      )}
    </div>
  );
}

interface ReportTabProps {
  projectId: string;
  testSuites: TestSuite[];
  onRunSuite: (suiteId: string) => Promise<void>;
}

function ReportTab({ projectId, testSuites, onRunSuite }: ReportTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>('dashboard');
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden rounded-xl">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Test Report</h2>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-white/10 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {/* Dashboard Tab */}
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard')}
            className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeSubTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
            }`}>
            <FiBarChart2 size={16} />
            Dashboard
          </button>

          {/* Test Suite Tabs */}
          {testSuites.map(suite => {
            const suiteCases = allTestCases.filter(c => c.testSuiteId === suite.id);
            const isActive = activeSubTab === suite.id;
            return (
              <button
                key={suite.id}
                type="button"
                onClick={() => setActiveSubTab(suite.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
                }`}>
                {suite.name}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                  }`}>
                  {suiteCases.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSubTab === 'dashboard' ? (
          /* Dashboard View */
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Overall Statistics</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatBox label="Total" value={overallStats.total} color="blue" />
              <StatBox label="Passed" value={overallStats.passed} color="green" />
              <StatBox label="Failed" value={overallStats.failed} color="red" />
              <StatBox label="Pending" value={overallStats.pending} color="gray" />
            </div>

            <div className="mt-8">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Test Suites Summary</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {testSuites.map(suite => {
                  const suiteCases = allTestCases.filter(c => c.testSuiteId === suite.id);
                  const passed = suiteCases.filter(c => c.status === 'pass').length;
                  const failed = suiteCases.filter(c => c.status === 'fail').length;
                  const pending = suiteCases.filter(c => c.status === 'pending').length;
                  const total = suiteCases.length;
                  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

                  return (
                    <div
                      key={suite.id}
                      onClick={() => setActiveSubTab(suite.id)}
                      className="glass-card cursor-pointer rounded-lg p-4 transition-all hover:scale-[1.02]">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{suite.name}</h4>
                        <span
                          className={`rounded px-2 py-1 text-xs font-bold ${
                            passRate === 100
                              ? 'bg-green-100 text-green-700'
                              : passRate >= 80
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {passRate}% Pass
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Passed:</span>
                          <span className="font-medium text-green-600">{passed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                          <span className="font-medium text-red-600">{failed}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pending:</span>
                          <span className="font-medium text-gray-500">{pending}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Suite Report View */
          (() => {
            const selectedSuite = testSuites.find(s => s.id === activeSubTab);
            const selectedSuiteCases = selectedSuite ? allTestCases.filter(c => c.testSuiteId === activeSubTab) : [];
            const suiteStats = selectedSuite
              ? {
                  total: selectedSuiteCases.length,
                  passed: selectedSuiteCases.filter(c => c.status === 'pass').length,
                  failed: selectedSuiteCases.filter(c => c.status === 'fail').length,
                  pending: selectedSuiteCases.filter(c => c.status === 'pending').length,
                }
              : { total: 0, passed: 0, failed: 0, pending: 0 };

            return selectedSuite ? (
              <SuiteReport
                suite={selectedSuite}
                testCases={selectedSuiteCases}
                stats={suiteStats}
                onRunSuite={() => onRunSuite(selectedSuite.id)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                <p>Suite not found</p>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'gray';
}

function StatBox({ label, value, color }: StatBoxProps) {
  const colorClasses = {
    blue: 'glass-card bg-blue-500/10 border-blue-200/30 dark:border-blue-700/30',
    green: 'glass-card bg-green-500/10 border-green-200/30 dark:border-green-700/30',
    red: 'glass-card bg-red-500/10 border-red-200/30 dark:border-red-700/30',
    gray: 'glass-card bg-gray-500/10 border-gray-200/30 dark:border-gray-700/30',
  };

  return (
    <div className={`rounded-xl p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

interface SuiteReportProps {
  suite: TestSuite;
  testCases: TestCase[];
  stats: { total: number; passed: number; failed: number; pending: number };
  onRunSuite: () => void;
}

function SuiteReport({ suite, testCases, stats, onRunSuite }: SuiteReportProps) {
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [activeReport, setActiveReport] = useState<'playwright' | 'allure' | null>(null);
  const [viewingSteps, setViewingSteps] = useState<string | null>(null); // prompt content

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

  if (activeReport) {
    const reportUrl =
      activeReport === 'playwright'
        ? `/reports/playwright/${suite.id}/index.html`
        : `/reports/allure/${suite.id}/index.html`;

    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {activeReport === 'playwright' ? 'Playwright Report' : 'Allure Report'} - {suite.name}
          </h3>
          <button
            type="button"
            onClick={() => setActiveReport(null)}
            className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600">
            <FiArrowLeft size={16} />
            Back to Summary
          </button>
        </div>
        <div className="flex-1 overflow-hidden rounded-lg border bg-white">
          <iframe src={reportUrl} className="size-full border-0" title={`${activeReport} Report`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Suite Header & KPIs */}
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{suite.name}</h3>
            {suite.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{suite.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              id={`run-suite-${suite.id}`}
              type="button"
              onClick={onRunSuite}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <FiPlay size={16} />
              Run Suite
            </button>
            <button
              type="button"
              onClick={() => setActiveReport('playwright')}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700">
              <FiFileText size={16} />
              Playwright Report
            </button>
            <button
              type="button"
              onClick={() => setActiveReport('allure')}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-orange-400 dark:hover:bg-slate-700">
              <FiBarChart2 size={16} />
              Allure Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="glass-card rounded-xl p-4">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
          <div className="glass-card rounded-xl border-green-200/30 bg-green-500/10 p-4 dark:border-green-700/30">
            <div className="text-sm font-medium text-green-600 dark:text-green-400">Passed</div>
            <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{stats.passed}</div>
            <div className="mt-1 text-xs text-green-600 dark:text-green-400">{passedPercentage}%</div>
          </div>
          <div className="glass-card rounded-xl border-red-200/30 bg-red-500/10 p-4 dark:border-red-700/30">
            <div className="text-sm font-medium text-red-600 dark:text-red-400">Failed</div>
            <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">{failedPercentage}%</div>
          </div>
          <div className="glass-card rounded-xl border-gray-200/30 bg-gray-500/10 p-4 dark:border-gray-700/30">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</div>
            <div className="mt-1 text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.pending}</div>
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{pendingPercentage}%</div>
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white">Test Cases</h4>
        {testCases.length === 0 ? (
          <div className="glass-card rounded-xl border border-gray-200/30 p-8 text-center dark:border-white/10">
            <p className="text-gray-500 dark:text-gray-400">No test cases in this suite</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-xl border border-gray-200/30 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50/50 text-xs uppercase text-gray-700 dark:bg-white/5 dark:text-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Description</th>
                    <th className="px-6 py-3 font-semibold">Code</th>
                    <th className="px-6 py-3 font-semibold">Automation Prompt</th>
                    <th className="px-6 py-3 font-semibold">Environment</th>
                    <th className="px-6 py-3 font-semibold">Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/30 dark:divide-white/10">
                  {testCases.map(testCase => {
                    const isExpanded = expandedCases.has(testCase.id);
                    return (
                      <React.Fragment key={testCase.id}>
                        <tr className="bg-transparent transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900 dark:text-white">{testCase.name}</span>
                                {testCase.status && (
                                  <span
                                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                      testCase.status === 'pass'
                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                        : testCase.status === 'fail'
                                          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                          : testCase.status === 'running'
                                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                            : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                    }`}>
                                    {testCase.status}
                                  </span>
                                )}
                              </div>
                              {testCase.errorMessage && (
                                <span className="text-xs text-red-500">{testCase.errorMessage}</span>
                              )}
                            </div>
                          </td>
                          <td className="max-w-xs truncate px-6 py-4" title={testCase.description}>
                            {testCase.description || '-'}
                          </td>
                          <td className="px-6 py-4">
                            {testCase.playwrightCode ? (
                              <button
                                type="button"
                                onClick={() => toggleCase(testCase.id)}
                                className="glass-button flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400">
                                {isExpanded ? 'Hide' : 'View'}
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {testCase.prompt ? (
                              <button
                                type="button"
                                onClick={() => setViewingSteps(testCase.prompt)}
                                className="glass-button flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400">
                                View Steps <FiEye size={12} />
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">{testCase.baseUrl || '-'}</td>
                          <td className="px-6 py-4">
                            {testCase.testType ? (
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                                {testCase.testType}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                        {isExpanded && testCase.playwrightCode && (
                          <tr className="bg-gray-50/50 dark:bg-white/5">
                            <td colSpan={6} className="p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Playwright Code
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCopyCode(testCase.playwrightCode!)}
                                    className="text-xs text-blue-500 hover:underline">
                                    Copy
                                  </button>
                                  <button
                                    onClick={() => handleDownloadCode(testCase.playwrightCode!, testCase.name)}
                                    className="text-xs text-blue-500 hover:underline">
                                    Download
                                  </button>
                                </div>
                              </div>
                              <div className="rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
                                <pre className="whitespace-pre-wrap">{testCase.playwrightCode}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {viewingSteps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation Steps</h3>
              <button
                type="button"
                onClick={() => setViewingSteps(null)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="rounded-xl border border-gray-200/50 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-white/5">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
                  {viewingSteps}
                </pre>
              </div>
            </div>
            <div className="flex justify-end border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setViewingSteps(null)}
                className="glass-button rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateSuiteModalProps {
  formData: { name: string; description: string; testType: string };
  setFormData: (data: { name: string; description: string; testType: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  editingSuite: TestSuite | null;
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
  const [allCandidates, setAllCandidates] = useState<TestCase[]>([]);

  // Load available test cases when modal opens
  useEffect(() => {
    const loadTestCases = async () => {
      const [allCases, projectSuites] = await Promise.all([
        testSuiteStorage.getTestCases(),
        testSuiteStorage.getTestSuitesByProject(projectId),
      ]);
      const suiteIds = new Set(projectSuites.map(s => s.id));
      const projectCases = Array.isArray(allCases)
        ? allCases.filter(tc => (tc.testSuiteId && suiteIds.has(tc.testSuiteId as string)) || !tc.testSuiteId)
        : [];

      if (editingSuite) {
        // For editing, separate tests in suite from available tests
        const suiteCases = projectCases.filter(tc => tc.testSuiteId === editingSuite.id);
        const available = projectCases.filter(tc => tc.testSuiteId !== editingSuite.id || !tc.testSuiteId);
        setTestsInSuite(suiteCases);
        setAllCandidates(available);
        setSelectedTestCasesForSuite(new Set(suiteCases.map(tc => tc.id)));
      } else {
        // For creating, all tests are available
        setTestsInSuite([]);
        setAllCandidates(projectCases);
        setSelectedTestCasesForSuite(new Set());
      }
    };
    loadTestCases();
  }, [projectId, editingSuite]);

  // Filter available test cases when test type or candidates change
  useEffect(() => {
    let filtered = allCandidates;
    if (formData.testType === 'UI Tests') {
      filtered = allCandidates.filter(tc => getTestType(tc) === 'ui');
    } else if (formData.testType === 'API Tests') {
      filtered = allCandidates.filter(tc => getTestType(tc) === 'api');
    }
    setAvailableTestCases(filtered);
  }, [allCandidates, formData.testType]);

  const handleMoveToSuite = () => {
    const testsToMove = availableTestCases.filter(tc => selectedAvailableTests.has(tc.id));
    setTestsInSuite([...testsInSuite, ...testsToMove]);
    // Remove from allCandidates (which triggers filter update)
    const testsToMoveIds = new Set(testsToMove.map(tc => tc.id));
    setAllCandidates(allCandidates.filter(tc => !testsToMoveIds.has(tc.id)));

    setSelectedTestCasesForSuite(new Set([...selectedTestCasesForSuite, ...testsToMove.map(tc => tc.id)]));
    setSelectedAvailableTests(new Set());
  };

  const handleMoveAllToSuite = () => {
    // Move all CURRENTLY VISIBLE available tests
    const testsToMove = availableTestCases;
    setTestsInSuite([...testsInSuite, ...testsToMove]);

    const testsToMoveIds = new Set(testsToMove.map(tc => tc.id));
    setAllCandidates(allCandidates.filter(tc => !testsToMoveIds.has(tc.id)));

    setSelectedTestCasesForSuite(new Set([...selectedTestCasesForSuite, ...testsToMove.map(tc => tc.id)]));
    setSelectedAvailableTests(new Set());
  };

  const handleMoveFromSuite = () => {
    const testsToMove = testsInSuite.filter(tc => selectedInSuiteTests.has(tc.id));
    // Add back to allCandidates
    setAllCandidates([...allCandidates, ...testsToMove]);

    setTestsInSuite(testsInSuite.filter(tc => !selectedInSuiteTests.has(tc.id)));
    const newSelected = new Set(selectedTestCasesForSuite);
    testsToMove.forEach(tc => newSelected.delete(tc.id));
    setSelectedTestCasesForSuite(newSelected);
    setSelectedInSuiteTests(new Set());
  };

  const handleMoveAllFromSuite = () => {
    // Move all from suite back to candidates
    setAllCandidates([...allCandidates, ...testsInSuite]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-5xl rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              <FiFolder size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingSuite ? 'Edit Test Suite' : 'Create Test Suite'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
            <FiXCircle size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6">
            {/* Basic Information */}
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Test Suite Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                  placeholder="Enter test suite name"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                  placeholder="Enter test suite description"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Test Type</label>
                <div className="relative">
                  <select
                    value={formData.testType || 'UI Tests'}
                    onChange={e => setFormData({ ...formData, testType: e.target.value })}
                    className="glass-input w-full appearance-none rounded-xl px-4 py-3 text-sm text-gray-900 outline-none dark:text-white">
                    <option value="UI Tests" className="dark:bg-slate-800">
                      UI Tests
                    </option>
                    <option value="API Tests" className="dark:bg-slate-800">
                      API Tests
                    </option>
                    <option value="Integration Tests" className="dark:bg-slate-800">
                      Integration Tests
                    </option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <FiChevronDown size={16} />
                  </div>
                </div>
              </div>
            </div>

            {/* Test Selection Panels */}
            <div className="mb-6 flex gap-4">
              {/* Left Panel - Tests in Suite */}
              <div className="glass-card flex-1 overflow-hidden rounded-xl border-0">
                <div className="bg-gray-50/50 px-4 py-3 dark:bg-white/5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Tests in Suite ({testsInSuite.length})
                  </h3>
                </div>
                <div className="custom-scrollbar max-h-64 overflow-y-auto p-4">
                  {testsInSuite.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FiFile size={48} className="mb-2 text-gray-400 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No tests in suite</p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Select tests from the right panel.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {testsInSuite.map(testCase => (
                        <label
                          key={testCase.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-all ${
                            selectedInSuiteTests.has(testCase.id)
                              ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                          }`}>
                          <input
                            type="checkbox"
                            checked={selectedInSuiteTests.has(testCase.id)}
                            onChange={() => toggleInSuiteTest(testCase.id)}
                            className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{testCase.name}</span>
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
                  className={`rounded-xl border p-2.5 transition-all ${
                    testsInSuite.length === 0
                      ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-50 dark:border-white/10'
                      : 'glass-button border-blue-500/30'
                  }`}
                  title="Move all from suite">
                  <FiChevronLeft size={20} />
                  <FiChevronLeft size={20} className="-ml-3" />
                </button>
                <button
                  type="button"
                  onClick={handleMoveFromSuite}
                  disabled={selectedInSuiteTests.size === 0}
                  className={`rounded-xl border p-2.5 transition-all ${
                    selectedInSuiteTests.size === 0
                      ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-50 dark:border-white/10'
                      : 'glass-button border-blue-500/30'
                  }`}
                  title="Move selected from suite">
                  <FiChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleMoveToSuite}
                  disabled={selectedAvailableTests.size === 0}
                  className={`rounded-xl border p-2.5 transition-all ${
                    selectedAvailableTests.size === 0
                      ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-50 dark:border-white/10'
                      : 'glass-button border-blue-500/30'
                  }`}
                  title="Move selected to suite">
                  <FiChevronRight size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleMoveAllToSuite}
                  disabled={availableTestCases.length === 0}
                  className={`rounded-xl border p-2.5 transition-all ${
                    availableTestCases.length === 0
                      ? 'cursor-not-allowed border-gray-200 text-gray-400 opacity-50 dark:border-white/10'
                      : 'glass-button border-blue-500/30'
                  }`}
                  title="Move all to suite">
                  <FiChevronRight size={20} />
                  <FiChevronRight size={20} className="-ml-3" />
                </button>
              </div>

              {/* Right Panel - Available Tests */}
              <div className="glass-card flex-1 overflow-hidden rounded-xl border-0">
                <div className="bg-gray-50/50 px-4 py-3 dark:bg-white/5">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Available Tests ({availableTestCases.length})
                  </h3>
                </div>
                <div className="custom-scrollbar max-h-64 overflow-y-auto p-4">
                  {availableTestCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FiFile size={48} className="mb-2 text-gray-400 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No available tests</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableTestCases.map(testCase => (
                        <label
                          key={testCase.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-all ${
                            selectedAvailableTests.has(testCase.id)
                              ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                          }`}>
                          <input
                            type="checkbox"
                            checked={selectedAvailableTests.has(testCase.id)}
                            onChange={() => toggleAvailableTest(testCase.id)}
                            className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-700"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{testCase.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Suite Summary */}
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-semibold">Suite Summary:</span> {testsInSuite.length} test(s) configured •{' '}
                {availableTestCases.length} test(s) available to add.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-2.5 font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
              <FiCheckCircle size={18} />
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
}

function CreateCaseModal({ formData, setFormData, onSubmit, onClose, editingTestCase }: CreateCaseModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-4xl rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              <FiFileText size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingTestCase ? 'Edit Test Case' : 'Create Test Case'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10">
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="p-6">
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Test Case Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                placeholder="Enter test case name"
              />
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                placeholder="Enter description"
              />
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Automation Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.prompt}
                onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                rows={4}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                placeholder="Enter the automation prompt for this test case"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Note: Planner description will appear here after the test case is executed with the planner agent.
              </p>
            </div>

            {/* Playwright Code Section - Only show when editing */}
            {editingTestCase && (
              <div className="glass-card mb-6 rounded-xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Playwright Code</label>
                  <div className="flex items-center gap-2">
                    {!isEditingCode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingCode(true)}
                          className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400/20">
                          <FiEdit2 size={12} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="flex items-center gap-1 rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">
                          <FiCopy size={12} />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCode}
                          className="flex items-center gap-1 rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">
                          <FiDownload size={12} />
                          Download
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingCode(false)}
                          className="glass-button rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="glass-input relative overflow-hidden rounded-lg p-0">
                  {/* Line Numbers */}
                  {formData.playwrightCode && (
                    <div
                      ref={lineNumbersRef}
                      className="absolute left-0 top-0 h-full overflow-hidden border-r border-gray-200/50 bg-black/5 pr-2 text-right font-mono text-xs text-gray-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-500"
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
                    className={`w-full bg-transparent p-3 font-mono text-sm ${
                      isEditingCode ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-200'
                    } ${formData.playwrightCode ? 'pl-12' : ''} outline-none`}
                    placeholder="Playwright code will appear here after test execution"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Note: Edit the Playwright code directly. Changes will be saved when you update the test case.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-2.5 font-medium text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10">
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
              <FiCheckCircle size={18} />
              {editingTestCase ? 'Update Test Case' : 'Create Test Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
