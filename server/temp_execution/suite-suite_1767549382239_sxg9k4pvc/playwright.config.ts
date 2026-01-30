import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:
    '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/suite-suite_1767549382239_sxg9k4pvc',
  timeout: 30000,
  reporter: [
    [
      'json',
      {
        outputFile:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1767549382239_sxg9k4pvc/report.json',
      },
    ],
    [
      'html',
      {
        outputFolder:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/public/reports/playwright/suite_1767549382239_sxg9k4pvc',
        open: 'never',
      },
    ],
    [
      'allure-playwright',
      {
        resultsDir:
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution/allure-results/suite_1767549382239_sxg9k4pvc',
      },
    ],
  ],
  use: {
    headless: true,
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
