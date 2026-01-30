import { test } from '../custom-test';
import { expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Login and Bill Pay Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the banking application
    await page.goto('https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC');
    await page.waitForLoadState('networkidle');
    console.log('Navigated to ParaBank application');
  });
  test('should login successfully and navigate to Bill Pay page', async ({ page }) => {
    try {
      await allure.epic('Banking Application');
      await allure.feature('Authentication');
      await allure.story('Login and Bill Pay Access');

      // Navigate to the base URL
      await test.step('Navigate to ParaBank application', async () => {
        console.log('Navigating to ParaBank application...');
        await page.goto('https://parabank.parasoft.com/parabank/index.htm');
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Wait for the login form to be visible
      await test.step('Wait for login form to be visible', async () => {
        console.log('Waiting for login form elements...');
        await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 15000 });
        await page.waitForSelector('input[name="password"]', { state: 'visible', timeout: 15000 });
        console.log('Login form elements are visible');
      });

      // Step 1: Enter username
      await test.step('Enter username', async () => {
        console.log('Entering username...');
        const usernameField = page.locator('input[name="username"]');
        await usernameField.waitFor({ state: 'visible', timeout: 15000 });
        await usernameField.fill('333'); // Using default test username
        console.log('Username entered successfully');

        // Verify username was entered
        const usernameValue = await usernameField.inputValue();
        expect(usernameValue).toBe('333');
      });

      // Step 2: Enter password
      await test.step('Enter password', async () => {
        console.log('Entering password...');
        const passwordField = page.locator('input[name="password"]');
        await passwordField.waitFor({ state: 'visible', timeout: 15000 });
        await passwordField.fill('333'); // Using default test password
        console.log('Password entered successfully');

        // Verify password was entered
        const passwordValue = await passwordField.inputValue();
        expect(passwordValue).toBe('333');
      });

      // Step 3: Click login button
      await test.step('Click login button', async () => {
        console.log('Clicking login button...');
        // Try multiple possible selectors for the login button
        const loginButton = page
          .locator('input[type="submit"]')
          .or(page.getByRole('button', { name: 'Log In' }))
          .or(page.getByRole('button', { name: 'Login' }));

        await loginButton.waitFor({ state: 'visible', timeout: 15000 });
        await loginButton.click();
        console.log('Login button clicked');

        // Wait for navigation after login
        await page.waitForLoadState('networkidle');

        // Verify successful login by checking for logout link or welcome message
        await expect(page.locator('a[href*="logout"]')).toBeVisible({ timeout: 10000 });
        console.log('Login successful - logout link is visible');
      });

      // Step 4: Click Bill Pay link
      await test.step('Navigate to Bill Pay page', async () => {
        console.log('Clicking Bill Pay link...');
        // Try multiple possible selectors for Bill Pay link
        const billPayLink = page
          .getByRole('link', { name: 'Bill Pay' })
          .or(page.locator('a[href*="billpay"]'))
          .or(page.locator('a:has-text("Bill Payment")'));

        await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
        await billPayLink.click();
        console.log('Bill Pay link clicked');

        // Wait for navigation to Bill Pay page
        await page.waitForLoadState('networkidle');

        // Verify we're on the Bill Pay page
        await expect(page.locator('h1:has-text("Bill Pay")')).toBeVisible({ timeout: 10000 });
        console.log('Successfully navigated to Bill Pay page');

        // Additional verification - check for Bill Pay form elements
        await expect(page.locator('input[name="payeeName"]')).toBeVisible({ timeout: 5000 });
        console.log('Bill Pay form is loaded and ready');
      });
    } catch (error) {
      console.error('Test failed with error:', error);
      await allure.attachment('Screenshot', await page.screenshot(), 'image/png');
      throw error;
    }
  });
  test('click to Transfer Funds', async ({ page }) => {
    await test.step('Navigate to Transfer Funds page', async () => {
      try {
        // Click on Transfer Funds link in the navigation menu
        const transferFundsLink = page.getByRole('link', { name: 'Transfer Funds' });
        await transferFundsLink.waitFor({ state: 'visible', timeout: 15000 });
        await transferFundsLink.click();
        console.log('Transfer Funds link clicked successfully');

        // Wait for transfer funds page to load
        await page.waitForLoadState('networkidle');

        // Verify we're on the transfer funds page
        await expect(page.locator('h1')).toContainText('Transfer Funds');
        console.log('Transfer Funds page loaded successfully');
      } catch (error) {
        console.error('Error navigating to Transfer Funds page:', error);
        await allure.step('Navigation to Transfer Funds failed', () => {
          throw new Error(`Failed to navigate to Transfer Funds page: ${error.message}`);
        });
        throw error;
      }
    });

    await test.step('Perform fund transfer', async () => {
      try {
        // Select from account (using first available account)
        const fromAccountSelect = page.locator('select[name="fromAccountId"]');
        await fromAccountSelect.waitFor({ state: 'visible', timeout: 15000 });
        await fromAccountSelect.selectOption({ index: 0 });
        console.log('From account selected');

        // Select to account (using second available account)
        const toAccountSelect = page.locator('select[name="toAccountId"]');
        await toAccountSelect.waitFor({ state: 'visible', timeout: 15000 });
        await toAccountSelect.selectOption({ index: 1 });
        console.log('To account selected');

        // Enter transfer amount
        const amountInput = page.locator('input[name="amount"]');
        await amountInput.waitFor({ state: 'visible', timeout: 15000 });
        await amountInput.fill('100');
        console.log('Transfer amount entered: $100');

        // Click transfer button
        const transferButton = page.getByRole('button', { name: 'Transfer' });
        await transferButton.waitFor({ state: 'visible', timeout: 15000 });
        await transferButton.click();
        console.log('Transfer button clicked successfully');

        // Wait for transfer to complete
        await page.waitForLoadState('networkidle');

        // Verify transfer success message
        await expect(page.locator('.ng-scope')).toContainText('Transfer Complete!');
        console.log('Fund transfer completed successfully');

        // Take screenshot for evidence
        await page.screenshot({ path: 'transfer-success.png' });
        await allure.attachment('Transfer Success Screenshot', Buffer.from(await page.screenshot()), 'image/png');
      } catch (error) {
        console.error('Error performing fund transfer:', error);
        await allure.step('Fund transfer failed', () => {
          throw new Error(`Failed to perform fund transfer: ${error.message}`);
        });
        throw error;
      }
    });

    await test.step('Verify transfer details', async () => {
      try {
        // Verify the transfer details are displayed correctly
        const transferDetails = page.locator('#rightPanel');
        await transferDetails.waitFor({ state: 'visible', timeout: 15000 });

        // Check for amount in the transfer details
        await expect(transferDetails).toContainText('$100.00');
        console.log('Transfer amount verified in details');

        // Check for success message
        await expect(page.locator('#rightPanel h1')).toHaveText('Transfer Complete!');
        console.log('Transfer completion verified');
      } catch (error) {
        console.error('Error verifying transfer details:', error);
        await allure.step('Transfer verification failed', () => {
          throw new Error(`Failed to verify transfer details: ${error.message}`);
        });
        throw error;
      }
    });
  });
});
