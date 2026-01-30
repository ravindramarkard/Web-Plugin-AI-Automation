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
  const headless =
    defaultProject && defaultProject.use && typeof defaultProject.use.headless === 'boolean'
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
