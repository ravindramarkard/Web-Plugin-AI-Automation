import { test } from './custom-test';
import { expect } from '@playwright/test';
import * as allure from 'allure-js-commons';
import fs from 'fs';
import path from 'path';

test.describe('Login and Click to Bill Pay', () => {
  const BASE_URL = process.env.BASE_URL || 'https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC';

  test('should login and navigate to bill pay page', async ({ page }) => {
    await allure.epic('Parabank Bill Pay');
    await allure.feature('Authentication');
    await allure.story('Login and Navigate to Bill Pay');

    try {
      // Step 1: Navigate to Parabank homepage
      await test.step('Navigate to Parabank homepage', async () => {
        console.log(`Navigating to: ${BASE_URL}`);
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Step 2: Verify login form is visible
      await test.step('Verify login form is visible', async () => {
        const loginForm = page.locator('form[name="loginForm"]');
        await loginForm.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Login form is visible');
      });

      // Step 3: Enter username
      await test.step('Enter username', async () => {
        const usernameInput = page.locator('input[name="username"]');
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        const username = process.env.USERNAME || 'john';
        await usernameInput.fill(username);
        console.log(`Username entered: ${username}`);
        await expect(usernameInput).toHaveValue(username);
      });

      // Step 4: Enter password
      await test.step('Enter password', async () => {
        const passwordInput = page.locator('input[name="password"]');
        await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
        const password = process.env.PASSWORD || 'demo';
        await passwordInput.fill(password);
        console.log(`Password entered: ${password}`);
        await expect(passwordInput).toHaveValue(password);
      });

      // Step 5: Click login button
      await test.step('Click login button', async () => {
        const loginButton = page.locator('input[value="Log In"]');
        await loginButton.waitFor({ state: 'visible', timeout: 15000 });
        await loginButton.click();
        console.log('Login button clicked');
        await page.waitForLoadState('networkidle');
      });

      // Step 6: Verify successful login
      await test.step('Verify successful login', async () => {
        const welcomeMessage = page.locator('h1:has-text("Welcome")');
        await welcomeMessage.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Login successful - Welcome message displayed');
        await expect(welcomeMessage).toBeVisible();
      });

      // Step 7: Verify Bill Pay link is visible
      await test.step('Verify Bill Pay link is visible', async () => {
        const billPayLink = page.locator('a[href="billpay.htm"]');
        await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Bill Pay link is visible');
        await expect(billPayLink).toBeVisible();
      });

      // Step 8: Click Bill Pay link
      await test.step('Click Bill Pay link', async () => {
        const billPayLink = page.locator('a[href="billpay.htm"]');
        await billPayLink.click();
        console.log('Bill Pay link clicked');
        await page.waitForLoadState('networkidle');
      });

      // Step 9: Verify Bill Pay page is loaded
      await test.step('Verify Bill Pay page is loaded', async () => {
        const billPayHeader = page.locator('h1:has-text("Bill Pay")');
        await billPayHeader.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Bill Pay page loaded successfully');
        await expect(billPayHeader).toBeVisible();
      });

      // Step 10: Verify Bill Pay form elements are present
      await test.step('Verify Bill Pay form elements are present', async () => {
        const payeeNameInput = page.locator('input[name="payee.name"]');
        await payeeNameInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Payee name input is visible');
        await expect(payeeNameInput).toBeVisible();

        const addressInput = page.locator('input[name="payee.address.street"]');
        await addressInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Address input is visible');
        await expect(addressInput).toBeVisible();

        const cityInput = page.locator('input[name="payee.address.city"]');
        await cityInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('City input is visible');
        await expect(cityInput).toBeVisible();

        const stateInput = page.locator('input[name="payee.address.state"]');
        await stateInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('State input is visible');
        await expect(stateInput).toBeVisible();

        const zipCodeInput = page.locator('input[name="payee.address.zipCode"]');
        await zipCodeInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Zip Code input is visible');
        await expect(zipCodeInput).toBeVisible();

        const phoneInput = page.locator('input[name="payee.phoneNumber"]');
        await phoneInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Phone input is visible');
        await expect(phoneInput).toBeVisible();

        const accountInput = page.locator('input[name="payee.accountNumber"]');
        await accountInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Account Number input is visible');
        await expect(accountInput).toBeVisible();

        const verifyAccountInput = page.locator('input[name="verifyAccount"]');
        await verifyAccountInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Verify Account input is visible');
        await expect(verifyAccountInput).toBeVisible();

        const amountInput = page.locator('input[name="amount"]');
        await amountInput.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Amount input is visible');
        await expect(amountInput).toBeVisible();

        const fromAccountSelect = page.locator('select[name="fromAccount"]');
        await fromAccountSelect.waitFor({ state: 'visible', timeout: 15000 });
        console.log('From Account select is visible');
        await expect(fromAccountSelect).toBeVisible();

        const sendPaymentButton = page.locator('input[value="Send Payment"]');
        await sendPaymentButton.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Send Payment button is visible');
        await expect(sendPaymentButton).toBeVisible();
      });

      console.log('Test completed successfully - Login and Bill Pay navigation verified');
    } catch (error) {
      console.error('Test failed with error:', error);
      await allure.attachment('Error Details', error.message, 'text/plain');
      // Capture DOM on failure
      try {
        if (page) {
          const dom = await page.content();
          const dumpPath = path.join(
            '/Users/ravindramarkard/webpluginauto/Web-Plugin-AI-Automation/server/temp_execution',
            'dom-case_1768851094670_y91hilw35.html',
          );
          fs.writeFileSync(dumpPath, dom);
        }
      } catch (e) {
        console.error('Failed to capture DOM:', e);
      }
      throw error;
    }
  });
});
