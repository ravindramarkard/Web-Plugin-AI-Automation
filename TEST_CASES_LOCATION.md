# Where to Find Test Cases in the Workspace

## 📍 Test Cases Location Overview

Test cases are **stored in the database** (not as individual files). Here's where everything related to test cases is located:

## 🗄️ Database Storage

**Location:** `server/data/database.sqlite`

Test cases are stored in the `test_cases` table in SQLite database. The database file is created automatically when the server starts.

**To view test cases in the database:**
```bash
# Install SQLite CLI if needed
# Then open the database:
sqlite3 server/data/database.sqlite

# View all test cases:
SELECT * FROM test_cases;

# View test cases with Playwright code:
SELECT id, name, playwrightCode FROM test_cases WHERE playwrightCode IS NOT NULL;
```

## 📁 Code Files Related to Test Cases

### Frontend (Web App)

1. **Storage Layer**
   - **File:** `pages/web-app/src/lib/testSuiteStorage.ts`
   - **Purpose:** API client for test case operations
   - **Methods:** `getTestCases()`, `getTestCase()`, `createTestCase()`, `updateTestCase()`, `deleteTestCase()`

2. **API Helper**
   - **File:** `pages/web-app/src/lib/testCaseAPI.ts`
   - **Purpose:** Helper functions for accessing test cases with code
   - **Methods:** `getAllTestCasesWithCode()`, `getTestCaseWithCode()`

3. **UI Components**
   - **File:** `pages/web-app/src/pages/ProjectDetailPage.tsx`
   - **Purpose:** Main UI for viewing/editing test cases
   - **Location in UI:** Test Suite tab → Test Cases list

### Backend (Server)

1. **API Routes**
   - **File:** `server/src/routes/testCases.ts`
   - **Endpoints:**
     - `GET /api/test-cases` - Get all test cases
     - `GET /api/test-cases/:id` - Get single test case
     - `GET /api/test-cases/suite/:suiteId` - Get test cases by suite
     - `POST /api/test-cases` - Create test case
     - `PUT /api/test-cases/:id` - Update test case
     - `DELETE /api/test-cases/:id` - Delete test case

2. **Database Schema**
   - **File:** `server/src/db/schema.ts`
   - **Function:** `createTestCasesTable()`
   - **Table:** `test_cases`

## 🎨 Where to View Test Cases in the UI

1. **Navigate to:** Project Detail Page
2. **Click on:** "Test Suite" tab
3. **Select:** A test suite from the sidebar
4. **View:** Test cases list with columns:
   - Test Case Name
   - Description
   - Code (click to view Playwright code)
   - Automation Prompt (click to view steps)
   - Environment
   - Tags
   - Status
   - Actions (Edit, Delete, Run)

## 📝 Test Case Data Structure

Each test case contains:
- **Basic Info:** `id`, `name`, `description`, `testSuiteId`
- **Prompt:** `prompt` (original), `plannerDescription` (planner's steps)
- **Code:** `playwrightCode` (generated Playwright test script)
- **Status:** `status` (pass/fail/pending/running)
- **Metadata:** `createdAt`, `updatedAt`, `lastRunAt`, `executionTime`, `errorMessage`

## 🔍 How to Access Test Cases Programmatically

### From Browser Console:
```javascript
// Get all test cases with code
import { getAllTestCasesWithCode } from './lib/testCaseAPI';
const testCases = await getAllTestCasesWithCode();
console.log(testCases);

// Get specific test case
import { getTestCaseWithCode } from './lib/testCaseAPI';
const testCase = await getTestCaseWithCode('case_1234567890_abc');
console.log(testCase.playwrightCode);
```

### From API:
```bash
# Get all test cases
curl http://localhost:3001/api/test-cases

# Get test case by ID
curl http://localhost:3001/api/test-cases/case_1234567890_abc

# Get test cases for a suite
curl http://localhost:3001/api/test-cases/suite/suite_1234567890_xyz
```

## 📦 Exporting Test Cases

Test cases can be exported/downloaded:
1. **In UI:** Click on a test case → View Code → Download button
2. **Downloads as:** `.spec.ts` file with Playwright code
3. **Location:** Browser's default download folder

## 🔄 Test Case Generation Flow

1. User creates prompt in **Prompts Tab**
2. User executes prompt → **webService.ts** handles execution
3. **webPlanner.ts** generates Playwright code
4. Test case created with `playwrightCode` field
5. Saved to database via **testSuiteStorage.ts**
6. Displayed in **ProjectDetailPage.tsx**

## 📂 File Structure Summary

```
workspace/
├── pages/web-app/src/
│   ├── lib/
│   │   ├── testSuiteStorage.ts      ← Test case storage API client
│   │   └── testCaseAPI.ts           ← Test case helper functions
│   └── pages/
│       └── ProjectDetailPage.tsx     ← Test case UI
│
└── server/
    ├── src/
    │   ├── routes/
    │   │   └── testCases.ts         ← Test case API endpoints
    │   └── db/
    │       └── schema.ts            ← Database schema
    └── data/
        └── database.sqlite          ← Test cases database (created at runtime)
```

## 💡 Key Points

- ✅ Test cases are **NOT stored as files** - they're in the database
- ✅ Playwright code is stored as **text in the database** (`playwrightCode` field)
- ✅ You can **download** test cases as `.spec.ts` files from the UI
- ✅ Test cases are **linked to test suites** via `testSuiteId`
- ✅ All test case operations go through the **API** (`/api/test-cases`)

