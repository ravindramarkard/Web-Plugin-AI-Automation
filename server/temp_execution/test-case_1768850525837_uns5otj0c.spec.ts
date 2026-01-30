import { test } from './custom-test';
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Login and Click to Bill Pay (Copy)', async ({ page, request }) => {
  try {
    import { test, Page } from '@playwright/test';
    import * as allure from 'allure-js-commons';

    test.describe('Login and Click to Bill Pay (Copy)', () => {
      test('should login and navigate to bill pay page', async ({ page }) => {
        // Set up Allure reporting
        await allure.suite('ParaBank Bill Pay Flow', 'Testing login and bill pay navigation');

        try {
          // Step 1: Navigate to ParaBank login page
          await allure.step('Navigate to ParaBank login page', async () => {
            console.log('Navigating to ParaBank login page...');
            await page.goto('https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC');
            await page.waitForLoadState('networkidle');
            console.log('Page loaded successfully');
          });

          // Step 2: Input username
          await allure.step('Enter username', async () => {
            console.log('Looking for username input field...');

            // Try multiple selector strategies for the username input
            let usernameInput = page.locator('input[name="username"]');

            // If not found, try other common selectors
            if ((await usernameInput.count()) === 0) {
              usernameInput = page.getByPlaceholder('Username');
            }

            if ((await usernameInput.count()) === 0) {
              usernameInput = page.getByRole('textbox', { name: /username/i });
            }

            if ((await usernameInput.count()) === 0) {
              usernameInput = page.locator('#username');
            }

            if ((await usernameInput.count()) === 0) {
              usernameInput = page.locator('input[id*="username"]');
            }

            await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
            await usernameInput.fill('john');
            console.log('Username entered: john');

            // Verify input was successful
            const inputValue = await usernameInput.inputValue();
            expect(inputValue).toBe('john');
            console.log('Username input verified');
          });

          // Step 3: Input password
          await allure.step('Enter password', async () => {
            console.log('Looking for password input field...');

            // Try multiple selector strategies for the password input
            let passwordInput = page.locator('input[name="password"]');

            // If not found, try other common selectors
            if ((await passwordInput.count()) === 0) {
              passwordInput = page.getByPlaceholder('Password');
            }

            if ((await passwordInput.count()) === 0) {
              passwordInput = page.getByRole('textbox', { name: /password/i });
            }

            if ((await passwordInput.count()) === 0) {
              passwordInput = page.locator('#password');
            }

            if ((await passwordInput.count()) === 0) {
              passwordInput = page.locator('input[type="password"]');
            }

            await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
            await passwordInput.fill('parabank');
            console.log('Password entered: parabank');

            // Verify input was successful
            const inputValue = await passwordInput.inputValue();
            expect(inputValue).toBe('parabank');
            console.log('Password input verified');
          });

          // Step 4: Click login button
          await allure.step('Click login button', async () => {
            console.log('Looking for login button...');

            // Try multiple selector strategies for the login button
            let loginButton = page.locator('input[type="submit"]');

            // If not found, try other common selectors
            if ((await loginButton.count()) === 0) {
              loginButton = page.getByRole('button', { name: /login/i });
            }

            if ((await loginButton.count()) === 0) {
              loginButton = page.locator('#login');
            }

            if ((await loginButton.count()) === 0) {
              loginButton = page.locator('button:has-text("Login")');
            }

            await loginButton.waitFor({ state: 'visible', timeout: 15000 });
            await loginButton.click();
            console.log('Login button clicked');

            // Wait for navigation after login
            await page.waitForLoadState('networkidle');
            console.log('Navigation after login completed');
          });

          // Step 5: Click Bill Pay link
          await allure.step('Click Bill Pay link', async () => {
            console.log('Looking for Bill Pay link...');

            // Try multiple selector strategies for the Bill Pay link
            let billPayLink = page.locator('a[href*="billpay"]');

            // If not found, try other common selectors
            if ((await billPayLink.count()) === 0) {
              billPayLink = page.getByRole('link', { name: /bill pay/i });
            }

            if ((await billPayLink.count()) === 0) {
              billPayLink = page.locator('#billpay');
            }

            if ((await billPayLink.count()) === 0) {
              billPayLink = page.locator('a:has-text("Bill Pay")');
            }

            await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
            await billPayLink.click();
            console.log('Bill Pay link clicked');

            // Wait for navigation to Bill Pay page
            await page.waitForLoadState('networkidle');
            console.log('Navigation to Bill Pay page completed');

            // Verify we're on the Bill Pay page
            await expect(page).toHaveURL(/.*billpay/);
            console.log('Successfully navigated to Bill Pay page');
          });

          console.log('Test completed successfully!');
        } catch (error) {
          console.error('Test failed with error:', error);
          await allure.attachment('Error Details', JSON.stringify(error, null, 2), 'application/json');
          throw error;
        }
      });
    });
  } catch (error) {
    // Capture DOM on failure
    try {
      if (page) {
        const dom = await page.content();
        const dumpPath = path.join(
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution',
          'dom-case_1768850525837_uns5otj0c.html',
        );
        fs.writeFileSync(dumpPath, dom);
      }
    } catch (e) {
      console.error('Failed to capture DOM:', e);
    }
    throw error;
  }
});
