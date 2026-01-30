import { test as base } from '@playwright/test';

export const test = base.extend({
  request: async ({ request }, use, testInfo) => {
    const wrappedRequest = new Proxy(request, {
      get: (target, prop, receiver) => {
        const originalMethod = Reflect.get(target, prop, receiver);
        if (
          typeof originalMethod === 'function' &&
          ['get', 'post', 'put', 'delete', 'patch', 'head', 'fetch'].includes(prop as string)
        ) {
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
                  options.headers['Authorization'] = `Bearer ${process.env.TEST_AUTH_TOKEN}`;
                }
              } else if (authType === 'Basic Auth') {
                const username = process.env.TEST_AUTH_USERNAME;
                const password = process.env.TEST_AUTH_PASSWORD;
                if (username && password) {
                  if (!options.headers) options.headers = {};
                  if (!options.headers['Authorization']) {
                    const b64 = Buffer.from(`${username}:${password}`).toString('base64');
                    options.headers['Authorization'] = `Basic ${b64}`;
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
                data: options.data,
              };
              await testInfo.attach(`Request: ${method} ${url}`, {
                body: JSON.stringify(reqData, null, 2),
                contentType: 'application/json',
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

              await testInfo.attach(`Response: ${response.status()} ${method} ${url}`, {
                body: responseBody,
                contentType: responseContentType,
              });
            } catch (e) {
              console.error('Failed to attach response log', e);
            }

            return response;
          };
        }
        return originalMethod;
      },
    });

    await use(wrappedRequest);
  },
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

  const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id*="pass"]'];
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
