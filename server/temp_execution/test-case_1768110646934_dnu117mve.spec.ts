import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Register Link Navigation Test', () => {
  test('should navigate to registration page when clicking register link', async ({ page }) => {
    // Start allure step for test description
    await allure.description(
      'Navigate to Parabank homepage and click the Register link to access the registration page',
    );

    try {
      // Step 1: Navigate to the base URL
      await test.step('Navigate to Parabank homepage', async () => {
        console.log('Navigating to: https://parabank.parasoft.com');
        await page.goto('https://parabank.parasoft.com');

        // Wait for page to load completely
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Step 2: Click on the Register link
      await test.step('Click on Register link', async () => {
        console.log('Looking for Register link...');

        // Try multiple selector strategies in order of preference
        let registerLink = null;

        // Strategy 1: Look for link with text "Register" using role
        try {
          registerLink = page.getByRole('link', { name: 'Register' });
          await registerLink.waitFor({ state: 'visible', timeout: 5000 });
          console.log('Found Register link using role selector');
        } catch (e) {
          console.log('Register link not found using role selector, trying text selector...');
        }

        // Strategy 2: Look for link with exact text "Register"
        if (!registerLink || !(await registerLink.isVisible())) {
          try {
            registerLink = page.locator('a:has-text("Register")');
            await registerLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Register link using text selector');
          } catch (e) {
            console.log('Register link not found using text selector, trying href selector...');
          }
        }

        // Strategy 3: Look for link with href containing register
        if (!registerLink || !(await registerLink.isVisible())) {
          try {
            registerLink = page.locator('a[href*="register"]');
            await registerLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Register link using href selector');
          } catch (e) {
            console.log('Register link not found using href selector, trying class selector...');
          }
        }

        // Strategy 4: Look for link with specific class (if exists)
        if (!registerLink || !(await registerLink.isVisible())) {
          try {
            registerLink = page.locator('a.register, a#register, a.btn-register');
            await registerLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Register link using class selector');
          } catch (e) {
            console.log('Register link not found using class selector, trying XPath...');
          }
        }

        // Strategy 5: Use XPath as last resort
        if (!registerLink || !(await registerLink.isVisible())) {
          try {
            registerLink = page.locator('//a[contains(text(), "Register")]');
            await registerLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Register link using XPath selector');
          } catch (e) {
            console.log('Register link not found using XPath selector');
          }
        }

        // Verify we found a valid link
        if (!registerLink || !(await registerLink.isVisible())) {
          throw new Error('Register link not found using any selector strategy');
        }

        // Verify the link points to the correct registration page
        const href = await registerLink.getAttribute('href');
        console.log(`Register link href: ${href}`);

        if (!href || !href.includes('register')) {
          console.warn('Register link href does not contain "register" - proceeding anyway');
        }

        // Click the register link
        console.log('Clicking Register link...');
        await registerLink.click();

        // Wait for navigation to complete
        await page.waitForLoadState('networkidle');
        console.log('Navigation completed');
      });

      // Step 3: Verify we're on the registration page
      await test.step('Verify navigation to registration page', async () => {
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        // Verify we're on the registration page
        expect(currentUrl).toContain('register');

        // Verify registration form is visible
        const registrationForm = page.locator('form, #registerForm, .register-form');
        await registrationForm.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Registration form is visible');

        // Verify key form fields are present
        const firstNameField = page.locator('input[name="firstName"], #firstName, [placeholder*="First Name"]');
        const lastNameField = page.locator('input[name="lastName"], #lastName, [placeholder*="Last Name"]');
        const usernameField = page.locator('input[name="username"], #username, [placeholder*="Username"]');
        const passwordField = page.locator('input[name="password"], #password, [placeholder*="Password"]');

        await firstNameField.waitFor({ state: 'visible', timeout: 5000 });
        await lastNameField.waitFor({ state: 'visible', timeout: 5000 });
        await usernameField.waitFor({ state: 'visible', timeout: 5000 });
        await passwordField.waitFor({ state: 'visible', timeout: 5000 });

        console.log('All required registration form fields are present and visible');
      });

      // Add success assertion
      await expect(page).toHaveURL(/.*register.*/);
      console.log('Test completed successfully - registration page loaded with all required fields');
    } catch (error) {
      console.error('Test failed:', error.message);
      throw error;
    }
  });
});
