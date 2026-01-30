import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Register Link Navigation Test', () => {
  test('should navigate to registration page when clicking register link', async ({ page }) => {
    // Start allure test
    await allure.step('Starting register link navigation test', async () => {
      console.log('Starting test: register link navigation');
    });

    try {
      // Navigate to the base URL
      await test.step('Navigate to Parabank homepage', async () => {
        console.log('Navigating to: https://parabank.parasoft.com');
        await page.goto('https://parabank.parasoft.com');
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Verify we're on the correct page
      await test.step('Verify we are on the correct homepage', async () => {
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);
        expect(currentUrl).toContain('https://parabank.parasoft.com');
      });

      // Find and click the register link
      await test.step('Click on the Register link', async () => {
        console.log('Looking for register link...');

        // Try to find the register link using various selectors
        let registerLink = null;

        // Try by text content first
        registerLink = page.locator('a:has-text("Register")');
        if ((await registerLink.count()) > 0) {
          console.log('Found register link by text content');
        } else {
          // Try by href
          registerLink = page.locator('a[href*="register"]');
          if ((await registerLink.count()) > 0) {
            console.log('Found register link by href');
          } else {
            // Try by role and name
            registerLink = page.getByRole('link', { name: 'Register' });
            if ((await registerLink.count()) > 0) {
              console.log('Found register link by role and name');
            } else {
              // Try by css class
              registerLink = page.locator('.register');
              if ((await registerLink.count()) > 0) {
                console.log('Found register link by css class');
              } else {
                // Try by xpath as last resort
                registerLink = page.locator('xpath=//a[contains(text(), "Register")]');
                if ((await registerLink.count()) > 0) {
                  console.log('Found register link by xpath');
                }
              }
            }
          }
        }

        // Verify the link exists and is visible
        if ((await registerLink.count()) === 0) {
          throw new Error('Register link not found using any selector strategy');
        }

        await registerLink.first().waitFor({ state: 'visible', timeout: 15000 });
        console.log('Register link is visible and ready to click');

        // Click the register link
        await registerLink.first().click();
        console.log('Clicked on register link');
      });

      // Wait for navigation to registration page
      await test.step('Wait for navigation to registration page', async () => {
        console.log('Waiting for navigation to registration page...');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        console.log(`Navigation complete. Current URL: ${currentUrl}`);

        // Verify we've navigated to the registration page
        expect(currentUrl).toContain('register');
        expect(currentUrl).toContain('parabank.parasoft.com');
      });

      // Verify registration form is visible
      await test.step('Verify registration form is visible', async () => {
        console.log('Checking if registration form is visible...');

        // Look for key elements of the registration form
        const firstNameField = page.locator('input[name="customer.firstName"]');
        const lastNameField = page.locator('input[name="customer.lastName"]');
        const usernameField = page.locator('input[name="customer.username"]');
        const passwordField = page.locator('input[name="customer.password"]');
        const confirmPasswordField = page.locator('input[name="repeatedPassword"]');

        // Wait for these elements to be visible
        await firstNameField.waitFor({ state: 'visible', timeout: 15000 });
        await lastNameField.waitFor({ state: 'visible', timeout: 15000 });
        await usernameField.waitFor({ state: 'visible', timeout: 15000 });
        await passwordField.waitFor({ state: 'visible', timeout: 15000 });
        await confirmPasswordField.waitFor({ state: 'visible', timeout: 15000 });

        console.log('All registration form fields are visible');

        // Verify the form contains expected fields
        await expect(firstNameField).toBeVisible();
        await expect(lastNameField).toBeVisible();
        await expect(usernameField).toBeVisible();
        await expect(passwordField).toBeVisible();
        await expect(confirmPasswordField).toBeVisible();

        console.log('Registration form validation completed successfully');
      });

      // Add success assertion
      await test.step('Verify task completion', async () => {
        const currentUrl = page.url();
        expect(currentUrl).toBe('https://parabank.parasoft.com/parabank/register.htm');
        console.log('Successfully completed the task. Navigated to registration page and form is visible.');
      });
    } catch (error) {
      console.error('Test failed with error:', error);
      await allure.step(`Test failed: ${error.message}`, async () => {
        throw error;
      });
    }
  });
});
