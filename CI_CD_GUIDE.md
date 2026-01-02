# CI/CD Pipeline Guide for Test Cases

This guide explains how to run test cases through CI/CD pipelines like Jenkins, GitHub Actions, GitLab CI, etc.

## Overview

Test cases are stored in the database with Playwright code. The CI/CD pipeline:
1. Fetches test cases from the API
2. Exports them as Playwright test files
3. Runs them using Playwright
4. Updates results back to the API (optional)

## Prerequisites

- Node.js 22+
- pnpm 9.15.1+
- Playwright (installed automatically by the script)
- API server running (or accessible)

## Quick Start

### 1. Run Tests Locally

```bash
# Install dependencies
pnpm install

# Run all test cases
node scripts/run-tests.js --all --update-results

# Run tests for a specific suite
node scripts/run-tests.js --suite <suiteId> --update-results

# Run tests for a project
node scripts/run-tests.js --project <projectId> --update-results

# Run a single test case
node scripts/run-tests.js --test-case <testCaseId> --update-results
```

### 2. Script Options

```bash
node scripts/run-tests.js [options]

Options:
  --suite <id>          Run tests for a specific test suite
  --project <id>        Run tests for a specific project
  --test-case <id>      Run a single test case
  --all                 Run all test cases
  --api-url <url>       API base URL (default: http://localhost:3001/api)
  --output-dir <dir>    Output directory for test files (default: ./tests)
  --headless            Run in headless mode
  --workers <n>         Number of workers (default: 1)
  --update-results      Update test results back to API
```

## Jenkins Pipeline

### Setup

1. **Install Required Plugins:**
   - Pipeline Plugin
   - HTML Publisher Plugin (for test reports)

2. **Create Pipeline Job:**
   - New Item → Pipeline
   - Copy contents from `Jenkinsfile`

3. **Configure Parameters:**
   - `TEST_SCOPE`: Choose what to test (SUITE, PROJECT, TEST_CASE, ALL)
   - `SUITE_ID`: Test Suite ID (if scope is SUITE)
   - `PROJECT_ID`: Project ID (if scope is PROJECT)
   - `TEST_CASE_ID`: Test Case ID (if scope is TEST_CASE)

### Running the Pipeline

1. **Build with Parameters:**
   - Click "Build with Parameters"
   - Select test scope
   - Enter appropriate ID
   - Click "Build"

2. **View Results:**
   - Check console output for execution logs
   - View "Playwright Test Report" for HTML report
   - Check artifacts for exported test files

### Environment Variables

Set these in Jenkins:
- `API_URL`: API server URL (default: http://localhost:3001/api)
- `NODE_VERSION`: Node.js version (default: 22)
- `PNPM_VERSION`: pnpm version (default: 9.15.1)

## GitHub Actions

### Setup

1. **Workflow File:**
   - Already configured in `.github/workflows/run-tests.yml`
   - Automatically runs on push to main/develop
   - Can be triggered manually via "Run workflow"

2. **Manual Trigger:**
   - Go to Actions tab
   - Select "Run Test Cases" workflow
   - Click "Run workflow"
   - Select test scope and enter IDs
   - Click "Run workflow"

### Scheduled Runs

The workflow is configured to run daily at 2 AM UTC. To modify:
```yaml
schedule:
  - cron: '0 2 * * *'  # Change this cron expression
```

## GitLab CI

### Setup

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

variables:
  API_URL: "http://localhost:3001/api"
  NODE_VERSION: "22"

run-tests:
  stage: test
  image: node:${NODE_VERSION}
  before_script:
    - npm install -g pnpm@9.15.1
    - pnpm install --frozen-lockfile
  script:
    - cd server && pnpm install && pnpm dev &
    - sleep 5
    - chmod +x scripts/run-tests.js
    - node scripts/run-tests.js --all --update-results --headless
  artifacts:
    when: always
    paths:
      - playwright-report/
      - tests/
    expire_in: 1 week
```

## API Endpoints

### Get Test Cases for Execution

```bash
GET /api/execution/test-cases?withCode=true&suiteId=<id>
GET /api/execution/test-cases?withCode=true&projectId=<id>
GET /api/execution/test-cases?withCode=true&status=pending
```

### Update Test Result

```bash
POST /api/execution/test-cases/:id/result
Content-Type: application/json

{
  "status": "pass" | "fail" | "pending" | "running",
  "executionTime": 1234,
  "errorMessage": "Error message if failed",
  "lastRunAt": 1234567890
}
```

### Export Test Suite

```bash
GET /api/execution/test-suites/:id/export
```

Returns test suite with all test cases that have Playwright code.

## Advanced Configuration

### Custom Playwright Config

The script creates a default `playwright.config.ts` if it doesn't exist. You can customize it:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### Environment Variables

Set these in your CI/CD environment:

- `API_URL`: API server URL
- `BASE_URL`: Base URL for tests (used in Playwright config)
- `CI`: Set to `true` in CI environments (affects retries, workers)

### Parallel Execution

To run tests in parallel:

```bash
node scripts/run-tests.js --all --workers 4
```

Note: Be careful with parallel execution if tests share state or resources.

## Troubleshooting

### API Server Not Running

**Error:** `Failed to fetch test cases: ECONNREFUSED`

**Solution:**
1. Ensure API server is running: `cd server && pnpm dev`
2. Check API_URL environment variable
3. Verify server is accessible from CI/CD environment

### Playwright Not Installed

**Error:** `Command 'playwright' not found`

**Solution:**
The script automatically installs Playwright, but if it fails:
```bash
npx playwright install --with-deps
```

### Test Files Not Generated

**Error:** No test files exported

**Solution:**
1. Verify test cases have `playwrightCode` field
2. Check API response includes test cases
3. Verify output directory permissions

### Results Not Updated

**Error:** Results not updating in database

**Solution:**
1. Ensure `--update-results` flag is used
2. Check API server is accessible
3. Verify test case IDs are correct

## Best Practices

1. **Use Headless Mode in CI:**
   ```bash
   node scripts/run-tests.js --all --headless
   ```

2. **Update Results:**
   Always use `--update-results` to track execution history

3. **Separate Environments:**
   Use different API URLs for dev/staging/prod

4. **Artifact Retention:**
   Keep test reports and files for debugging

5. **Notification:**
   Configure email/Slack notifications on failure

6. **Scheduling:**
   Run critical test suites on schedule (e.g., nightly)

## Example Workflows

### Nightly Full Test Run

```bash
# Run all tests every night
node scripts/run-tests.js --all --update-results --headless --workers 2
```

### Smoke Tests on Every Commit

```bash
# Run specific smoke test suite
node scripts/run-tests.js --suite <smoke-suite-id> --update-results --headless
```

### Production Deployment Tests

```bash
# Run production test suite before deployment
node scripts/run-tests.js --suite <prod-suite-id> --update-results --headless
```

## Support

For issues or questions:
1. Check API server logs
2. Review Playwright test reports
3. Check CI/CD pipeline logs
4. Verify test case data in database

