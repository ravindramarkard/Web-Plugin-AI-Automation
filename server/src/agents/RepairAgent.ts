import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createLLM } from '../lib/llm.js';

export class RepairAgent {
  async repairStep(
    code: string,
    error: string,
    domSnapshot?: string,
    lastAction?: string,
    projectId?: string,
  ): Promise<{ fixedCode: string; explanation: string } | null> {
    try {
      const llm = await createLLM('repair', projectId);

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `You are an expert Playwright automation engineer. Your goal is to fix failing Playwright test code.
You will be provided with:
1. The failing Playwright code snippet.
2. The error message.
3. The DOM snapshot (optional, but helpful for selector issues).
4. The last attempted action.

Analyze the error and the DOM. Determine why the test failed (e.g., selector not found, timeout, element not interactable).
Then, provide the CORRECTED code snippet that fixes the issue.
IMPORTANT: You MUST use environment variables for base URL and credentials.
- Preserve existing \`process.env\` usage.
- If hardcoded values exist, REPLACE them with \`process.env\` constants (BASE_URL, USERNAME, PASSWORD).
  Example: Change \`page.goto('https://parabank.parasoft.com')\` to \`page.goto(BASE_URL)\`.

- **DUPLICATE DATA ERRORS**:
  - If the error indicates a unique constraint violation (e.g., "Duplicate entry", "Username already exists"), fix the code to use DYNAMIC DATA.
  - Replace hardcoded strings with dynamic generation:
    - \`const username = \`user_\${{Date.now()}}\`;\`

Return ONLY a valid JSON object with the following structure:
{{
  "fixedCode": "The COMPLETE corrected Playwright code snippet. If the input was a full file, return the full file. If it was just steps, return the full set of steps including the fix.",
  "explanation": "A CONCISE explanation (max 2 sentences) of why it failed and how you fixed it. Do NOT repeat the code or DOM here."
}}
Do not include any markdown formatting or code blocks in the JSON output.
IMPORTANT: Ensure the JSON is valid and not truncated. Do not output extremely long strings.`,
        ],
        [
          'human',
          `Failing Code:
{code}

Error Message:
{error}

Last Action:
{lastAction}

DOM Snapshot (truncated):
{domSnapshot}`,
        ],
      ]);

      const chain = prompt.pipe(llm);
      // Reduce DOM snapshot size to prevent context overflow and hallucinations
      const maxDomSize = 5000;
      const response = await chain.invoke({
        code,
        error,
        lastAction: lastAction || 'Unknown',
        domSnapshot: domSnapshot ? domSnapshot.substring(0, maxDomSize) : 'Not provided',
      });

      const content = response.content.toString();
      // clean up potential markdown code blocks if the LLM ignores instructions
      const cleanContent = content
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      try {
        return JSON.parse(cleanContent);
      } catch (e) {
        console.error('Failed to parse JSON from Repair Agent:', e);
        console.log('Raw content length:', cleanContent.length);
        console.log('Raw content start:', cleanContent.substring(0, 500));
        console.log('Raw content end:', cleanContent.substring(cleanContent.length - 500));

        // Attempt to repair truncated JSON if possible (simple case)
        if (e instanceof SyntaxError && e.message.includes('Unterminated string')) {
          throw new Error('Repair Agent response was truncated or too large. Please try again or check logs.');
        }
        throw e;
      }
    } catch (error) {
      console.error('Repair Agent failed:', error);
      throw error;
    }
  }
}
