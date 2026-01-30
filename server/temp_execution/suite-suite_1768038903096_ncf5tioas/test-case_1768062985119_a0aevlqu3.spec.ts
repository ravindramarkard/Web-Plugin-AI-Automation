import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Forgot Login Information Flow', () => {
  test('should navigate to forgot login page and verify the lookup form is displayed', async ({ page }) => {
    // Start allure test
    await allure.step('Starting forgot login information test', async () => {
      console.log('Starting test: forgot login information flow');
    });

    // Navigate to the base URL
    await allure.step('Navigate to ParaBank home page', async () => {
      console.log('Navigating to https://parabank.parasoft.com');
      await page.goto('https://parabank.parasoft.com');
      await page.waitForLoadState('networkidle');
      console.log('Page loaded successfully');
    });

    // Verify we are on the correct page
    await allure.step('Verify we are on the correct home page', async () => {
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      expect(pageTitle).toBe('ParaBank | Welcome | Online Banking');
    });

    // Click on the "Forgot login info?" link
    await allure.step('Click on "Forgot login info?" link', async () => {
      console.log('Attempting to find and click "Forgot login info?" link');

      try {
        // Try to find the link by text content first
        const forgotLink = page.getByText('Forgot login info?', { exact: true });
        await forgotLink.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Found "Forgot login info?" link by text');
        await forgotLink.click();
      } catch (error) {
        console.log('Could not find link by text, trying alternative selectors...');

        // Try to find by href
        const forgotLinkByHref = page.locator('a[href*="lookup"]');
        if (await forgotLinkByHref.isVisible()) {
          console.log('Found "Forgot login info?" link by href');
          await forgotLinkByHref.click();
        } else {
          // Try to find by partial text match
          const forgotLinkByPartial = page.getByText('Forgot login', { exact: false });
          if (await forgotLinkByPartial.isVisible()) {
            console.log('Found "Forgot login info?" link by partial text');
            await forgotLinkByPartial.click();
          } else {
            throw new Error('Could not locate "Forgot login info?" link using any available selector');
          }
        }
      }

      console.log('Successfully clicked "Forgot login info?" link');
    });

    // Wait for navigation to the lookup page
    await allure.step('Wait for navigation to lookup page', async () => {
      console.log('Waiting for navigation to lookup page...');
      await page.waitForURL('**/lookup.htm', { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      console.log('Successfully navigated to lookup page');
    });

    // Verify we are on the correct page
    await allure.step('Verify we are on the lookup page', async () => {
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
      expect(currentUrl).toContain('/lookup.htm');

      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      expect(pageTitle).toBe('ParaBank | Customer Lookup');
    });

    // Verify the lookup form is displayed
    await allure.step('Verify lookup form is displayed', async () => {
      console.log('Verifying lookup form elements are visible...');

      // Check for first name field
      const firstNameField = page.getByPlaceholder('First Name');
      await firstNameField.waitFor({ state: 'visible', timeout: 15000 });
      console.log('First name field is visible');

      // Check for last name field
      const lastNameField = page.getByPlaceholder('Last Name');
      await lastNameField.waitFor({ state: 'visible', timeout: 15000 });
      console.log('Last name field is visible');

      // Check for address fields
      const addressField = page.getByPlaceholder('Address');
      await addressField.waitFor({ state: 'visible', timeout: 15000 });
      console.log('Address field is visible');

      // Check for SSN field
      const ssnField = page.getByPlaceholder('SSN');
      await ssnField.waitFor({ state: 'visible', timeout: 15000 });
      console.log('SSN field is visible');

      // Check for Find My Login Info button
      const findButton = page.getByRole('button', { name: 'Find My Login Info' });
      await findButton.waitFor({ state: 'visible', timeout: 15000 });
      console.log('Find My Login Info button is visible');
    });

    // Add final assertion to complete the test
    await allure.step('Final verification of successful navigation', async () => {
      console.log(
        'I have successfully completed the task. I navigated to https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC and clicked on the "Forgot login info?" link. The page has now redirected to the customer lookup page at https://parabank.parasoft.com/parabank/lookup.htm, which is the forgot login information page.',
      );

      // Verify success by checking the page content
      const heading = page.getByRole('heading', { name: 'Customer Lookup' });
      await heading.waitFor({ state: 'visible', timeout: 15000 });
      console.log('Customer Lookup heading is visible - test successful');
    });
  });
});
