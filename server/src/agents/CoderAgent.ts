import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createLLM } from '../lib/llm.js';

export class CoderAgent {
  async generateCode(
    steps: string[],
    baseUrl?: string,
    projectId?: string,
    testType: 'ui' | 'api' = 'ui',
  ): Promise<string> {
    try {
      const llm = await createLLM('coder', projectId);

      const envVarBlock =
        testType === 'api'
          ? `
   const API_URL = process.env.API_URL || process.env.TEST_API_URL || '{defaultBaseUrl}';
   const USERNAME = process.env.TEST_USERNAME || process.env.USERNAME || 'testuser';
   const PASSWORD = process.env.TEST_PASSWORD || process.env.PASSWORD || 'password';
   const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || process.env.AUTH_TOKEN || '';
        `
          : `
   const BASE_URL = process.env.BASE_URL || process.env.TEST_BASE_URL || '{defaultBaseUrl}';
   const BROWSER_TYPE = process.env.BROWSER_TYPE || 'chromium';
   const HEADLESS_MODE = process.env.HEADLESS_MODE === 'false' ? false : true;
   const USERNAME = process.env.TEST_USERNAME || process.env.USERNAME || 'testuser';
   const PASSWORD = process.env.TEST_PASSWORD || process.env.PASSWORD || 'password';
        `;

      const transformationRules =
        testType === 'api'
          ? `
   **TRANSFORMATION RULES:**
   - Use \`request\` fixture for API calls.
   - **DO NOT** use the hardcoded URL from the steps. **ALWAYS** replace the base part with \`API_URL\`.
   - Example: \`await request.get(\`\${{API_URL}}/users\`);\`
        `
          : `
   **TRANSFORMATION RULES:**
   - **DO NOT** use the hardcoded URL from the steps. **ALWAYS** replace it with \`BASE_URL\`.
        `;

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are an expert Playwright Automation Engineer. Convert the following list of test steps into a complete Playwright test script.

Rules:
1. Use TypeScript.
2. **STRICT FILE STRUCTURE & ORDER**:
   - **PART 1: IMPORTS** (Must be at the very top)
     - Import { test, expect } from '@playwright/test'.
     - Import { allure } from "allure-playwright".
     - Import { faker } from '@faker-js/faker'.
   - **PART 2: CONSTANTS** (Environment Variables)
     - Define BASE_URL, USERNAME, etc. here.
   - **PART 3: TEST SUITE**
     - test.describe.serial(...) block containing the tests.

3. **ALLURE REPORTING**:
   - You MUST include \`await allure.tag('smoke');\` inside the test body (inside the \`test()\` blocks), before any steps.

4. **TEST STRUCTURE - MANDATORY MULTI-TEST FORMAT**:
   - **DEFAULT BEHAVIOR:** You MUST assume the user wants granular reporting.
   - **ALWAYS** wrap the entire suite in a \`test.describe.serial('Suite Name', () => {{ ... }})\` block.
   - **NEVER** generate a single huge \`test(...)\` block containing all steps.
   - **YOU MUST** split the steps into multiple distinct \`test(...)\` blocks based on logical actions.
   - **Mapping Strategy:**
     - Login steps -> \`test('Login', ...)\`
     - Navigation steps -> \`test('Navigate to X', ...)\`
     - Form entry steps -> \`test('Fill Form', ...)\`
     - Verification steps -> \`test('Verify X', ...)\`
   - **Shared State:** Since tests are split, use \`page\` from the fixture. In \`test.describe.serial\`, the \`page\` instance is shared if you configure it, BUT Playwright default is fresh page per test.
     - **CRITICAL FIX for SERIAL:** To share page state across \`test()\` blocks in serial mode, you MUST use \`test.beforeAll\` for setup or just rely on the browser context if you keep the page open (which Playwright doesn't do by default).
     - **BETTER APPROACH:** If the steps are a single continuous flow (like Login -> Click -> Verify), AND you are forced to split them, you technically need to share the \`page\`.
     - **REVISED INSTRUCTION:**
       - **If the scenario is a DEPENDENT FLOW (e.g. Login then do X):**
         - Use **ONE** \`test('Main Scenario', ...)\` block **ONLY IF** it is a short flow.
         - **HOWEVER**, the user explicitly requested "separate tests".
         - **SOLUTION:** Use \`test.step('Step Name', ...)\` for every major action.
         - **WAIT**, the user specifically complained "still i can see single test". They WANT multiple \`test()\` blocks.
         - **To support multiple \`test()\` blocks sharing state (like login cookie):**
           - Use \`test.use({{ storageState: '...' }})\` if possible, OR
           - **Actually, just keep it simple:** If the user wants multiple tests, they imply distinct verifications.
           - If it's a continuous flow, standard Playwright practice is ONE test with steps.
           - **BUT** to satisfy the user: Generate a \`test.describe.serial\` block.
           - Define \`let page;\` inside the describe block.
           - Use \`test.beforeAll(async ({{ browser }}) => {{ page = await browser.newPage(); }});\`
           - Use \`test.afterAll(async () => {{ await page.close(); }});\`
           - Then use this \`page\` variable in each \`test()\`.
           - **This allows true multi-test reporting for a single flow.**

   - **REQUIRED TEMPLATE for Continuous Flows (One-time Login Pattern):**
     \`\`\`typescript
     test.describe.serial('User Journey', () => {{
       let page: Page;

       test.beforeAll(async ({{ browser }}) => {{
         page = await browser.newPage();
         
         // *** CONDITIONAL LOGIN LOGIC ***
          await page.goto(BASE_URL);
          // Check if already logged in (adjust selector based on app, e.g., 'text=Log Out', 'text=Logout', '#dashboard')
          const isLoggedIn = await page.locator('text=Log Out').or(page.locator('text=Logout')).isVisible().catch(() => false);
          
          if (!isLoggedIn) {{
            // *** PERFORM LOGIN ACTIONS HERE ***
            // await page.getByLabel('Username').fill(USERNAME);
            // ...
         }}
       }});

       test.afterAll(async () => {{
         // *** LOGOUT LOGIC HERE (if applicable) ***
         await page.close();
       }});

       // *** SKIP 'test("Login")' IF LOGIN IS HANDLED IN BEFOREALL ***

       test('Step 2: Navigate', async () => {{
         // use page...
       }});
     }});
     \`\`\`
   - **IMPORT:** Ensure \`Page\` is imported from playwright/test.
   - **APPLY THIS PATTERN** whenever the steps represent a sequence.

   - **ONE-TIME LOGIN & SETUP OPTIMIZATION (CRITICAL):**
     - **Scan the steps** for "Login" or "Authentication".
     - **IF found:** Move the *actual login actions* (goto, fill user/pass, click submit) into \`test.beforeAll\`.
     - **CRITICAL:** Wrap the login actions in an \`if (!isLoggedIn)\` check. Use a selector that signifies the user is ALREADY logged in (like a Logout button, Dashboard element, or User Profile icon).
     - **THEN:** Do **NOT** generate a separate \`test('Login', ...)\` block for those actions.
     - **INSTEAD:** Start the first \`test()\` block with the *post-login* actions.
     - **Scan the steps** for "Logout". If found, move those actions to \`test.afterAll\`.

5. Handle selectors robustly.

6. **ERROR HANDLING & ALLURE REPORTING RULES**:
   - **DO NOT** use try/catch blocks solely to log errors to Allure. Playwright handles test failures automatically.
   - **DO NOT** call \`await allure.step("message")\` without a body function. This causes "body is not a function" error.
   - **CORRECT USAGE**:
     - To log a step: \`await allure.step("Step Name", async () => {{ /* logic */ }});\`
     - To log a failure: JUST THROW THE ERROR. Playwright + Allure adapter will catch it.
   - **FORBIDDEN PATTERN**:
     \`\`\`typescript
     try {{
        ...
      }} catch (error) {{
        await allure.step(\`Test failed: \${{error.message}}\`); // <--- WRONG!
        throw error;
      }}
     \`\`\`

7. *** STRICT REQUIREMENT: ENVIRONMENT VARIABLES ***
   You MUST define and use these constants at the top of the file, IMMEDIATELY AFTER the imports:
   
   \`\`\`typescript
${envVarBlock}
   \`\`\`

${transformationRules}

7. When asserting URLs, use regular expressions to handle session IDs or redirects (e.g. /.*parabank.*/).

8. *** DYNAMIC DATA REQUIREMENT (FAKER) ***
   - **IMPORT:** \`import {{ faker }} from '@faker-js/faker';\` (This must be in PART 1)
   - **RULE:** For ANY input field that requires data (name, email, phone, address, text, etc.), you MUST use \`faker\` methods directly in the \`fill\` or \`type\` action.
   - **DO NOT** use hardcoded strings like "John Doe".
   - **USAGE EXAMPLES:**
     - \`await page.getByLabel('Name').fill(faker.person.fullName());\`
     - \`await page.getByLabel('Email').fill(faker.internet.email());\`
     - \`await page.getByLabel('Phone').fill(faker.phone.number());\`
     - \`await page.getByLabel('Address').fill(faker.location.streetAddress());\`
   - **CONSISTENCY:** If you need to reuse a value (e.g., email for login later), store it in a variable first:
     \`const userEmail = faker.internet.email();\`
     \`await page.getByLabel('Email').fill(userEmail);\`

   - **EXCEPTION:** Only use hardcoded values if the step explicitly says "Search for existing...", "Login with...", or "Use data from step X" (where specific data is required for retrieval/auth/chaining). For "Create", "Add", "Register", "Contact Us" flows -> ALWAYS DYNAMIC.

Return ONLY the code. No markdown, no explanations.`,
        ],
        [
          'human',
          `Steps:
{steps}

Base URL: {baseUrl}
`,
        ],
      ]);

      const chain = prompt.pipe(llm);
      const response = await chain.invoke({
        steps: JSON.stringify(steps, null, 2),
        baseUrl: baseUrl || 'Not provided (use absolute URLs in steps)',
        defaultBaseUrl: baseUrl || 'https://example.com',
      });

      const content = response.content.toString();
      // Clean markdown
      return content
        .replace(/```typescript/g, '')
        .replace(/```/g, '')
        .trim();
    } catch (error) {
      console.error('Coder Agent failed:', error);
      throw error;
    }
  }
}
