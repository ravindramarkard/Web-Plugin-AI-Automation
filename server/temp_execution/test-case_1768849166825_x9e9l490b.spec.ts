import { test } from './custom-test';
import { Page } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('ParaBank Login and Bill Pay Flow', () => {
  test.beforeEach(async ({ page }) => {
    await allure.step('Navigate to ParaBank login page', async () => {
      await page.goto('https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC');
      await page.waitForLoadState('networkidle');
      console.log('Navigated to login page');
    });
  });

  test('Login and navigate to Bill Pay page', async ({ page }) => {
    // Test Case 1: Login
    await allure.step('Test Case 1: Login with credentials', async () => {
      try {
        // Locate username input field
        const usernameInput = page.getByPlaceholder('Username');
        await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await usernameInput.fill('autoauto');
        console.log('Entered username: autoauto');

        // Locate password input field
        const passwordInput = page.getByPlaceholder('Password');
        await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
        await passwordInput.fill('auto');
        console.log('Entered password: auto');

        // Locate and click login button
        const loginButton = page.getByRole('button', { name: 'Log In' });
        await loginButton.waitFor({ state: 'visible', timeout: 15000 });
        await loginButton.click();
        console.log('Clicked login button');

        // Wait for navigation and verify login success
        await page.waitForLoadState('networkidle');

        // Verify Accounts Overview page is displayed
        const accountsOverviewHeading = page.getByRole('heading', { name: 'Accounts Overview' });
        await accountsOverviewHeading.waitFor({ state: 'visible', timeout: 15000 });
        await expect(accountsOverviewHeading).toBeVisible();
        console.log('Accounts Overview page verified');

        // Verify welcome message
        const welcomeMessage = page.locator('h1:has-text("Welcome")');
        await expect(welcomeMessage).toContainText('Welcome auto aaa');
        console.log('Welcome message verified: Welcome auto aaa');

        await allure.attachment(
          'Login Success',
          'Successfully logged in with username autoauto and password auto',
          'text/plain',
        );
      } catch (error) {
        console.error('Login test failed:', error);
        await allure.attachment('Login Error', error.message, 'text/plain');
        throw error;
      }
    });

    // Test Case 2: Click Bill Pay link
    await allure.step('Test Case 2: Navigate to Bill Pay page', async () => {
      try {
        // Locate and click Bill Pay link
        const billPayLink = page.getByRole('link', { name: 'Bill Pay' });
        await billPayLink.waitFor({ state: 'visible', timeout: 15000 });
        await billPayLink.click();
        console.log('Clicked Bill Pay link');

        // Wait for navigation
        await page.waitForLoadState('networkidle');

        // Verify Bill Pay page URL
        const currentUrl = page.url();
        expect(currentUrl).toContain('/billpay.htm');
        console.log('Bill Pay page URL verified:', currentUrl);

        // Verify Bill Payment Service form is present
        const billPaymentServiceHeading = page.getByRole('heading', { name: 'Bill Payment Service' });
        await billPaymentServiceHeading.waitFor({ state: 'visible', timeout: 15000 });
        await expect(billPaymentServiceHeading).toBeVisible();
        console.log('Bill Payment Service form verified');

        // Verify all required fields are present
        const payeeNameField = page.getByPlaceholder('Payee Name');
        await expect(payeeNameField).toBeVisible();
        console.log('Payee Name field verified');

        const addressField = page.getByPlaceholder('Address');
        await expect(addressField).toBeVisible();
        console.log('Address field verified');

        const cityField = page.getByPlaceholder('City');
        await expect(cityField).toBeVisible();
        console.log('City field verified');

        const stateField = page.getByPlaceholder('State');
        await expect(stateField).toBeVisible();
        console.log('State field verified');

        const zipCodeField = page.getByPlaceholder('Zip Code');
        await expect(zipCodeField).toBeVisible();
        console.log('Zip Code field verified');

        const phoneField = page.getByPlaceholder('Phone #');
        await expect(phoneField).toBeVisible();
        console.log('Phone # field verified');

        const accountField = page.getByPlaceholder('Account #');
        await expect(accountField).toBeVisible();
        console.log('Account # field verified');

        const verifyAccountField = page.getByPlaceholder('Verify Account #');
        await expect(verifyAccountField).toBeVisible();
        console.log('Verify Account # field verified');

        const amountField = page.getByPlaceholder('Amount');
        await expect(amountField).toBeVisible();
        console.log('Amount field verified');

        // Verify From Account dropdown
        const fromAccountDropdown = page.locator('select[name="fromAccountId"]');
        await expect(fromAccountDropdown).toBeVisible();
        console.log('From Account dropdown verified');

        // Verify Send Payment button
        const sendPaymentButton = page.getByRole('button', { name: 'Send Payment' });
        await expect(sendPaymentButton).toBeVisible();
        console.log('Send Payment button verified');

        await allure.attachment(
          'Bill Pay Success',
          'Successfully navigated to Bill Pay page and verified all form fields',
          'text/plain',
        );
      } catch (error) {
        console.error('Bill Pay test failed:', error);
        await allure.attachment('Bill Pay Error', error.message, 'text/plain');
        throw error;
      }
    });
  });
});
