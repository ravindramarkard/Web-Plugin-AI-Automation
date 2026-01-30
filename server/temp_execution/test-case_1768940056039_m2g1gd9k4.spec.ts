import { test } from './custom-test';
import { expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Login and Bill Pay Navigation', () => {
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
          .or(page.locator('a:has-text("Bill Pay")'));

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
});
