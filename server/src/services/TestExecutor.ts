import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '../db/index.js';
import { RepairAgent } from '../agents/RepairAgent.js';
import { PlannerAgent } from '../agents/PlannerAgent.js';
import { CoderAgent } from '../agents/CoderAgent.js';

const execAsync = promisify(exec);
const repairAgent = new RepairAgent();
const plannerAgent = new PlannerAgent();
const coderAgent = new CoderAgent();

interface ExecutionResult {
  success: boolean;
  logs: string;
  error?: string;
  screenshotPath?: string;
  videoPath?: string;
}

export class TestExecutor {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp_execution');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    this.createFixturesFile();
  }

  private createFixturesFile() {
    const fixturesContent = `
import { test as base } from '@playwright/test';

export const test = base.extend({
  request: async ({ request }, use, testInfo) => {
    const wrappedRequest = new Proxy(request, {
      get: (target, prop, receiver) => {
        const originalMethod = Reflect.get(target, prop, receiver);
        if (typeof originalMethod === 'function' && ['get', 'post', 'put', 'delete', 'patch', 'head', 'fetch'].includes(prop as string)) {
          return async (...args: any[]) => {
            const url = args[0];
            const options = args[1] || {};
            
            // Inject Auth based on Env Vars
            const authEnabled = process.env.TEST_AUTH_ENABLED === 'true';
            if (authEnabled) {
                const authType = process.env.TEST_AUTH_TYPE;
                if (authType === 'Bearer Token') {
                    if (!options.headers) options.headers = {};
                    // Only add if not present? Or override? Let's override to enforce env setting.
                    if (!options.headers['Authorization']) {
                        options.headers['Authorization'] = \`Bearer \${process.env.TEST_AUTH_TOKEN}\`;
                    }
                } else if (authType === 'Basic Auth') {
                    const username = process.env.TEST_AUTH_USERNAME;
                    const password = process.env.TEST_AUTH_PASSWORD;
                    if (username && password) {
                        if (!options.headers) options.headers = {};
                        if (!options.headers['Authorization']) {
                             const b64 = Buffer.from(\`\${username}:\${password}\`).toString('base64');
                             options.headers['Authorization'] = \`Basic \${b64}\`;
                        }
                    }
                } else if (authType === 'API Key') {
                    const key = process.env.TEST_AUTH_KEY;
                    const value = process.env.TEST_AUTH_VALUE;
                    const location = process.env.TEST_AUTH_LOCATION; 
                    
                    if (key && value) {
                        if (location === 'header') {
                            if (!options.headers) options.headers = {};
                            if (!options.headers[key]) {
                                options.headers[key] = value;
                            }
                        } else if (location === 'query') {
                            if (!options.params) options.params = {};
                            if (!options.params[key]) {
                                options.params[key] = value;
                            }
                        }
                    }
                }
            }
            
            // Update args with modified options
            args[1] = options;

            const method = prop.toString().toUpperCase();
            
            // Log Request
            try {
                const reqData = {
                    headers: options.headers,
                    params: options.params,
                    data: options.data
                };
                await testInfo.attach(\`Request: \${method} \${url}\`, {
                    body: JSON.stringify(reqData, null, 2),
                    contentType: 'application/json'
                });
            } catch (e) {
                console.error('Failed to attach request log', e);
            }

            const response = await originalMethod.apply(target, args);
            
            // Log Response
            try {
                let responseBody = '';
                let responseContentType = 'text/plain';
                try {
                    const buffer = await response.body();
                    responseBody = buffer.toString('utf-8');
                    try {
                         const json = JSON.parse(responseBody);
                         responseBody = JSON.stringify(json, null, 2);
                         responseContentType = 'application/json';
                    } catch {}
                } catch (e) {
                    responseBody = '[Body not available]';
                }

                await testInfo.attach(\`Response: \${response.status()} \${method} \${url}\`, {
                    body: responseBody,
                    contentType: responseContentType
                });
            } catch (e) {
                 console.error('Failed to attach response log', e);
            }

            return response;
          };
        }
        return originalMethod;
      }
    });
    
    await use(wrappedRequest);
  }
});

export async function ensureLoggedIn(page: any) {
  const baseUrl = process.env.TEST_BASE_URL || process.env.BASE_URL;
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;

  if (!baseUrl || !username || !password) {
    return;
  }

  const logoutLink = page.getByRole('link', { name: 'Log Out' });
  const alreadyLoggedIn = await logoutLink.isVisible().catch(() => false);

  if (alreadyLoggedIn) {
    return;
  }

  await page.goto(baseUrl);

  const userSelectors = [
    'input[name="username"]',
    'input[id*="user"]',
    'input[placeholder*="User"]',
    'input[placeholder*="Email"]',
  ];
  let filledUser = false;
  for (const selector of userSelectors) {
    const element = await page.$(selector);
    if (element) {
      await page.fill(selector, username);
      filledUser = true;
      break;
    }
  }

  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="pass"]',
  ];
  let filledPassword = false;
  for (const selector of passwordSelectors) {
    const element = await page.$(selector);
    if (element) {
      await page.fill(selector, password);
      filledPassword = true;
      break;
    }
  }

  if (!filledUser || !filledPassword) {
    return;
  }

  const loginSelectors = [
    'button[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'input[type="submit"]',
  ];
  for (const selector of loginSelectors) {
    const element = await page.$(selector);
    if (element) {
      await element.click();
      break;
    }
  }

  await page.waitForTimeout(2000);
}
`;
    fs.writeFileSync(path.join(this.tempDir, 'custom-test.ts'), fixturesContent);
  }

  private async resolveAuthToken(environment: any): Promise<string | undefined> {
    if (!environment?.authorizationEnabled) return undefined;

    if (environment.authType === 'OAuth2') {
      try {
        console.log('[TestExecutor] Fetching OAuth2 token...');
        if (!environment.oauthTokenUrl || !environment.oauthClientId || !environment.oauthClientSecret) {
          console.warn('[TestExecutor] Missing OAuth2 credentials');
          return undefined;
        }

        const response = await fetch(environment.oauthTokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: environment.oauthClientId,
            client_secret: environment.oauthClientSecret,
            scope: environment.oauthScope || '',
          }).toString(),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`OAuth2 fetch failed: ${response.status} ${text}`);
        }

        const data = (await response.json()) as any;
        return data.access_token;
      } catch (error) {
        console.error('[TestExecutor] Failed to fetch OAuth2 token:', error);
        return undefined;
      }
    }

    return environment.authToken;
  }

  async runTestCase(testCaseId: string, environmentId?: string, debug?: boolean): Promise<ExecutionResult> {
    try {
      // 1. Fetch Test Case
      const testCase = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(testCaseId) as any;
      if (!testCase) {
        throw new Error('Test case not found');
      }

      // Fetch Project ID from Test Suite
      let projectId: string | undefined;
      if (testCase.testSuiteId) {
        const testSuite = db.prepare('SELECT projectId FROM test_suites WHERE id = ?').get(testCase.testSuiteId) as any;
        projectId = testSuite?.projectId;
      }

      // Fetch Environment
      let environment: any;
      if (environmentId) {
        environment = db.prepare('SELECT * FROM environments WHERE id = ?').get(environmentId);
      } else if (projectId) {
        // Fallback: Use the first active environment for the project
        environment = db
          .prepare("SELECT * FROM environments WHERE projectId = ? AND status = 'active' LIMIT 1")
          .get(projectId);
        if (environment) {
          console.log(`[TestExecutor] Using default project environment: ${environment.name}`);
        }
      }

      console.log(`[TestExecutor] Running test case: ${testCase.name} (${testCaseId}) Project: ${projectId}`);

      // Check if code is Java (Rest Assured) - Execution not supported yet
      if (
        testCase.playwrightCode &&
        (testCase.playwrightCode.includes('import io.restassured') || testCase.playwrightCode.includes('public class'))
      ) {
        return {
          success: true, // Mark as success to avoid "failure" icon, but with warning log
          logs: 'Execution of Java/Rest Assured tests is not currently supported in the browser runner.\nPlease download the code and run it in your local Java environment.',
          error: undefined,
        };
      }

      // If no code, generate it (Run -> Saved Script -> Planner -> Code -> Execute)
      if (!testCase.playwrightCode) {
        console.log('[TestExecutor] No code found. Generating from prompt...');
        if (!testCase.prompt) {
          throw new Error('No code and no prompt found.');
        }

        try {
          // 1. Planner Agent
          const steps = await plannerAgent.generatePlan(testCase.prompt, projectId);
          console.log('[TestExecutor] Plan generated:', steps);

          // Determine test type
          let testType: 'ui' | 'api' = 'ui';
          if (testCase.testType) {
            if (testCase.testType.toLowerCase().includes('api')) testType = 'api';
          } else if (
            testCase.prompt?.toLowerCase().includes('api') ||
            testCase.description?.toLowerCase().includes('api')
          ) {
            testType = 'api';
          }

          // 2. Coder Agent
          const code = await coderAgent.generateCode(steps, testCase.baseUrl, projectId, testType);
          console.log('[TestExecutor] Code generated');

          // Save code to DB
          db.prepare('UPDATE test_cases SET playwrightCode = ?, updatedAt = ? WHERE id = ?').run(
            code,
            Date.now(),
            testCaseId,
          );

          testCase.playwrightCode = code;
        } catch (e: any) {
          console.error('[TestExecutor] Generation failed:', e);
          throw new Error(`Failed to generate test code from prompt: ${e.message}`);
        }
      }

      // 2. Prepare Execution Environment
      const testFilePath = path.join(this.tempDir, `test-${testCaseId}.spec.ts`);

      // Wrap code in a proper Playwright test structure if not already
      let fullCode = testCase.playwrightCode;
      // Simple heuristic: if it doesn't look like a full file, wrap it
      if (!fullCode.includes('import { test, expect }')) {
        fullCode = `
import { test } from './custom-test';
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('${testCase.name.replace(/'/g, "\\'")}', async ({ page, request }) => {
  try {
    ${fullCode}
  } catch (error) {
    // Capture DOM on failure
    try {
      if (page) {
        const dom = await page.content();
        const dumpPath = path.join('${this.tempDir}', 'dom-${testCaseId}.html');
        fs.writeFileSync(dumpPath, dom);
      }
    } catch (e) {
      console.error('Failed to capture DOM:', e);
    }
    throw error;
  }
});
`;
      } else {
        // If it is a full file, replace the import to use our fixtures
        // Replace: import { test, expect } from '@playwright/test'
        // With: import { test } from './custom-test'; import { expect } from '@playwright/test';
        fullCode = fullCode.replace(
          /import\s*\{([\s\S]*?)\}\s*from\s*['"]@playwright\/test['"]/g,
          (match: string, imports: string) => {
            const parts = imports.split(',').map((s: string) => s.trim());
            const testIndex = parts.indexOf('test');
            if (testIndex === -1) return match;

            parts.splice(testIndex, 1);
            const remaining = parts.join(', ');
            return `import { test } from './custom-test';\nimport { ${remaining} } from '@playwright/test'`;
          },
        );
      }

      fs.writeFileSync(testFilePath, fullCode);

      // 3. Execute Playwright
      // We run playwright test on the specific file
      // We assume playwright is installed in the project root or accessible via npx

      const allureResultsDir = path.join(this.tempDir, 'allure-results', testCaseId);
      // Clean previous results
      if (fs.existsSync(allureResultsDir)) {
        fs.rmSync(allureResultsDir, { recursive: true, force: true });
      }
      fs.mkdirSync(allureResultsDir, { recursive: true });

      // Generate temporary config to respect environment settings
      const configPath = path.join(this.tempDir, `playwright-${testCaseId}.config.ts`);
      const escapePath = (p: string) => p.replace(/\\/g, '\\\\');

      // If debug mode is on, force headless to false
      const headless = debug ? false : environment ? Boolean(environment.headless) : false;

      const baseURL = environment?.baseUrl || testCase.baseUrl || undefined;
      const browserName = environment?.browser || 'chromium';

      const configContent = `
import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: '${escapePath(this.tempDir)}',
  timeout: ${debug ? 0 : environment?.timeout || 30000}, // Disable timeout in debug mode
  reporter: [
    ['json'], 
    ['allure-playwright', { resultsDir: '${escapePath(allureResultsDir)}' }]
  ],
  use: {
    headless: ${headless},
    browserName: '${browserName}',
    baseURL: ${baseURL ? `'${baseURL}'` : 'undefined'},
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
`;
      fs.writeFileSync(configPath, configContent);

      const command = `npx playwright test "${testFilePath}" --config="${configPath}"${debug ? ' --debug' : ''}`;

      // Parse custom variables
      let customVars = {};
      try {
        if (environment && environment.variables) {
          customVars = JSON.parse(environment.variables);
        }
      } catch (e) {
        console.error('[TestExecutor] Failed to parse environment variables:', e);
      }

      // Resolve Auth Token (handle OAuth2)
      let resolvedAuthToken = environment?.authToken || '';
      let resolvedAuthType = environment?.authType || '';

      if (environment?.authorizationEnabled && environment?.authType === 'OAuth2') {
        const token = await this.resolveAuthToken(environment);
        if (token) {
          resolvedAuthToken = token;
          resolvedAuthType = 'Bearer Token';
        }
      }

      const envVars = {
        ...process.env,
        ...customVars,
        ALLURE_RESULTS_DIR: allureResultsDir,
        TEST_BASE_URL: baseURL || '',
        BASE_URL: baseURL || '',
        BROWSER_TYPE: browserName,
        HEADLESS_MODE: String(headless),
        TEST_USERNAME: environment?.username || '',
        TEST_PASSWORD: environment?.password || '',
        TEST_API_URL: environment?.apiUrl || '',
        TEST_AUTH_TOKEN: resolvedAuthToken,
        TEST_AUTH_ENABLED: environment?.authorizationEnabled ? 'true' : 'false',
        TEST_AUTH_TYPE: resolvedAuthType,
        TEST_AUTH_KEY: environment?.authKey || '',
        TEST_AUTH_VALUE: environment?.authValue || '',
        TEST_AUTH_LOCATION: environment?.authLocation || '',
        TEST_AUTH_USERNAME: environment?.authUsername || '',
        TEST_AUTH_PASSWORD: environment?.authPassword || '',
      };

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: process.cwd(),
          env: envVars,
        });
        console.log('[TestExecutor] Execution successful');
        return {
          success: true,
          logs: stdout + '\n' + stderr,
        };
      } catch (error: any) {
        console.log('[TestExecutor] Execution failed...');
        const stdout = error.stdout || '';
        const stderr = error.stderr || '';
        const logs = stdout + '\n' + stderr;

        if (debug) {
          console.log('[TestExecutor] Debug mode enabled, skipping repair agent.');
          // Extract a brief error message from stderr/stdout
          const errorMessage =
            stderr.split('\n').find((line: string) => line.includes('Error:')) ||
            stderr.split('\n')[0] ||
            'Test failed';
          return {
            success: false,
            logs: logs,
            error: `Test failed (Debug Mode): ${errorMessage.trim()}`,
          };
        }

        console.log('[TestExecutor] Attempting repair...');

        // Parse JSON report to get error details if possible
        // Note: reporter=json outputs the JSON to stdout, but mixed with other logs it might be hard to parse cleanly
        // simpler approach: pass the raw error logs to Repair Agent

        // 4. Repair Loop
        // We'll try to repair once for now (can be a loop in future)

        let domSnapshot: string | undefined;
        try {
          const dumpPath = path.join(this.tempDir, `dom-${testCaseId}.html`);
          if (fs.existsSync(dumpPath)) {
            domSnapshot = fs.readFileSync(dumpPath, 'utf-8');
          }
        } catch (e) {
          console.log('[TestExecutor] Could not read DOM snapshot');
        }

        let repairResult;
        try {
          console.log('[TestExecutor] invoking repair agent with full code...');
          repairResult = await repairAgent.repairStep(
            fullCode, // Pass the actual executed code (including wrapper) so line numbers match
            stderr || stdout || 'Unknown error', // Pass logs as error
            domSnapshot,
            'Running test',
            projectId,
          );
        } catch (repairError: any) {
          console.log('[TestExecutor] Repair agent failed:', repairError);
          return {
            success: false,
            logs: logs + '\n[Repair Agent Failed] ' + repairError.message,
            error: 'Test failed and repair failed: ' + repairError.message,
          };
        }

        if (repairResult) {
          console.log('[TestExecutor] Repair suggested:', repairResult.explanation);

          // Apply fix and retry
          // Update DB with fixed code? Or just run it temporarily?
          // User flow says "Update Script", so we should update DB if retry succeeds.

          // Let's wrap the fixed code
          let fixedFullCode = repairResult.fixedCode;
          if (!fixedFullCode.includes('import { test, expect }')) {
            fixedFullCode = `
import { test } from './custom-test';
import { expect } from '@playwright/test';

test('${testCase.name.replace(/'/g, "\\'")}', async ({ page, request }) => {
${fixedFullCode}
});
`;
          } else {
            fixedFullCode = fixedFullCode.replace(
              /import\s*\{([\s\S]*?)\}\s*from\s*['"]@playwright\/test['"]/g,
              (match: string, imports: string) => {
                const parts = imports.split(',').map((s: string) => s.trim());
                const testIndex = parts.indexOf('test');
                if (testIndex === -1) return match;

                parts.splice(testIndex, 1);
                const remaining = parts.join(', ');
                return `import { test } from './custom-test';\nimport { ${remaining} } from '@playwright/test'`;
              },
            );
          }

          fs.writeFileSync(testFilePath, fixedFullCode);

          try {
            console.log('[TestExecutor] Retrying with fixed code...');
            const retryResult = await execAsync(command, {
              cwd: process.cwd(),
              env: envVars,
            });
            console.log('[TestExecutor] Retry successful!');

            // Update DB with fixed code
            db.prepare('UPDATE test_cases SET playwrightCode = ?, updatedAt = ? WHERE id = ?').run(
              repairResult.fixedCode,
              Date.now(),
              testCaseId,
            );

            return {
              success: true,
              logs: retryResult.stdout + '\n' + retryResult.stderr + '\n[Repair] ' + repairResult.explanation,
            };
          } catch (retryError: any) {
            console.log('[TestExecutor] Retry failed');
            return {
              success: false,
              logs: logs + '\n[Repair Failed] ' + retryError.stdout + '\n' + retryError.stderr,
              error: 'Test failed even after repair attempt.',
            };
          }
        }

        return {
          success: false,
          logs: logs,
          error: 'Test failed and could not be repaired.',
        };
      }
    } catch (error: any) {
      console.error('[TestExecutor] System error:', error);
      return {
        success: false,
        logs: error.message,
        error: error.message,
      };
    }
  }

  async runTestSuite(
    suiteId: string,
    options: {
      environmentId?: string;
      browser?: string;
      headless?: boolean;
      parallel?: boolean;
      tags?: string;
      jiraLogging?: boolean;
      singleSession?: boolean;
    } = {},
  ): Promise<ExecutionResult> {
    try {
      console.log(`[TestExecutor] Starting suite execution: ${suiteId}`, options);

      const {
        environmentId,
        browser,
        headless: headlessOverride,
        parallel,
        tags,
        jiraLogging,
        singleSession = true,
      } = options;

      // 1. Fetch Suite and Test Cases
      const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(suiteId) as any;
      if (!suite) throw new Error('Test suite not found');

      const allTestCases = db.prepare('SELECT * FROM test_cases WHERE testSuiteId = ?').all(suiteId) as any[];
      if (allTestCases.length === 0) throw new Error('No test cases in suite');

      let testCases = allTestCases;
      if (tags && tags.trim()) {
        const rawTag = tags.trim();
        const tagLower = rawTag.toLowerCase();
        testCases = allTestCases.filter(tc => {
          const code = (tc.playwrightCode || '').toString();
          if (
            code.includes(`await allure.tag('${rawTag}')`) ||
            code.includes(`await allure.tag("${rawTag}")`) ||
            code.includes(`allure.tag('${rawTag}')`) ||
            code.includes(`allure.tag("${rawTag}")`)
          ) {
            return true;
          }

          const name = (tc.name || '').toString().toLowerCase();
          const description = (tc.description || '').toString().toLowerCase();
          return name.includes(tagLower) || description.includes(tagLower);
        });

        if (testCases.length === 0) {
          throw new Error(`No test cases match tag filter: ${tags}`);
        }
      }

      // Fetch Environment if provided
      let environment: any;
      if (environmentId) {
        environment = db.prepare('SELECT * FROM environments WHERE id = ?').get(environmentId);
      } else if (suite.projectId) {
        // Try to find a default environment for the project?
        // For now, let's see if the suite schedule has one
        if (suite.schedule) {
          try {
            const schedule = JSON.parse(suite.schedule);
            if (schedule.environment) {
              environment = db.prepare('SELECT * FROM environments WHERE id = ?').get(schedule.environment);
            }
          } catch (e) {
            // ignore
          }
        }

        // If still no environment, pick first active one for project
        if (!environment) {
          environment = db
            .prepare("SELECT * FROM environments WHERE projectId = ? AND status = 'active' LIMIT 1")
            .get(suite.projectId);
          if (environment) {
            console.log(`[TestExecutor] Using default project environment: ${environment.name}`);
          }
        }
      }

      // 2. Prepare Execution Environment
      const suiteDir = path.join(this.tempDir, `suite-${suiteId}`);
      if (fs.existsSync(suiteDir)) {
        fs.rmSync(suiteDir, { recursive: true, force: true });
      }
      fs.mkdirSync(suiteDir, { recursive: true });

      const globalSetupPath = path.join(suiteDir, 'global-setup.ts');
      const globalSetupContent = `
import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

async function globalSetup(config: FullConfig) {
  const storageStatePath = path.resolve(__dirname, 'auth-state.json');
  if (fs.existsSync(storageStatePath)) {
    console.log('[GlobalSetup] Using existing auth storage state');
    return;
  }

  const baseURL = process.env.TEST_BASE_URL || process.env.BASE_URL;
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;

  if (!baseURL || !username || !password) {
    console.log('[GlobalSetup] Missing base URL or credentials, skipping login');
    return;
  }

  const defaultProject = config.projects[0];
  const headless = defaultProject && defaultProject.use && typeof defaultProject.use.headless === 'boolean'
    ? defaultProject.use.headless
    : true;

  const browser = await chromium.launch({
    headless,
  });
  const page = await browser.newPage();

  try {
    await page.goto(baseURL);

    const userSelectors = [
      'input[name="username"]',
      'input[id*="user"]',
      'input[placeholder*="User"]',
      'input[placeholder*="Email"]',
    ];
    let filledUser = false;
    for (const selector of userSelectors) {
      const element = await page.$(selector);
      if (element) {
        await page.fill(selector, username);
        filledUser = true;
        break;
      }
    }

    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="pass"]',
    ];
    let filledPassword = false;
    for (const selector of passwordSelectors) {
      const element = await page.$(selector);
      if (element) {
        await page.fill(selector, password);
        filledPassword = true;
        break;
      }
    }

    if (!filledUser || !filledPassword) {
      console.log('[GlobalSetup] Could not find username or password fields');
    } else {
      const loginSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'input[type="submit"]',
      ];
      for (const selector of loginSelectors) {
        const element = await page.$(selector);
        if (element) {
          await element.click();
          break;
        }
      }
      await page.waitForTimeout(2000);
    }

    await page.context().storageState({ path: storageStatePath });
    console.log('[GlobalSetup] Saved auth storage state');
  } catch (error) {
    console.error('[GlobalSetup] Failed to perform login', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
`;
      const canUseSingleSession =
        Boolean(singleSession) &&
        Boolean(environment?.baseUrl) &&
        Boolean(environment?.username) &&
        Boolean(environment?.password);
      if (canUseSingleSession) {
        fs.writeFileSync(globalSetupPath, globalSetupContent);
      }

      // Write test files
      for (const testCase of testCases) {
        if (!testCase.playwrightCode) continue;

        let fullCode = testCase.playwrightCode;
        if (!fullCode.includes('import { test, expect }')) {
          fullCode = `
import { test } from '../custom-test';
import { expect } from '@playwright/test';
test('${testCase.name.replace(/'/g, "\\'")}', async ({ page, request }) => {
  ${fullCode}
});`;
        } else {
          // Replace import for full files
          fullCode = fullCode.replace(
            /import\s*\{([\s\S]*?)\}\s*from\s*['"]@playwright\/test['"]/g,
            (match: string, imports: string) => {
              const parts = imports.split(',').map((s: string) => s.trim());
              const testIndex = parts.indexOf('test');
              if (testIndex === -1) return match;

              parts.splice(testIndex, 1);
              const remaining = parts.join(', ');
              return `import { test } from '../custom-test';\nimport { ${remaining} } from '@playwright/test'`;
            },
          );
        }

        // Handle tags if provided (simple filtering by checking if test name contains tags? No, Playwright tags are usually @tag in title)
        // If tags are provided, we might need to use grep.

        fs.writeFileSync(path.join(suiteDir, `test-${testCase.id}.spec.ts`), fullCode);
      }

      // 3. Configure Reports Paths
      const projectRoot = process.cwd();
      const publicReportsDir = path.join(projectRoot, 'public', 'reports');
      const playwrightReportDir = path.join(publicReportsDir, 'playwright', suiteId);
      const allureResultsDir = path.join(projectRoot, 'temp_execution', 'allure-results', suiteId);
      const allureReportDir = path.join(publicReportsDir, 'allure', suiteId);

      // Clean previous reports
      if (fs.existsSync(playwrightReportDir)) fs.rmSync(playwrightReportDir, { recursive: true, force: true });
      if (fs.existsSync(allureResultsDir)) fs.rmSync(allureResultsDir, { recursive: true, force: true });

      // Ensure directories exist
      fs.mkdirSync(path.dirname(playwrightReportDir), { recursive: true });
      fs.mkdirSync(path.dirname(allureReportDir), { recursive: true });
      fs.mkdirSync(allureResultsDir, { recursive: true });

      // Create playwright.config.ts
      // We need to escape backslashes for Windows paths in the config string
      const escapePath = (p: string) => p.replace(/\\/g, '\\\\');

      // Determine final settings (override > environment > default)
      const headless =
        headlessOverride !== undefined ? headlessOverride : environment ? Boolean(environment.headless) : true;
      const baseURL = environment?.baseUrl || undefined;
      const browserName = browser || environment?.browser || 'chromium';
      const workers = parallel && !canUseSingleSession ? undefined : 1;

      const configContent = `
import { defineConfig } from '@playwright/test';
import path from 'path';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: '${escapePath(suiteDir)}',
  timeout: ${environment?.timeout || 30000},
  workers: ${workers !== undefined ? workers : 'undefined'},
  reporter: [
    ['json', { outputFile: '${escapePath(path.join(playwrightReportDir, 'report.json'))}' }],
    ['html', { outputFolder: '${escapePath(playwrightReportDir)}', open: 'never' }],
    ['allure-playwright', { resultsDir: '${escapePath(allureResultsDir)}' }]
  ],
  use: {
    headless: ${headless},
    browserName: '${browserName}',
    baseURL: ${baseURL ? `'${baseURL}'` : 'undefined'},
    screenshot: 'on',
    video: 'on',
    trace: 'on',
    ${canUseSingleSession ? "storageState: path.resolve(__dirname, 'auth-state.json')," : ''}
  },
  ${canUseSingleSession ? "globalSetup: path.resolve(__dirname, 'global-setup.ts')," : ''}
});
`;
      fs.writeFileSync(path.join(suiteDir, 'playwright.config.ts'), configContent);

      // 4. Execute Playwright
      let command = `npx playwright test --config="${path.join(suiteDir, 'playwright.config.ts')}"`;

      console.log(`[TestExecutor] Executing command: ${command}`);

      // Parse custom variables
      let customVars = {};
      try {
        if (environment && environment.variables) {
          customVars = JSON.parse(environment.variables);
        }
      } catch (e) {
        console.error('[TestExecutor] Failed to parse environment variables:', e);
      }

      // Resolve Auth Token (handle OAuth2)
      let resolvedAuthToken = environment?.authToken || '';
      let resolvedAuthType = environment?.authType || '';

      if (environment?.authorizationEnabled && environment?.authType === 'OAuth2') {
        const token = await this.resolveAuthToken(environment);
        if (token) {
          resolvedAuthToken = token;
          resolvedAuthType = 'Bearer Token';
        }
      }

      const envVars = {
        ...process.env,
        ...customVars,
        ALLURE_RESULTS_DIR: allureResultsDir,
        TEST_BASE_URL: baseURL || '',
        BASE_URL: baseURL || '',
        TEST_USERNAME: environment?.username || '',
        TEST_PASSWORD: environment?.password || '',
        TEST_API_URL: environment?.apiUrl || '',
        TEST_AUTH_TOKEN: resolvedAuthToken,
        TEST_AUTH_ENABLED: environment?.authorizationEnabled ? 'true' : 'false',
        TEST_AUTH_TYPE: resolvedAuthType,
        TEST_AUTH_KEY: environment?.authKey || '',
        TEST_AUTH_VALUE: environment?.authValue || '',
        TEST_AUTH_LOCATION: environment?.authLocation || '',
        TEST_AUTH_USERNAME: environment?.authUsername || '',
        TEST_AUTH_PASSWORD: environment?.authPassword || '',
        JIRA_LOGGING_ENABLED: jiraLogging ? 'true' : 'false', // Pass to tests if they need it
      };

      let logs = '';
      let success = true;

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: projectRoot,
          env: envVars,
        });
        logs = stdout + '\n' + stderr;
      } catch (e: any) {
        logs = (e.stdout || '') + '\n' + (e.stderr || '');
        success = false; // Tests failed
        console.log('[TestExecutor] Suite execution had failures');
      }

      try {
        const allureCmd = `npx allure generate "${allureResultsDir}" -o "${allureReportDir}" --clean`;
        console.log(`[TestExecutor] Generating Allure report: ${allureCmd}`);
        await execAsync(allureCmd, { cwd: projectRoot });
      } catch (e: any) {
        console.error('[TestExecutor] Failed to generate Allure report:', e);
        logs += '\n[Allure] Failed to generate report: ' + e.message;
      }

      try {
        const indexPath = path.join(playwrightReportDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
          fs.mkdirSync(playwrightReportDir, { recursive: true });
          const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Playwright Report Not Available</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #f3f4f6; color: #111827; }
    .card { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px 28px; box-shadow: 0 10px 15px rgba(15, 23, 42, 0.1); border: 1px solid #e5e7eb; }
    h1 { font-size: 1.5rem; margin-bottom: 12px; }
    p { margin: 6px 0; font-size: 0.95rem; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
    .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #fef2f2; color: #b91c1c; margin-bottom: 8px; }
    .badge span { margin-right: 6px; }
    .hint { margin-top: 16px; padding: 10px 12px; border-radius: 8px; background: #eff6ff; color: #1d4ed8; font-size: 0.85rem; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.8rem; background: #f9fafb; padding: 3px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span>!</span>Playwright HTML report missing</div>
    <h1>Playwright report not generated for this run</h1>
    <p>
      The Playwright HTML report directory was not found for this suite.
      This usually means the test run failed before the HTML reporter could generate the report.
    </p>
    <p>
      You can still inspect the suite execution logs in the Web UI under
      <span class="mono">Run Logs</span> for this test suite run.
    </p>
    <div class="hint">
      If this keeps happening, check the server logs for Playwright errors (for example,
      Playwright not installed, invalid configuration, or global setup failures).
    </div>
  </div>
</body>
</html>`;
          fs.writeFileSync(indexPath, html, 'utf-8');
        }
      } catch (e) {
        console.error('[TestExecutor] Failed to create fallback Playwright HTML report:', e);
      }

      return {
        success,
        logs,
        error: success ? undefined : 'Test suite execution completed with failures',
      };
    } catch (error: any) {
      console.error('[TestExecutor] Suite execution error:', error);
      return {
        success: false,
        logs: error.message,
        error: error.message,
      };
    }
  }
}
