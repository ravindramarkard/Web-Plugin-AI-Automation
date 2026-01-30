import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir:
    '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/suite-suite_1768115650530_ly0m7odb5',
  timeout: 30000,
  workers: 1,
  reporter: [
    [
      'json',
      {
        outputFile:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768115650530_ly0m7odb5/report.json',
      },
    ],
    [
      'html',
      {
        outputFolder:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768115650530_ly0m7odb5',
        open: 'never',
      },
    ],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/suite_1768115650530_ly0m7odb5',
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
