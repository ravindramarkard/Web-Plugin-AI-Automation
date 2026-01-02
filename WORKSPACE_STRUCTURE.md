# Test Cases and Prompts Workspace File Structure

## Overview
The application uses **localStorage** for client-side storage of test cases, test suites, and prompts. All data is stored in the browser's localStorage with JSON serialization.

## Storage Architecture

### 1. **Test Cases Storage**
**File:** `pages/web-app/src/lib/testSuiteStorage.ts`

**localStorage Key:** `web_app_test_cases`

**Data Structure:**
```typescript
interface TestCase {
  id: string;                          // Format: "case_{timestamp}_{random}"
  testSuiteId: string;                 // Parent test suite ID
  name: string;                        // Test case name
  description: string;                 // Test case description
  prompt: string;                      // Original automation prompt
  plannerDescription?: string;         // Planner's description/steps
  status: 'pass' | 'fail' | 'pending' | 'running';
  testType?: 'UI Test' | 'API Test' | 'Integration Test';
  playwrightCode?: string;            // Generated Playwright test script
  baseUrl?: string;                    // Base URL for the test
  createdAt: number;                   // Timestamp
  updatedAt: number;                  // Timestamp
  lastRunAt?: number;                 // Last execution timestamp
  executionTime?: number;              // Execution time in ms
  errorMessage?: string;               // Error message if failed
}
```

**Storage Methods:**
- `getTestCases()` - Get all test cases
- `getTestCase(id)` - Get single test case by ID
- `getTestCasesBySuite(suiteId)` - Get all test cases for a suite
- `createTestCase(testCase)` - Create new test case
- `updateTestCase(id, updates)` - Update existing test case
- `deleteTestCase(id)` - Delete test case

---

### 2. **Test Suites Storage**
**File:** `pages/web-app/src/lib/testSuiteStorage.ts`

**localStorage Key:** `web_app_test_suites`

**Data Structure:**
```typescript
interface TestSuite {
  id: string;                         // Format: "suite_{timestamp}_{random}"
  projectId: string;                   // Parent project ID
  name: string;                        // Suite name
  description: string;                 // Suite description
  testType?: 'UI Tests' | 'API Tests' | 'Integration Tests';
  testCases: string[];                // Array of test case IDs
  schedule?: TestSuiteSchedule;        // Optional scheduling config
  createdAt: number;                   // Timestamp
  updatedAt: number;                  // Timestamp
}

interface TestSuiteSchedule {
  cronExpression: string;              // Cron expression for scheduling
  environment: string;                 // Environment name
  enabled: boolean;                    // Schedule enabled/disabled
  headless: boolean;                   // Run in headless mode
  workers: number;                     // Number of workers (1-10)
  createdAt: number;                   // Timestamp
  updatedAt: number;                  // Timestamp
}
```

**Storage Methods:**
- `getTestSuitesByProject(projectId)` - Get all suites for a project
- `getTestSuite(id)` - Get single suite by ID
- `createTestSuite(suite)` - Create new test suite
- `updateTestSuite(id, updates)` - Update existing suite
- `deleteTestSuite(id)` - Delete test suite

---

### 3. **Prompts Storage**
**File:** `pages/web-app/src/lib/promptStorage.ts`

**localStorage Key:** `web_app_prompts`

**Data Structure:**
```typescript
interface Prompt {
  id: string;                         // Format: "prompt_{timestamp}_{random}"
  projectId: string;                   // Parent project ID
  title: string;                       // Prompt title
  description: string;                 // Prompt description
  promptContent: string;               // The actual automation prompt
  testType: 'UI Test' | 'API Test' | 'Integration Test' | 'E2E Test';
  tags: string[];                      // Array of tags
  additionalContext?: string;          // Additional context
  baseUrl?: string;                    // Base URL
  additionalInformation?: string;       // Additional information
  createdAt: number;                   // Timestamp
  updatedAt: number;                  // Timestamp
}
```

**Storage Methods:**
- `getPromptsByProject(projectId)` - Get all prompts for a project
- `getPrompt(id)` - Get single prompt by ID
- `createPrompt(prompt)` - Create new prompt
- `updatePrompt(id, updates)` - Update existing prompt
- `deletePrompt(id)` - Delete prompt
- `duplicatePrompt(id, newProjectId?)` - Duplicate a prompt

---

### 4. **Projects Storage**
**File:** `pages/web-app/src/lib/projectStorage.ts`

**localStorage Key:** `web_app_projects`

**Data Structure:**
```typescript
interface Project {
  id: string;                         // Format: "project_{timestamp}_{random}"
  name: string;                        // Project name
  team: string;                        // Team name
  icon: string;                        // Project icon
  createdAt: number;                   // Timestamp
  updatedAt: number;                  // Timestamp
}
```

---

## File Structure

```
pages/web-app/src/
├── lib/
│   ├── testSuiteStorage.ts          # Test cases & test suites storage
│   ├── promptStorage.ts              # Prompts storage
│   ├── projectStorage.ts             # Projects storage
│   ├── environmentStorage.ts         # Environment configurations
│   └── ...
├── components/
│   ├── PromptsTab.tsx                # Prompts management UI
│   └── ...
└── pages/
    └── ProjectDetailPage.tsx         # Main page with test suites & cases
```

---

## Data Flow

### Test Case Creation Flow:
1. User creates a test case in `ProjectDetailPage.tsx`
2. Test case is saved via `testSuiteStorage.createTestCase()`
3. Data stored in localStorage under `web_app_test_cases`
4. Test case ID is added to parent suite's `testCases` array
5. Suite is updated via `testSuiteStorage.updateTestSuite()`

### Prompt Execution Flow:
1. User executes a prompt from `PromptsTab.tsx`
2. Prompt content is sent to `webService` for execution
3. Execution creates a test case with generated Playwright code
4. Test case is saved with `playwrightCode` and `plannerDescription`

### Relationship Hierarchy:
```
Project
  ├── Test Suites (web_app_test_suites)
  │     └── Test Cases (web_app_test_cases)
  └── Prompts (web_app_prompts)
```

---

## localStorage Keys Summary

| Key | Purpose | Storage Class |
|-----|---------|---------------|
| `web_app_projects` | Projects data | `ProjectStorage` |
| `web_app_test_suites` | Test suites data | `TestSuiteStorage` |
| `web_app_test_cases` | Test cases data | `TestSuiteStorage` |
| `web_app_prompts` | Prompts data | `PromptStorage` |
| `web_app_environments` | Environment configs | `EnvironmentStorage` |

---

## Key Features

### Test Cases:
- ✅ Stored with full Playwright code
- ✅ Tracks execution status (pass/fail/pending/running)
- ✅ Stores planner descriptions
- ✅ Links to test suites via `testSuiteId`
- ✅ Tracks execution time and error messages

### Test Suites:
- ✅ Groups test cases together
- ✅ Supports scheduling (cron expressions)
- ✅ Linked to projects via `projectId`
- ✅ Maintains array of test case IDs

### Prompts:
- ✅ Reusable automation prompts
- ✅ Tagged and categorized
- ✅ Can be duplicated
- ✅ Linked to projects via `projectId`

---

## Notes

- All storage is **client-side only** (localStorage)
- Data persists across browser sessions
- No backend/server required
- Data is stored as JSON strings in localStorage
- Each entity has unique IDs with timestamp + random string
- All timestamps are in milliseconds (Date.now())

