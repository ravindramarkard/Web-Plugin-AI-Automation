import { test } from './custom-test';
import { expect } from '@playwright/test';

test('Login and Click to Bill Pay (Copy)', async ({ page, request }) => {
  import { test } from './custom-test';
  import { expect } from '@playwright/test';
  import * as allure from 'allure-js-commons';

  test.describe('ParaBank Login and Bill Pay Navigation', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
      page = await browser.newPage();
      await page.goto(process.env.TEST_BASE_URL);
      await page.waitForLoadState('networkidle');
    });

    test.afterEach(async () => {
      await page.close();
    });

    test('Login and navigate to Bill Pay', async () => {
      await test.step('Navigate to ParaBank homepage', async () => {
        await allure.step('Navigate to ParaBank homepage', async () => {
          console.log('Navigating to ParaBank homepage');
          await expect(page).toHaveURL(process.env.TEST_BASE_URL);
          await allure.attachment('Homepage URL', page.url(), 'text/plain');
        });
      });

      await test.step('Enter username', async () => {
        await allure.step('Enter username in login form', async () => {
          try {
            console.log('Entering username');
            const usernameField = page.locator('input[name="username"]');
            await usernameField.waitFor({ state: 'visible', timeout: 15000 });
            await usernameField.fill(process.env.TEST_USERNAME);
            console.log('Username entered successfully');
            await allure.attachment('Username Entered', process.env.TEST_USERNAME, 'text/plain');

            await expect(usernameField).toHaveValue(process.env.TEST_USERNAME);
          } catch (error) {
            console.error('Failed to enter username:', error);
            await allure.attachment('Username Error', error.message, 'text/plain');
            throw error;
          }
        });
      });

      await test.step('Enter password', async () => {
        await allure.step('Enter password in login form', async () => {
          try {
            console.log('Entering password');
            const passwordField = page.locator('input[name="password"]');
            await passwordField.waitFor({ state: 'visible', timeout: 15000 });
            await passwordField.fill(process.env.TEST_PASSWORD);
            console.log('Password entered successfully');
            await allure.attachment('Password Entered', '******', 'text/plain');

            await expect(passwordField).toHaveValue(process.env.TEST_PASSWORD);
          } catch (error) {
            console.error('Failed to enter password:', error);
            await allure.attachment('Password Error', error.message, 'text/plain');
            throw error;
          }
        });
      });

      await test.step('Click login button', async () => {
        await allure.step('Click the login button to authenticate', async () => {
          try {
            console.log('Clicking login button');
            const loginButton = page.locator('input[type="submit"]');
            await loginButton.waitFor({ state: 'visible', timeout: 15000 });
            await loginButton.click();
            console.log('Login button clicked successfully');

            await page.waitForLoadState('networkidle');

            await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
            console.log('Login successful - page loaded');
            await allure.attachment('Login Success', 'User logged in successfully', 'text/plain');
          } catch (error) {
            console.error('Failed to click login button:', error);
            await allure.attachment('Login Error', error.message, 'text/plain');
            throw error;
          }
        });
      });

      await test.step('Navigate to Bill Pay', async () => {
        await allure.step('Click on Bill Pay link in navigation', async () => {
          try {
            console.log('Navigating to Bill Pay');
            const billPayLink = page.getByRole('link', { name: 'Bill Pay' });
            await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
            await billPayLink.click();
            console.log('Bill Pay link clicked successfully');

            await page.waitForLoadState('networkidle');

            const billPayHeader = page.locator('h1:has-text("Bill Pay")');
            await billPayHeader.waitFor({ state: 'visible', timeout: 10000 });
            await expect(billPayHeader).toBeVisible();
            console.log('Successfully navigated to Bill Pay page');
            await allure.attachment('Bill Pay Navigation', 'Successfully navigated to Bill Pay page', 'text/plain');
            await allure.attachment('Bill Pay URL', page.url(), 'text/plain');
          } catch (error) {
            console.error('Failed to navigate to Bill Pay:', error);
            await allure.attachment('Bill Pay Error', error.message, 'text/plain');
            throw error;
          }
        });
      });

      await test.step('Verify Bill Pay page loaded correctly', async () => {
        await allure.step('Verify Bill Pay page elements are present', async () => {
          try {
            console.log('Verifying Bill Pay page elements');

            const payeeNameField = page.locator('input[name="payee.name"]');
            const addressField = page.locator('input[name="payee.address.street"]');
            const cityField = page.locator('input[name="payee.address.city"]');
            const amountField = page.locator('input[name="amount"]');

            await expect(payeeNameField).toBeVisible({ timeout: 5000 });
            await expect(addressField).toBeVisible({ timeout: 5000 });
            await expect(cityField).toBeVisible({ timeout: 5000 });
            await expect(amountField).toBeVisible({ timeout: 5000 });

            console.log('Bill Pay page verified successfully');
            await allure.attachment('Page Verification', 'All Bill Pay elements are present and visible', 'text/plain');
          } catch (error) {
            console.error('Bill Pay page verification failed:', error);
            await allure.attachment('Verification Error', error.message, 'text/plain');
            throw error;
          }
        });
      });
    });
  });
});
