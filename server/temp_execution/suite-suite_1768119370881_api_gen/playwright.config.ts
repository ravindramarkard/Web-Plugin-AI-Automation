import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir:
    '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/suite-suite_1768119370881_api_gen',
  timeout: 30000,
  workers: 1,
  reporter: [
    [
      'json',
      {
        outputFile:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768119370881_api_gen/report.json',
      },
    ],
    [
      'html',
      {
        outputFolder:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768119370881_api_gen',
        open: 'never',
      },
    ],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/suite_1768119370881_api_gen',
      },
    ],
  ],
  use: {
    headless: false,
    browserName: 'chromium',
    baseURL: 'http://localhost:5050',
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
