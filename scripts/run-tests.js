#!/usr/bin/env node

/**
 * Test Runner Script for CI/CD Pipelines
 *
 * This script fetches test cases from the API, exports them as Playwright test files,
 * and runs them using Playwright.
 *
 * Usage:
 *   node scripts/run-tests.js --suite <suiteId>
 *   node scripts/run-tests.js --project <projectId>
 *   node scripts/run-tests.js --test-case <testCaseId>
 *   node scripts/run-tests.js --all
 *
 * Options:
 *   --api-url <url>     API base URL (default: http://localhost:3001/api)
 *   --output-dir <dir>  Output directory for test files (default: ./tests)
 *   --headless          Run in headless mode
 *   --workers <n>       Number of workers (default: 1)
 *   --update-results    Update test results back to API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue = null) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};
const hasArg = name => args.includes(`--${name}`);

const API_URL = getArg('api-url', process.env.API_URL || 'http://localhost:3001/api');
const OUTPUT_DIR = getArg('output-dir', path.join(process.cwd(), 'tests'));
const HEADLESS = hasArg('headless');
const WORKERS = parseInt(getArg('workers', '1'), 10);
const UPDATE_RESULTS = hasArg('update-results');

// Determine what to run
const suiteId = getArg('suite');
const projectId = getArg('project');
const testCaseId = getArg('test-case');
const runAll = hasArg('all');

if (!suiteId && !projectId && !testCaseId && !runAll) {
  console.error('Error: Must specify one of --suite, --project, --test-case, or --all');
  process.exit(1);
}

/**
 * Fetch test cases from API
 */
async function fetchTestCases() {
  let url = `${API_URL}/execution/test-cases?withCode=true`;

  if (suiteId) {
    url += `&suiteId=${suiteId}`;
  } else if (projectId) {
    url += `&projectId=${projectId}`;
  } else if (testCaseId) {
    // Fetch single test case
    const response = await fetch(`${API_URL}/test-cases/${testCaseId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch test case: ${response.statusText}`);
    }
    const testCase = await response.json();
    return testCase.playwrightCode ? [testCase] : [];
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch test cases: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Export test case as Playwright test file
 */
function exportTestFile(testCase, outputDir) {
  if (!testCase.playwrightCode) {
    console.warn(`Skipping test case ${testCase.id}: No Playwright code`);
    return null;
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Sanitize test case name for filename
  const sanitizedName = testCase.name
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);

  const filename = `${testCase.id}_${sanitizedName}.spec.ts`;
  const filepath = path.join(outputDir, filename);

  // Write test file
  fs.writeFileSync(filepath, testCase.playwrightCode, 'utf8');
  console.log(`✅ Exported: ${filename}`);

  return { testCase, filepath, filename };
}

/**
 * Update test result back to API
 */
async function updateTestResult(testCaseId, result) {
  if (!UPDATE_RESULTS) return;

  try {
    const response = await fetch(`${API_URL}/execution/test-cases/${testCaseId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to update result for ${testCaseId}: ${response.statusText}`);
    } else {
      console.log(`✅ Updated result for ${testCaseId}`);
    }
  } catch (error) {
    console.warn(`⚠️  Failed to update result for ${testCaseId}:`, error.message);
  }
}

/**
 * Run Playwright tests
 */
async function runTests(testFiles) {
  if (testFiles.length === 0) {
    console.log('No test files to run');
    return;
  }

  console.log(`\n🚀 Running ${testFiles.length} test(s)...\n`);

  // Create Playwright config if it doesn't exist
  const configPath = path.join(process.cwd(), 'playwright.config.ts');
  if (!fs.existsSync(configPath)) {
    const defaultConfig = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: ${WORKERS},
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
`;
    fs.writeFileSync(configPath, defaultConfig, 'utf8');
    console.log('✅ Created playwright.config.ts');
  }

  // Install Playwright if not installed
  try {
    execSync('npx playwright --version', { stdio: 'ignore' });
  } catch {
    console.log('📦 Installing Playwright...');
    execSync('npx playwright install --with-deps', { stdio: 'inherit' });
  }

  // Run tests
  const headlessFlag = HEADLESS ? '--headed=false' : '';
  const command = `npx playwright test ${testFiles.map(f => f.filepath).join(' ')} ${headlessFlag}`;

  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Some tests failed');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📥 Fetching test cases from API...');
  console.log(`   API URL: ${API_URL}`);

  const testCases = await fetchTestCases();
  console.log(`✅ Found ${testCases.length} test case(s) with Playwright code\n`);

  if (testCases.length === 0) {
    console.log('No test cases to run');
    process.exit(0);
  }

  console.log('📝 Exporting test files...');
  const testFiles = testCases.map(tc => exportTestFile(tc, OUTPUT_DIR)).filter(f => f !== null);

  if (testFiles.length === 0) {
    console.log('No test files exported');
    process.exit(0);
  }

  await runTests(testFiles);

  // Update results if requested
  if (UPDATE_RESULTS) {
    console.log('\n📤 Updating test results...');
    // Note: In a real implementation, you'd parse Playwright results
    // and update each test case accordingly
    for (const { testCase } of testFiles) {
      await updateTestResult(testCase.id, {
        status: 'pass', // Would be determined from Playwright results
        lastRunAt: Date.now(),
      });
    }
  }

  console.log('\n✨ Done!');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
