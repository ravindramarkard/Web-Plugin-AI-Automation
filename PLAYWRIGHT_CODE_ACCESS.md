# How to Access Playwright Code

The Playwright code is stored in localStorage and can be accessed in several ways:

## 1. Via Browser Console (Easiest)

Open the browser console (F12) and use the Test Case API:

```javascript
// Get all test cases with Playwright code
const allCases = await window.testCaseAPI.getAllTestCasesWithCode();
console.log(allCases);

// Get a specific test case by ID
const testCase = await window.testCaseAPI.getTestCaseWithCode('case_1234567890_abc123');
console.log(testCase);

// Get Playwright code for a specific test case
const code = await window.testCaseAPI.getPlaywrightCode('case_1234567890_abc123');
console.log(code);

// Export test case as JSON
const exported = await window.testCaseAPI.exportTestCase('case_1234567890_abc123');
console.log(exported);

// Export all test cases with code
const allExported = await window.testCaseAPI.exportAllTestCasesWithCode();
console.log(allExported);
```

## 2. Via UI

1. Navigate to **Projects** → Select a project
2. Go to **Test Suite** tab
3. Click **"ALL TESTS"** → **"UI TESTS"**
4. Find your test case in the table
5. Click the **Code icon** (purple icon) to view the Playwright code in a modal
6. Click **"Copy"** button to copy the code to clipboard

## 3. Via Direct localStorage Access

```javascript
// Get all test cases from localStorage
const stored = localStorage.getItem('web_app_test_cases');
const testCases = JSON.parse(stored || '[]');

// Filter for test cases with Playwright code
const withCode = testCases.filter(tc => tc.playwrightCode);

// Get a specific test case
const testCase = testCases.find(tc => tc.id === 'case_1234567890_abc123');
console.log(testCase?.playwrightCode);
```

## 4. Via Programmatic Import

In your code:

```typescript
import { 
  getPlaywrightCode, 
  getTestCaseWithCode,
  getAllTestCasesWithCode 
} from './lib/testCaseAPI';

// Get Playwright code
const code = await getPlaywrightCode('case_1234567890_abc123');

// Get full test case
const testCase = await getTestCaseWithCode('case_1234567890_abc123');

// Get all test cases with code
const allCases = await getAllTestCasesWithCode();
```

## Storage Location

- **Storage Key**: `web_app_test_cases`
- **Storage Type**: localStorage
- **Format**: JSON array of TestCase objects
- **Field**: `playwrightCode` (string containing TypeScript Playwright code)

## Test Case Structure

```typescript
interface TestCase {
  id: string;
  testSuiteId: string;
  name: string;
  description: string;
  prompt: string;
  playwrightCode?: string;  // <-- Playwright TypeScript code here
  baseUrl?: string;
  status: 'pass' | 'fail' | 'pending' | 'running';
  createdAt: number;
  updatedAt: number;
  lastRunAt?: number;
  executionTime?: number;
  errorMessage?: string;
}
```

