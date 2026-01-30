import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Register Link Test', () => {
  test('should navigate to registration page via register link', async ({ page }) => {
    // Set up allure report
    await allure.feature('Navigation');
    await allure.story('Register Link');
    await allure.description('Test that clicking the register link navigates to the registration page');

    try {
      // Step 1: Navigate to the base URL
      await test.step('Navigate to Parabank home page', async () => {
        console.log('Navigating to https://parabank.parasoft.com');
        await page.goto('https://parabank.parasoft.com');
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Step 2: Click on the register link
      await test.step('Click on register link', async () => {
        console.log('Looking for register link');

        // Try to find the register link using various reliable selectors
        let registerLink = null;

        // Try by text content first (most reliable for this case)
        registerLink = page.getByRole('link', { name: 'Register' });
        if (await registerLink.isVisible({ timeout: 5000 })) {
          console.log('Found register link by role and text');
        } else {
          // Try by href
          registerLink = page.locator('a[href*="register"]');
          if (await registerLink.isVisible({ timeout: 5000 })) {
            console.log('Found register link by href');
          } else {
            // Try by text content using locator
            registerLink = page.locator('a:has-text("Register")');
            if (await registerLink.isVisible({ timeout: 5000 })) {
              console.log('Found register link by text content');
            } else {
              // Last resort: try to find any link that contains 'register' in href or text
              registerLink = page.locator('a').filter({ hasText: /register/i });
              if (await registerLink.isVisible({ timeout: 5000 })) {
                console.log('Found register link by case-insensitive text filter');
              }
            }
          }
        }

        // Verify we found a valid register link
        if (!registerLink || !(await registerLink.isVisible())) {
          throw new Error('Register link not found using any reliable selector');
        }

        // Get the href before clicking for verification
        const href = await registerLink.getAttribute('href');
        console.log(`Register link href: ${href}`);

        // Click the register link
        await registerLink.click();
        console.log('Clicked on register link');
      });

      // Step 3: Verify navigation to registration page
      await test.step('Verify navigation to registration page', async () => {
        console.log('Waiting for navigation to registration page');
        await page.waitForLoadState('networkidle');

        // Verify we're on the registration page
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        // Check if URL contains register path
        if (!currentUrl.includes('/register.htm')) {
          throw new Error(`Expected to be on registration page, but URL is: ${currentUrl}`);
        }

        // Verify registration form is visible
        const registrationForm = page.locator('form').filter({ hasText: /registration|register/i });
        if (await registrationForm.isVisible()) {
          console.log('Registration form is visible');
        } else {
          console.log('Registration form not found, but navigation appears successful');
        }
      });

      // Add assertion to verify the task completion
      await expect(page).toHaveURL(/.*register\.htm/);

      console.log('Successfully completed the task. Navigated to registration page.');
    } catch (error) {
      console.error('Test failed:', error.message);
      await allure.attachment('Error screenshot', await page.screenshot(), 'image/png');
      throw error;
    }
  });
});
