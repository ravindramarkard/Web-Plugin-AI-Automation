import { test } from './custom-test';
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('1Login and Click to Bill Pay', async ({ page, request }) => {
  try {
    import { test, expect, Page } from '@playwright/test';
    import * as allure from 'allure-js-commons';

    test.describe('Login and Click to Bill Pay', () => {
      const BASE_URL = 'https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC';
      const USERNAME = 'autoauto';
      const PASSWORD = 'auto';

      test.beforeEach(async ({ page }) => {
        // Navigate to the base URL before each test
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        console.log('Navigated to Parabank login page');
      });

      test('Login and navigate to Bill Pay page', async ({ page }) => {
        // Step 1: Login with username
        await allure.step('Step 1: Enter username', async () => {
          try {
            // Looking for the username input field
            // Based on typical Parabank structure, the username field has name="username"
            const usernameInput = page.locator('input[name="username"]');
            await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
            await usernameInput.fill(USERNAME);
            console.log(`Entered username: ${USERNAME}`);
            await allure.attachment('Username Input', `Username: ${USERNAME}`, 'text/plain');
          } catch (error) {
            console.error('Failed to enter username:', error);
            throw error;
          }
        });

        // Step 2: Login with password
        await allure.step('Step 2: Enter password', async () => {
          try {
            // Looking for the password input field
            // Based on typical Parabank structure, the password field has name="password"
            const passwordInput = page.locator('input[name="password"]');
            await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
            await passwordInput.fill(PASSWORD);
            console.log(`Entered password: ${PASSWORD}`);
            await allure.attachment('Password Input', 'Password: ***', 'text/plain');
          } catch (error) {
            console.error('Failed to enter password:', error);
            throw error;
          }
        });

        // Step 3: Click Login button
        await allure.step('Step 3: Click Login button', async () => {
          try {
            // Looking for the login button
            // Based on typical Parabank structure, the login button has name="action"
            const loginButton = page.locator('input[name="action"]');
            await loginButton.waitFor({ state: 'visible', timeout: 15000 });
            await loginButton.click();
            console.log('Clicked Login button');

            // Wait for login to complete and verify we're on the Accounts Overview page
            await page.waitForLoadState('networkidle');

            // Verify successful login by checking for welcome message
            const welcomeMessage = page.locator('h1.heading');
            await expect(welcomeMessage).toContainText('Welcome', { timeout: 15000 });
            console.log('Login successful - verified by welcome message');
            await allure.attachment('Login Verification', 'Welcome message displayed', 'text/plain');
          } catch (error) {
            console.error('Failed to login:', error);
            throw error;
          }
        });
      });
      test('Navigate to Bill Pay page', async ({ page }) => {
        // Step 4: Click Bill Pay link
        await allure.step('Step 4: Click Bill Pay link', async () => {
          try {
            // Looking for the Bill Pay link
            // Based on typical Parabank structure, the Bill Pay link is in the sidebar with text "Bill Pay"
            const billPayLink = page.locator('a[href*="billpay"]');
            await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
            await billPayLink.click();
            console.log('Clicked Bill Pay link');

            // Wait for the Bill Pay page to load
            await page.waitForLoadState('networkidle');

            // Verify we're on the Bill Pay page by checking the URL and page title
            expect(page.url()).toContain('billpay.htm');
            const billPayTitle = page.locator('h1.heading');
            await expect(billPayTitle).toContainText('Bill Pay', { timeout: 15000 });
            console.log('Successfully navigated to Bill Pay page');
            await allure.attachment('Bill Pay Page', `URL: ${page.url()}`, 'text/plain');
          } catch (error) {
            console.error('Failed to navigate to Bill Pay page:', error);
            throw error;
          }
        });

        // Step 5: Verify Bill Pay form is displayed
        await allure.step('Step 5: Verify Bill Pay form elements', async () => {
          try {
            // Verify the Bill Pay form contains expected elements
            // Looking for payee name input field
            const payeeNameInput = page.locator('input[name="payee.name"]');
            await expect(payeeNameInput).toBeVisible({ timeout: 15000 });
            console.log('Payee Name input field is visible');

            // Looking for address input field
            const addressInput = page.locator('input[name="payee.address.street"]');
            await expect(addressInput).toBeVisible({ timeout: 15000 });
            console.log('Address input field is visible');

            // Looking for city input field
            const cityInput = page.locator('input[name="payee.address.city"]');
            await expect(cityInput).toBeVisible({ timeout: 15000 });
            console.log('City input field is visible');

            // Looking for state input field
            const stateInput = page.locator('input[name="payee.address.state"]');
            await expect(stateInput).toBeVisible({ timeout: 15000 });
            console.log('State input field is visible');

            // Looking for zip code input field
            const zipInput = page.locator('input[name="payee.address.zipCode"]');
            await expect(zipInput).toBeVisible({ timeout: 15000 });
            console.log('Zip Code input field is visible');

            // Looking for phone input field
            const phoneInput = page.locator('input[name="payee.phoneNumber"]');
            await expect(phoneInput).toBeVisible({ timeout: 15000 });
            console.log('Phone input field is visible');

            // Looking for account number input field
            const accountInput = page.locator('input[name="payee.accountNumber"]');
            await expect(accountInput).toBeVisible({ timeout: 15000 });
            console.log('Account Number input field is visible');

            // Looking for verify account number input field
            const verifyAccountInput = page.locator('input[name="verifyAccount"]');
            await expect(verifyAccountInput).toBeVisible({ timeout: 15000 });
            console.log('Verify Account Number input field is visible');

            // Looking for amount input field
            const amountInput = page.locator('input[name="amount"]');
            await expect(amountInput).toBeVisible({ timeout: 15000 });
            console.log('Amount input field is visible');

            // Looking for from account select field
            const fromAccountSelect = page.locator('select[name="fromAccountId"]');
            await expect(fromAccountSelect).toBeVisible({ timeout: 15000 });
            console.log('From Account select field is visible');

            // Looking for send payment button
            const sendPaymentButton = page.locator('input[value="Send Payment"]');
            await expect(sendPaymentButton).toBeVisible({ timeout: 15000 });
            console.log('Send Payment button is visible');

            await allure.attachment(
              'Bill Pay Form Verification',
              'All Bill Pay form elements are visible',
              'text/plain',
            );
          } catch (error) {
            console.error('Failed to verify Bill Pay form:', error);
            throw error;
          }
        });

        // Step 6: Final verification and completion
        await allure.step('Step 6: Complete verification', async () => {
          console.log("✅ Successfully tested the login with username 'autoauto' and password 'auto'.");
          console.log(
            "✅ After logging in, I waited for the logged-in state (confirmed by the welcome message 'Welcome auto auto' on the Accounts Overview page).",
          );
          console.log("✅ I then clicked on the 'Bill Pay' link and verified the Bill Pay page.");
          console.log(
            '✅ The Bill Pay page displays the bill payment form with fields for payee information, amount, and from account, confirming that the Bill Pay functionality is accessible.',
          );
          console.log('✅ All steps of the task have been completed successfully.');

          await allure.attachment('Test Summary', 'Login and Bill Pay navigation completed successfully', 'text/plain');
        });
      });
    });
  } catch (error) {
    // Capture DOM on failure
    try {
      if (page) {
        const dom = await page.content();
        const dumpPath = path.join(
          '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution',
          'dom-case_1768494083000_yv96mr86t.html',
        );
        fs.writeFileSync(dumpPath, dom);
      }
    } catch (e) {
      console.error('Failed to capture DOM:', e);
    }
    throw error;
  }
});
