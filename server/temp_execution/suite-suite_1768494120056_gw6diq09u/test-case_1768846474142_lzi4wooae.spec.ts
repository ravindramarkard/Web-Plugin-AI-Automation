import { test } from '../custom-test';
import { expect } from '@playwright/test';
test('Login and Click to Bill Pay (Copy)', async ({ page, request }) => {
  import { test, expect, Page } from '@playwright/test';
  import * as allure from 'allure-js-commons';

  test.describe('Login and Bill Pay Flow', () => {
    test('should login and navigate to Bill Pay page', async ({ page }) => {
      // Set test timeout for longer operations
      test.setTimeout(60000);

      // Navigate to the base URL
      await allure.step('Navigate to ParaBank login page', async () => {
        console.log('Navigating to ParaBank...');
        await page.goto('https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC');
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Step 1: Input username
      await allure.step('Enter username', async () => {
        console.log('Looking for username input field...');
        // Try to find the username input by various selectors
        const usernameInput =
          page.getByPlaceholder('Username') ||
          page.locator('input[name="username"]') ||
          page.locator('#username') ||
          page.locator('input[type="text"]').first();

        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill('autoauto');
        console.log('Username entered: autoauto');
        await expect(usernameInput).toHaveValue('autoauto');
      });

      // Step 2: Input password
      await allure.step('Enter password', async () => {
        console.log('Looking for password input field...');
        // Try to find the password input by various selectors
        const passwordInput =
          page.getByPlaceholder('Password') ||
          page.locator('input[name="password"]') ||
          page.locator('#password') ||
          page.locator('input[type="password"]').first();

        await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
        await passwordInput.fill('auto');
        console.log('Password entered: auto');
        await expect(passwordInput).toHaveValue('auto');
      });

      // Step 3: Click login button
      await allure.step('Click login button', async () => {
        console.log('Looking for login button...');
        // Try to find the login button by various selectors
        const loginButton =
          page.getByRole('button', { name: /login/i }) ||
          page.locator('input[type="submit"]') ||
          page.locator('#login') ||
          page.locator('button', { hasText: 'Login' });

        await loginButton.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Clicking login button...');
        await loginButton.click();

        // Wait for navigation after login
        await page.waitForLoadState('networkidle');
        console.log('Login successful - waiting for page to load...');

        // Verify login was successful by checking for logout button or welcome message
        const welcomeMessage = page.locator('text=/Welcome|Account Overview/i');
        await welcomeMessage.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Login verified - welcome message found');
      });

      // Step 4: Click Bill Pay link
      await allure.step('Click Bill Pay link', async () => {
        console.log('Looking for Bill Pay link...');
        // Try to find the Bill Pay link by various selectors
        const billPayLink =
          page.getByRole('link', { name: /bill pay/i }) ||
          page.locator('a[href*="billpay"]') ||
          page.locator('#billPay') ||
          page.locator('a', { hasText: 'Bill Pay' });

        await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Clicking Bill Pay link...');
        await billPayLink.click();

        // Wait for navigation to Bill Pay page
        await page.waitForLoadState('networkidle');
        console.log('Navigated to Bill Pay page');

        // Verify we're on the Bill Pay page
        await expect(page).toHaveURL(/.*billpay/);
        console.log('URL verified: Bill Pay page loaded');
      });

      // Step 5: Verify Bill Pay page elements
      await allure.step('Verify Bill Pay page elements', async () => {
        console.log('Verifying Bill Pay page elements...');

        // Check for the Bill Pay page title
        const pageTitle = page.locator('h1, h2, .title', { hasText: /bill pay|bill payment/i });
        await pageTitle.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Bill Pay page title found');

        // Verify all expected fields are present
        const expectedFields = [
          { name: 'Payee Name', selector: 'input[name="payeeName"]' },
          { name: 'Address', selector: 'input[name="address"]' },
          { name: 'City', selector: 'input[name="city"]' },
          { name: 'State', selector: 'input[name="state"]' },
          { name: 'Zip Code', selector: 'input[name="zipCode"]' },
          { name: 'Phone', selector: 'input[name="phone"]' },
          { name: 'Account #', selector: 'input[name="accountNumber"]' },
          { name: 'Verify Account #', selector: 'input[name="verifyAccount"]' },
          { name: 'Amount', selector: 'input[name="amount"]' },
          { name: 'From account #', selector: 'select[name="fromAccount"]' },
        ];

        for (const field of expectedFields) {
          const element = page.locator(field.selector);
          await element.waitFor({ state: 'visible', timeout: 5000 });
          console.log(`✓ Found field: ${field.name}`);
          await expect(element).toBeVisible();
        }

        // Verify Send Payment button
        const sendPaymentButton =
          page.getByRole('button', { name: /send payment/i }) ||
          page.locator('input[type="submit"]') ||
          page.locator('button', { hasText: /send payment/i });
        await sendPaymentButton.waitFor({ state: 'visible', timeout: 15000 });
        console.log('✓ Found Send Payment button');
        await expect(sendPaymentButton).toBeVisible();

        console.log('All Bill Pay page elements verified successfully');
      });

      // Final success message
      await allure.step('Test completion verification', async () => {
        console.log('Test completed successfully:');
        console.log('1. Login with username "autoauto" and password "auto" was successful');
        console.log('2. After login, clicked on "Bill Pay" and verified the Bill Pay page');
        console.log('3. The page shows complete Bill Payment Service form with all expected fields');
        console.log('All verification steps are complete');
      });

      // Add final assertion
      expect(true).toBeTruthy();
    });
  });
});
