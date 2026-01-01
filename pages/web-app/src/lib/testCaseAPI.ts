/**
 * Test Case API
 * Provides programmatic access to test cases and their Playwright code
 */

import { testSuiteStorage, type TestCase } from './testSuiteStorage';

/**
 * Get all test cases with Playwright code
 */
export async function getAllTestCasesWithCode(): Promise<TestCase[]> {
  const allCases = testSuiteStorage.getTestCases();
  return allCases.filter(tc => tc.playwrightCode && tc.playwrightCode.length > 0);
}

/**
 * Get a specific test case by ID with Playwright code
 */
export async function getTestCaseWithCode(testCaseId: string): Promise<TestCase | null> {
  const testCase = await testSuiteStorage.getTestCase(testCaseId);
  if (testCase && testCase.playwrightCode) {
    return testCase;
  }
  return null;
}

/**
 * Get all test cases for a project with Playwright code
 */
export async function getProjectTestCasesWithCode(projectId: string): Promise<TestCase[]> {
  const suites = await testSuiteStorage.getTestSuitesByProject(projectId);
  const allCases = testSuiteStorage.getTestCases();
  const projectSuiteIds = new Set(suites.map(s => s.id));
  const projectCases = allCases.filter(tc => projectSuiteIds.has(tc.testSuiteId));
  return projectCases.filter(tc => tc.playwrightCode && tc.playwrightCode.length > 0);
}

/**
 * Get Playwright code for a specific test case
 */
export async function getPlaywrightCode(testCaseId: string): Promise<string | null> {
  const testCase = await testSuiteStorage.getTestCase(testCaseId);
  return testCase?.playwrightCode || null;
}

/**
 * Export test case as JSON (for API-like access)
 */
export async function exportTestCase(testCaseId: string): Promise<{
  id: string;
  name: string;
  description: string;
  prompt: string;
  playwrightCode: string;
  baseUrl?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
} | null> {
  const testCase = await testSuiteStorage.getTestCase(testCaseId);
  if (!testCase || !testCase.playwrightCode) {
    return null;
  }

  return {
    id: testCase.id,
    name: testCase.name,
    description: testCase.description,
    prompt: testCase.prompt,
    playwrightCode: testCase.playwrightCode,
    baseUrl: testCase.baseUrl,
    status: testCase.status,
    createdAt: testCase.createdAt,
    updatedAt: testCase.updatedAt,
  };
}

/**
 * Export all test cases with Playwright code as JSON
 */
export async function exportAllTestCasesWithCode(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    prompt: string;
    playwrightCode: string;
    baseUrl?: string;
    status: string;
    createdAt: number;
    updatedAt: number;
  }>
> {
  const testCases = await getAllTestCasesWithCode();
  return testCases.map(tc => ({
    id: tc.id,
    name: tc.name,
    description: tc.description,
    prompt: tc.prompt,
    playwrightCode: tc.playwrightCode!,
    baseUrl: tc.baseUrl,
    status: tc.status,
    createdAt: tc.createdAt,
    updatedAt: tc.updatedAt,
  }));
}

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).testCaseAPI = {
    getAllTestCasesWithCode,
    getTestCaseWithCode,
    getProjectTestCasesWithCode,
    getPlaywrightCode,
    exportTestCase,
    exportAllTestCasesWithCode,
  };

  console.log('✅ Test Case API available at window.testCaseAPI');
  console.log('Available methods:');
  console.log('  - window.testCaseAPI.getAllTestCasesWithCode()');
  console.log('  - window.testCaseAPI.getTestCaseWithCode(testCaseId)');
  console.log('  - window.testCaseAPI.getProjectTestCasesWithCode(projectId)');
  console.log('  - window.testCaseAPI.getPlaywrightCode(testCaseId)');
  console.log('  - window.testCaseAPI.exportTestCase(testCaseId)');
  console.log('  - window.testCaseAPI.exportAllTestCasesWithCode()');
}
