import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import db from '../db/index.js';
import { createLLM } from '../lib/llm.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import yaml from 'js-yaml';

const router: express.Router = express.Router();
const execAsync = util.promisify(exec);

router.post('/codegen', async (req, res) => {
  try {
    const { url, name, projectId, testSuiteId } = req.body;

    if (!url || !name || !projectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tempDir = path.join(process.cwd(), 'temp_codegen');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const outputFile = path.join(tempDir, `codegen_${timestamp}.spec.ts`);

    // Command to launch playwright codegen
    // We assume the server is running locally on the user's machine where the browser can pop up.
    const command = `npx playwright codegen "${url}" --output "${outputFile}"`;

    console.log(`[TestGen] Starting codegen: ${command}`);

    // This awaits until the codegen process exits (user closes the window)
    // We use a long timeout (e.g. 1 hour) because the user might take time recording
    // standard exec has a buffer limit, but we redirect output so it shouldn't be an issue?
    // Actually exec buffers stdout/stderr. playwright codegen outputs code to file.
    // The stdout might contain logs.
    await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

    console.log(`[TestGen] Codegen finished. Reading output...`);

    if (fs.existsSync(outputFile)) {
      const generatedCode = fs.readFileSync(outputFile, 'utf-8');

      // Save to DB
      const testCaseId = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const now = Date.now();

      // If no testSuiteId provided, try to find "Unassigned" or default suite
      let finalSuiteId = testSuiteId;
      if (!finalSuiteId) {
        const unassigned = db
          .prepare('SELECT id FROM test_suites WHERE projectId = ? AND name = ?')
          .get(projectId, 'Unassigned') as any;
        if (unassigned) {
          finalSuiteId = unassigned.id;
        } else {
          // Create Unassigned suite
          finalSuiteId = `suite_${now}_gen`;
          db.prepare(
            'INSERT INTO test_suites (id, projectId, name, description, testType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ).run(finalSuiteId, projectId, 'Unassigned', 'Generated Tests', 'UI Tests', now, now);
        }
      }

      db.prepare(
        `
        INSERT INTO test_cases (id, testSuiteId, name, description, prompt, status, testType, playwrightCode, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        testCaseId,
        finalSuiteId,
        name,
        `Generated from ${url}`,
        `Record test from ${url}`,
        'pending',
        'UI Tests',
        generatedCode,
        now,
        now,
      );

      // Cleanup
      fs.unlinkSync(outputFile);

      res.json({ success: true, testCaseId });
    } else {
      res.status(500).json({ error: 'Output file not generated' });
    }
  } catch (error: any) {
    console.error('TestGen Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/parse-swagger', async (req, res) => {
  try {
    const { url, source, content, authType, authToken, username, password } = req.body;
    let spec;

    console.log(`[TestGen] Parsing Swagger from ${source}: ${url || 'content provided'}`);

    if (source === 'url' && url) {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (authType === 'Bearer Token' && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      if (authType === 'Basic Auth' && username && password) {
        const credentials = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch Swagger: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error(
          'The URL returned HTML instead of JSON. Please ensure you are providing the direct URL to the swagger.json file, not the Swagger UI page.',
        );
      }

      const text = await response.text();
      try {
        spec = JSON.parse(text);
      } catch (e) {
        try {
          spec = yaml.load(text);
        } catch (yamlError) {
          throw new Error('Failed to parse response as JSON or YAML.');
        }
      }
    } else if (source === 'text' && content) {
      try {
        spec = JSON.parse(content);
      } catch (e) {
        try {
          spec = yaml.load(content);
        } catch (yamlError) {
          throw new Error('Failed to parse content as JSON or YAML.');
        }
      }
    } else {
      throw new Error('Invalid source or missing content');
    }

    // Basic Parsing
    const endpoints: any[] = [];
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, details] of Object.entries(methods as any)) {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
            const d = details as any;
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: d.summary || '',
              description: d.description || '',
              operationId: d.operationId || '',
              parameters: d.parameters || [],
              responses: d.responses || {},
            });
          }
        }
      }
    }

    res.json({ success: true, endpoints, info: spec.info });
  } catch (error: any) {
    console.error('[TestGen] Swagger parse error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-api-tests', async (req, res) => {
  try {
    const {
      projectId,
      endpoints,
      testName,
      testFramework,
      generationMode,
      variationTypes,
      additionalInstructions,
      authDetails,
      baseUrl,
    } = req.body;

    if (!projectId || !endpoints || endpoints.length === 0) {
      return res.status(400).json({ error: 'Missing required fields (projectId, endpoints)' });
    }

    console.log(
      `[TestGen] Generating API tests (${generationMode || 'independent'}) for ${endpoints.length} endpoints using ${testFramework}`,
    );

    const llm = await createLLM('test_generator', projectId);

    const endpointsContext = endpoints
      .map(
        (ep: any) => `
Method: ${ep.method}
Path: ${ep.path}
Summary: ${ep.summary}
Description: ${ep.description}
Parameters: ${JSON.stringify(ep.parameters)}
Responses: ${JSON.stringify(ep.responses)}
`,
      )
      .join('\n---\n');

    const authContext = authDetails
      ? `
Authentication Type: ${authDetails.type}
${authDetails.type === 'Bearer Token' ? 'Use a placeholder for the Bearer Token.' : ''}
${authDetails.type === 'Basic Auth' ? 'Use placeholders for Username and Password.' : ''}
${authDetails.type === 'API Key' ? 'Use a placeholder for the API Key.' : ''}
Note: Do not hardcode secrets. Use environment variables (process.env.API_TOKEN, etc.).
`
      : 'No authentication required.';

    let guidelines = `
1. Use the provided Base URL: ${baseUrl || 'http://localhost:3000'} (or use a variable).
2. Handle authentication as described.
3. Use descriptive test names.
4. Add comments explaining the test logic.
5. Return ONLY the code, without Markdown formatting or explanations.
6. Ensure all imports are correct for the chosen framework.
7. **CRITICAL: Use Dynamic Data for Input Fields.**
   - NEVER use hardcoded constant values for fields that require uniqueness (e.g., email, username, phone, IDs).
   - Use dynamic value generation logic within the script.
     - For TypeScript (Playwright/Jest/Axios): Use \`Date.now()\`, \`Math.random()\`, or helper functions.
       Example: \`const uniqueEmail = \`test_\${Date.now()}@example.com\`;\`
     - For Java (Rest Assured): Use \`System.currentTimeMillis()\` or \`UUID.randomUUID()\`.
       Example: \`String uniqueEmail = "test_" + System.currentTimeMillis() + "@example.com";\`
   - This ensures tests can run repeatedly without failing due to "Duplicate Entry" errors.
`;

    if (generationMode === 'e2e') {
      guidelines += `
8. **CRITICAL: Generate a chained E2E scenario.**
   - Analyze the provided endpoints to identify logical dependencies (e.g., Create -> Get -> Update -> Delete).
   - Pass data from one step to the next (e.g., extract ID from 'Create' response and use it in 'Get'/'Update'/'Delete').
   - Maintain state between requests using variables.
   - Ensure the flow represents a real user journey.
   - Do NOT just generate isolated tests for each endpoint.
`;
    } else if (generationMode === 'variations') {
      const selectedVariations =
        variationTypes && variationTypes.length > 0 ? variationTypes.join(', ') : 'Happy Path, Negative Testing';
      guidelines += `
8. **CRITICAL: Generate comprehensive Test Variations.**
   - For EACH endpoint, generate multiple test scenarios based on the user's selection: **${selectedVariations}**.
   - **Specific Instructions per Type:**
     ${variationTypes?.includes('Happy Path') ? '- **Happy Path:** Valid inputs, expected success responses (200 OK).' : ''}
     ${variationTypes?.includes('Edge Cases') ? '- **Edge Cases:** Empty strings, max length, special characters, null values.' : ''}
     ${variationTypes?.includes('Performance Tests') ? '- **Performance Tests:** Measure response time (e.g., expect < 200ms).' : ''}
     ${variationTypes?.includes('Data Validation') ? '- **Data Validation:** Verify response schema types, required fields, and formats.' : ''}
     ${variationTypes?.includes('Error Cases') ? '- **Error Cases:** Simulate 400, 404, 500 scenarios (invalid IDs, missing params).' : ''}
     ${variationTypes?.includes('Security Tests') ? '- **Security Tests:** Test unauthorized access, invalid tokens, SQL injection patterns.' : ''}
     ${variationTypes?.includes('Boundary Conditions') ? '- **Boundary Conditions:** Min/max values for numbers, array lengths.' : ''}
   - Use Data-Driven testing (parameterized tests) to efficiently cover these variations.
   - Aim for high code coverage of the endpoint's validation logic.
`;
    } else {
      guidelines += `
8. For each endpoint, generate at least one positive test case (200 OK) and one negative test case (e.g., 400 Bad Request, 401 Unauthorized) if applicable.
9. Tests should be independent where possible.
`;
    }

    const language = testFramework === 'Rest Assured + TestNG' ? 'Java' : 'TypeScript';

    const systemPrompt = `You are an expert QA Automation Engineer specializing in API testing.
Your task is to generate a robust, production-ready automated test suite for the provided API endpoints.

Target Framework: ${testFramework}
Language: ${language}

Guidelines:
${guidelines}
`;

    const userPrompt = `
Generate a test suite named "${testName}" for the following endpoints:

${endpointsContext}

Authentication Details:
${authContext}

Additional Instructions:
${additionalInstructions || 'None'}

Please generate the complete code file.
`;

    const response = await llm.invoke([new SystemMessage(systemPrompt), new HumanMessage(userPrompt)]);

    let generatedCode = response.content as string;

    // Clean up code blocks if present
    if (generatedCode.startsWith('```')) {
      generatedCode = generatedCode.replace(/^```(typescript|ts|java|javascript|js)?\n/, '').replace(/\n```$/, '');
    }

    // Save to DB
    const testCaseId = `tc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();

    // Find or create 'Generated API Tests' suite
    let finalSuiteId;
    const suiteName = 'Generated API Tests';
    const existingSuite = db
      .prepare('SELECT id FROM test_suites WHERE projectId = ? AND name = ?')
      .get(projectId, suiteName) as any;

    if (existingSuite) {
      finalSuiteId = existingSuite.id;
    } else {
      finalSuiteId = `suite_${now}_api_gen`;
      db.prepare(
        'INSERT INTO test_suites (id, projectId, name, description, testType, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(finalSuiteId, projectId, suiteName, 'AI Generated API Tests', 'API Tests', now, now);
    }

    let description = `Generated API tests for ${endpoints.length} endpoints`;
    if (generationMode === 'e2e') {
      description += ' (E2E Suite)';
    } else if (generationMode === 'variations' && variationTypes && variationTypes.length > 0) {
      description += ` (Variations: ${variationTypes.join(', ')})`;
    }

    db.prepare(
      `
      INSERT INTO test_cases (id, testSuiteId, name, description, prompt, status, testType, playwrightCode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      testCaseId,
      finalSuiteId,
      testName,
      description,
      userPrompt,
      'pending', // Status
      'API Tests',
      generatedCode,
      now,
      now,
    );

    res.json({ success: true, testCaseId, generatedCode });
  } catch (error: any) {
    console.error('[TestGen] Generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
