import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution',
  timeout: 30000, // Disable timeout in debug mode
  reporter: [
    ['json'],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/case_1768134437243_slmi1cbh9',
      },
    ],
  ],
  use: {
    headless: false,
    browserName: 'chromium',
    baseURL: undefined,
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
