/**
 * Web-compatible test suite storage using localStorage
 */

export interface TestCase {
  id: string;
  testSuiteId: string;
  name: string;
  description: string;
  prompt: string; // The original automation prompt for this test case
  plannerDescription?: string; // The planner's description/steps (next_steps from planner)
  status: 'pass' | 'fail' | 'pending' | 'running';
  testType?: 'UI Test' | 'API Test' | 'Integration Test'; // Type of test
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  executionTime?: number;
  errorMessage?: string;
  playwrightCode?: string; // Generated Playwright test script
  baseUrl?: string; // Base URL for the test
}

export interface TestSuiteSchedule {
  cronExpression: string;
  environment: string;
  enabled: boolean;
  headless: boolean;
  workers: number; // 1-10
  createdAt: number;
  updatedAt: number;
}

export interface TestSuite {
  id: string;
  projectId: string;
  name: string;
  description: string;
  testType?: 'UI Tests' | 'API Tests' | 'Integration Tests'; // Type of test suite
  testCases: string[]; // Array of test case IDs
  schedule?: TestSuiteSchedule;
  createdAt: number;
  updatedAt: number;
}

const TEST_SUITES_KEY = 'web_app_test_suites';
const TEST_CASES_KEY = 'web_app_test_cases';

class TestSuiteStorage {
  // Test Suites
  private getTestSuites(): TestSuite[] {
    try {
      const stored = localStorage.getItem(TEST_SUITES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test suites:', error);
      return [];
    }
  }

  private saveTestSuites(testSuites: TestSuite[]): void {
    try {
      localStorage.setItem(TEST_SUITES_KEY, JSON.stringify(testSuites));
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to save test suites:', error);
    }
  }

  async getTestSuitesByProject(projectId: string): Promise<TestSuite[]> {
    const suites = this.getTestSuites();
    return suites.filter(s => s.projectId === projectId);
  }

  async getTestSuite(id: string): Promise<TestSuite | null> {
    const suites = this.getTestSuites();
    return suites.find(s => s.id === id) || null;
  }

  async createTestSuite(
    testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt' | 'testCases'>,
  ): Promise<TestSuite> {
    const suites = this.getTestSuites();
    const newSuite: TestSuite = {
      ...testSuite,
      id: `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      testCases: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    suites.push(newSuite);
    this.saveTestSuites(suites);
    return newSuite;
  }

  async updateTestSuite(id: string, updates: Partial<Omit<TestSuite, 'id' | 'createdAt'>>): Promise<TestSuite | null> {
    const suites = this.getTestSuites();
    const index = suites.findIndex(s => s.id === id);
    if (index === -1) return null;

    suites[index] = {
      ...suites[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveTestSuites(suites);
    return suites[index];
  }

  async deleteTestSuite(id: string): Promise<boolean> {
    const suites = this.getTestSuites();
    const filtered = suites.filter(s => s.id !== id);
    if (filtered.length === suites.length) return false;
    this.saveTestSuites(filtered);
    return true;
  }

  // Test Cases
  getTestCases(): TestCase[] {
    try {
      const stored = localStorage.getItem(TEST_CASES_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test cases:', error);
      return [];
    }
  }

  private getTestCasesPrivate(): TestCase[] {
    return this.getTestCases();
  }

  private saveTestCases(testCases: TestCase[]): void {
    try {
      localStorage.setItem(TEST_CASES_KEY, JSON.stringify(testCases));
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to save test cases:', error);
    }
  }

  async getTestCasesBySuite(testSuiteId: string): Promise<TestCase[]> {
    const cases = this.getTestCasesPrivate();
    console.log('[TestSuiteStorage] Getting test cases for suite:', testSuiteId);
    console.log('[TestSuiteStorage] Total cases in storage:', cases.length);
    const filtered = cases.filter(c => c.testSuiteId === testSuiteId);
    console.log('[TestSuiteStorage] Filtered cases for suite:', filtered.length);
    filtered.forEach((tc, idx) => {
      console.log(`[TestSuiteStorage] Case ${idx + 1}:`, {
        id: tc.id,
        name: tc.name,
        testSuiteId: tc.testSuiteId,
        hasPlaywrightCode: !!tc.playwrightCode,
      });
    });
    return filtered;
  }

  async getTestCase(id: string): Promise<TestCase | null> {
    const cases = this.getTestCases();
    return cases.find(c => c.id === id) || null;
  }

  async createTestCase(
    testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: TestCase['status'] },
  ): Promise<TestCase> {
    console.log('[TestSuiteStorage] ========== Creating test case ==========');
    console.log('[TestSuiteStorage] Test suite ID:', testCase.testSuiteId);
    console.log('[TestSuiteStorage] Test case name:', testCase.name);
    console.log('[TestSuiteStorage] Has playwrightCode:', !!testCase.playwrightCode);
    console.log('[TestSuiteStorage] PlaywrightCode length:', testCase.playwrightCode?.length || 0);
    console.log('[TestSuiteStorage] Status:', testCase.status);

    const cases = this.getTestCasesPrivate();
    const newCase: TestCase = {
      ...testCase,
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: testCase.status || 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    console.log('[TestSuiteStorage] Created test case with ID:', newCase.id);
    console.log(
      '[TestSuiteStorage] Test case playwrightCode after creation:',
      !!newCase.playwrightCode,
      newCase.playwrightCode?.substring(0, 100) || 'none',
    );
    cases.push(newCase);
    this.saveTestCases(cases);
    console.log('[TestSuiteStorage] Test case saved to storage, total cases:', cases.length);

    // Verify it was saved correctly
    const saved = this.getTestCases().find(c => c.id === newCase.id);
    console.log('[TestSuiteStorage] Verification - saved test case:', {
      id: saved?.id,
      name: saved?.name,
      hasPlaywrightCode: !!saved?.playwrightCode,
      playwrightCodeLength: saved?.playwrightCode?.length,
      status: saved?.status,
    });

    // Add to test suite
    const suite = await this.getTestSuite(testCase.testSuiteId);
    if (suite) {
      console.log('[TestSuiteStorage] Found test suite, adding test case to suite');
      suite.testCases.push(newCase.id);
      await this.updateTestSuite(testCase.testSuiteId, { testCases: suite.testCases });
      console.log('[TestSuiteStorage] Test case added to suite, suite now has', suite.testCases.length, 'cases');
    } else {
      console.error('[TestSuiteStorage] ❌ Test suite not found:', testCase.testSuiteId);
    }

    return newCase;
  }

  async updateTestCase(id: string, updates: Partial<Omit<TestCase, 'id' | 'createdAt'>>): Promise<TestCase | null> {
    console.log('[TestSuiteStorage] ========== Updating test case ==========');
    console.log('[TestSuiteStorage] Test case ID:', id);
    console.log('[TestSuiteStorage] Updates:', {
      ...updates,
      playwrightCodeLength: updates.playwrightCode?.length,
      hasPlaywrightCode: !!updates.playwrightCode,
    });

    const cases = this.getTestCases();
    const index = cases.findIndex(c => c.id === id);
    if (index === -1) {
      console.error('[TestSuiteStorage] ❌ Test case not found:', id);
      return null;
    }

    console.log('[TestSuiteStorage] Test case before update:', {
      id: cases[index].id,
      hasPlaywrightCode: !!cases[index].playwrightCode,
    });

    cases[index] = {
      ...cases[index],
      ...updates,
      updatedAt: Date.now(),
    };

    console.log('[TestSuiteStorage] Test case after update:', {
      id: cases[index].id,
      hasPlaywrightCode: !!cases[index].playwrightCode,
      playwrightCodeLength: cases[index].playwrightCode?.length,
      baseUrl: cases[index].baseUrl,
    });

    this.saveTestCases(cases);

    // Verify it was saved
    const saved = this.getTestCases().find(c => c.id === id);
    console.log('[TestSuiteStorage] Verification - Test case from storage after save:', {
      id: saved?.id,
      hasPlaywrightCode: !!saved?.playwrightCode,
      playwrightCodeLength: saved?.playwrightCode?.length,
    });

    return cases[index];
  }

  async deleteTestCase(id: string): Promise<boolean> {
    const cases = this.getTestCases();
    const testCase = cases.find(c => c.id === id);
    if (!testCase) return false;

    // Remove from test suite
    const suite = await this.getTestSuite(testCase.testSuiteId);
    if (suite) {
      suite.testCases = suite.testCases.filter(tcId => tcId !== id);
      await this.updateTestSuite(testCase.testSuiteId, { testCases: suite.testCases });
    }

    const filtered = cases.filter(c => c.id !== id);
    this.saveTestCases(filtered);
    return true;
  }
}

export const testSuiteStorage = new TestSuiteStorage();
