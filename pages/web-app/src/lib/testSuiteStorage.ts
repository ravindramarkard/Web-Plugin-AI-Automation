/**
 * Server-side test suite storage using API
 */

import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete } from './apiConfig.js';
import { apiCache } from './apiCache.js';

export interface TestCase {
  id: string;
  testSuiteId: string | null;
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
  testCases: string[]; // Array of test case IDs - computed from test cases
  schedule?: TestSuiteSchedule;
  createdAt: number;
  updatedAt: number;
}

class TestSuiteStorage {
  // Test Suites
  async getTestSuitesByProject(projectId: string): Promise<TestSuite[]> {
    try {
      const suites = await apiGet<any[]>(`${API_ENDPOINTS.testSuites}/project/${projectId}`);
      // Parse schedule JSON and compute testCases array
      const suitesWithCounts = await Promise.all(
        suites.map(async suite => {
          // Fetch count or ids of test cases for this suite
          // We can use getTestCasesBySuite but it might be heavy if we just need count
          // For now let's just fetch them to be safe and accurate
          const cases = await this.getTestCasesBySuite(suite.id);
          return {
            ...suite,
            schedule: suite.schedule ? JSON.parse(suite.schedule) : undefined,
            testCases: cases.map(c => c.id), // Populate with actual IDs
          };
        }),
      );

      return suitesWithCounts;
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test suites:', error);
      return [];
    }
  }

  async getTestSuite(id: string): Promise<TestSuite | null> {
    try {
      const suite = await apiGet<any>(`${API_ENDPOINTS.testSuites}/${id}`);
      if (!suite) return null;

      // Get test cases for this suite to populate testCases array
      const testCases = await this.getTestCasesBySuite(id);

      return {
        ...suite,
        schedule: suite.schedule ? JSON.parse(suite.schedule) : undefined,
        testCases: testCases.map(tc => tc.id),
      };
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test suite:', error);
      return null;
    }
  }

  async createTestSuite(
    testSuite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt' | 'testCases'>,
  ): Promise<TestSuite> {
    try {
      const suite = await apiPost<any>(
        API_ENDPOINTS.testSuites,
        {
          ...testSuite,
          schedule: testSuite.schedule ? JSON.stringify(testSuite.schedule) : undefined,
        },
        API_ENDPOINTS.testSuites,
      );
      return {
        ...suite,
        schedule: suite.schedule ? JSON.parse(suite.schedule) : undefined,
        testCases: [],
      };
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to create test suite:', error);
      throw error;
    }
  }

  async updateTestSuite(id: string, updates: Partial<Omit<TestSuite, 'id' | 'createdAt'>>): Promise<TestSuite | null> {
    try {
      const suite = await apiPut<any>(
        `${API_ENDPOINTS.testSuites}/${id}`,
        {
          ...updates,
          schedule: updates.schedule ? JSON.stringify(updates.schedule) : undefined,
        },
        API_ENDPOINTS.testSuites,
      );
      if (!suite) return null;

      // Get test cases to populate testCases array
      const testCases = await this.getTestCasesBySuite(id);

      return {
        ...suite,
        schedule: suite.schedule ? JSON.parse(suite.schedule) : undefined,
        testCases: testCases.map(tc => tc.id),
      };
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to update test suite:', error);
      return null;
    }
  }

  async deleteTestSuite(id: string): Promise<boolean> {
    try {
      await apiDelete<{ success: boolean }>(`${API_ENDPOINTS.testSuites}/${id}`, API_ENDPOINTS.testSuites);
      return true;
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to delete test suite:', error);
      return false;
    }
  }

  // Test Cases
  async getTestCases(): Promise<TestCase[]> {
    try {
      return await apiGet<TestCase[]>(API_ENDPOINTS.testCases);
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test cases:', error);
      return [];
    }
  }

  async getTestCasesBySuite(testSuiteId: string): Promise<TestCase[]> {
    try {
      const cases = await apiGet<TestCase[]>(`${API_ENDPOINTS.testCases}/suite/${testSuiteId}`);
      console.log('[TestSuiteStorage] Getting test cases for suite:', testSuiteId);
      console.log('[TestSuiteStorage] Total cases:', cases.length);
      return cases;
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test cases by suite:', error);
      return [];
    }
  }

  async getTestCase(id: string): Promise<TestCase | null> {
    try {
      return await apiGet<TestCase>(`${API_ENDPOINTS.testCases}/${id}`);
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to get test case:', error);
      return null;
    }
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

    try {
      const newCase = await apiPost<TestCase>(
        API_ENDPOINTS.testCases,
        {
          ...testCase,
          status: testCase.status || 'pending',
        },
        API_ENDPOINTS.testCases,
      );

      console.log('[TestSuiteStorage] Created test case with ID:', newCase.id);
      console.log(
        '[TestSuiteStorage] Test case playwrightCode after creation:',
        !!newCase.playwrightCode,
        newCase.playwrightCode?.substring(0, 100) || 'none',
      );

      // Note: testCases array in suite is computed, no need to update it manually
      return newCase;
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to create test case:', error);
      throw error;
    }
  }

  async updateTestCase(id: string, updates: Partial<Omit<TestCase, 'id' | 'createdAt'>>): Promise<TestCase | null> {
    console.log('[TestSuiteStorage] ========== Updating test case ==========');
    console.log('[TestSuiteStorage] Test case ID:', id);
    console.log('[TestSuiteStorage] Updates:', {
      ...updates,
      playwrightCodeLength: updates.playwrightCode?.length,
      hasPlaywrightCode: !!updates.playwrightCode,
    });

    try {
      const updated = await apiPut<TestCase>(`${API_ENDPOINTS.testCases}/${id}`, updates, API_ENDPOINTS.testCases);
      console.log('[TestSuiteStorage] Test case after update:', {
        id: updated.id,
        hasPlaywrightCode: !!updated.playwrightCode,
        playwrightCodeLength: updated.playwrightCode?.length,
      });
      return updated;
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to update test case:', error);
      return null;
    }
  }

  async deleteTestCase(id: string): Promise<boolean> {
    try {
      await apiDelete<{ success: boolean }>(`${API_ENDPOINTS.testCases}/${id}`, API_ENDPOINTS.testCases);
      return true;
    } catch (error) {
      console.error('[TestSuiteStorage] Failed to delete test case:', error);
      return false;
    }
  }
}

export const testSuiteStorage = new TestSuiteStorage();
