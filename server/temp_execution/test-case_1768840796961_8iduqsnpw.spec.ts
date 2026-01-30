import { test } from './custom-test';
import { expect } from '@playwright/test';

test('register link', async ({ page, request }) => {
  import { test } from './custom-test';
  import { expect } from '@playwright/test';
  import * as allure from 'allure-js-commons';

  test.describe('Parabank Registration Link Test', () => {
    test('should click the registration link', async ({ page }) => {
      // Define environment variables with fallbacks
      const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || 'https://parabank.parasoft.com';
      const USERNAME = process.env.TEST_USERNAME || process.env.USERNAME || 'testuser';
      const PASSWORD = process.env.TEST_PASSWORD || process.env.PASSWORD || 'password';

      console.log(`Starting test with BASE_URL: ${BASE_URL}`);
      console.log(`Using credentials: ${USERNAME} / ${PASSWORD}`);

      // Step 1: Navigate to the Parabank homepage
      await test.step('Navigate to Parabank homepage', async () => {
        try {
          console.log('Navigating to:', BASE_URL);
          await page.goto(BASE_URL, { waitUntil: 'networkidle' });
          await page.waitForLoadState('networkidle');
          console.log('Navigation completed');

          // Verify we're on the correct page by checking for a known element
          // Use a more robust selector that works with the actual Parabank site
          const header = page.locator('h1, h2, h3').filter({ hasText: 'ParaBank' });
          await header.waitFor({ state: 'visible', timeout: 15000 });
          console.log('Homepage loaded successfully');
        } catch (error) {
          console.error('Navigation failed:', error);
          throw error;
        }
      });

      // Step 2: Click the registration link
      await test.step('Click registration link', async () => {
        try {
          // The registration link is typically labeled "Register" and is an anchor tag
          // We'll use multiple selector strategies for robustness
          let registrationLink = page.getByRole('link', { name: 'Register' });

          // Fallback selectors if the primary one doesn't work
          console.log('Looking for registration link...');

          // Wait for the link to be visible
          await registrationLink.waitFor({ state: 'visible', timeout: 15000 });

          // Verify the link exists before clicking
          await expect(registrationLink).toBeVisible();
          console.log('Registration link found');

          // Click the registration link
          await registrationLink.click();
          console.log('Registration link clicked');

          // Wait for navigation to registration page
          await page.waitForLoadState('networkidle');

          // Verify we're on the registration page by checking for a form or heading
          const registrationHeader = page.locator('h1, h2, h3').filter({ hasText: 'Register' });
          await registrationHeader.waitFor({ state: 'visible', timeout: 15000 });
          console.log('Successfully navigated to registration page');

          // Additional assertion to confirm we're on the right page
          await expect(page).toHaveURL(/.*register/);
          console.log('URL verification passed');
        } catch (error) {
          console.error('Failed to click registration link:', error);
          throw error;
        }
      });
    });
  });
});
