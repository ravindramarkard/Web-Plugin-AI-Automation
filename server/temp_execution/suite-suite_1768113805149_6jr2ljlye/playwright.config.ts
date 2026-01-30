import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir:
    '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/suite-suite_1768113805149_6jr2ljlye',
  timeout: 30000,
  workers: undefined,
  reporter: [
    [
      'json',
      {
        outputFile:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768113805149_6jr2ljlye/report.json',
      },
    ],
    [
      'html',
      {
        outputFolder:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768113805149_6jr2ljlye',
        open: 'never',
      },
    ],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/suite_1768113805149_6jr2ljlye',
      },
    ],
  ],
  use: {
    headless: true,
    browserName: 'chromium',
    baseURL: 'https://parabank.parasoft.com/parabank/index.htm',
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
