import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution',
  timeout: 0, // Disable timeout in debug mode
  reporter: [
    ['json'],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/case_1768849166825_x9e9l490b',
      },
    ],
  ],
  use: {
    headless: false,
    browserName: 'chromium',
    baseURL: 'https://parabank.parasoft.com/parabank/index.htm',
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
