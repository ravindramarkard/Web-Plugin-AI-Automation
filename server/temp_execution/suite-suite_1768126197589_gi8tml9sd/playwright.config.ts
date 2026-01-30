import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir:
    '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/suite-suite_1768126197589_gi8tml9sd',
  timeout: 30000,
  workers: 1,
  reporter: [
    [
      'json',
      {
        outputFile:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768126197589_gi8tml9sd/report.json',
      },
    ],
    [
      'html',
      {
        outputFolder:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1768126197589_gi8tml9sd',
        open: 'never',
      },
    ],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/suite_1768126197589_gi8tml9sd',
      },
    ],
  ],
  use: {
    headless: true,
    browserName: 'chromium',
    baseURL: 'https://parabank.parasoft.com/parabank/login.htm',
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
