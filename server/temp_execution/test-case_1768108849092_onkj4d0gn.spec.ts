import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

const BASE_URL = process.env.BASE_URL || 'https://parabank.parasoft.com';

test.describe('Forgot Login Info Test', () => {
  test('should navigate to forgot login page and verify form is present', async ({ page }) => {
    // Set up allure test report
    await allure.description(
      'Test that verifies the forgot login functionality by navigating to the customer lookup form',
    );

    try {
      // Navigate to the base URL
      await test.step('Navigate to ParaBank homepage', async () => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        console.log('Successfully navigated to ParaBank homepage');
      });

      // Click on the 'Forgot login info?' link
      await test.step('Click on Forgot login info? link', async () => {
        // Try to find the link using multiple selectors in priority order
        let forgotLink = null;

        // First try by text content (most reliable for this case)
        try {
          forgotLink = page.getByText('Forgot login info?', { exact: true });
          await forgotLink.waitFor({ state: 'visible', timeout: 10000 });
          console.log('Found forgot login link by text content');
        } catch (e) {
          console.log('Could not find link by text, trying alternative selectors...');
        }

        // If not found by text, try by href
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            forgotLink = page.locator('a[href*="lookup.htm"]');
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found forgot login link by href');
          } catch (e) {
            console.log('Could not find link by href, trying by role');
          }
        }

        // If still not found, try by role and accessible name
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            forgotLink = page.getByRole('link', { name: 'Forgot login info?' });
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found forgot login link by role');
          } catch (e) {
            console.log('Could not find link by role, trying XPath');
          }
        }

        // If still not found, use XPath (last resort)
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            forgotLink = page.locator('xpath=//a[contains(text(), "Forgot login info?")]');
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found forgot login link by XPath');
          } catch (e) {
            console.log('Could not find forgot login link using any selector method');
            throw new Error('Unable to locate the "Forgot login info?" link');
          }
        }

        // Verify the link is clickable and click it
        await expect(forgotLink).toBeVisible();
        await expect(forgotLink).toBeEnabled();

        // Add allure step annotation
        await allure.step('Clicking on Forgot login info? link', async () => {
          await forgotLink.click();
        });

        console.log('Successfully clicked on Forgot login info? link');
      });

      // Wait for navigation to the lookup page
      await test.step('Verify navigation to customer lookup page', async () => {
        await page.waitForLoadState('networkidle');

        // Verify we're on the lookup page by checking URL
        await expect(page).toHaveURL(/.*lookup\.htm/);
        console.log('Successfully navigated to customer lookup page');

        // Verify the customer lookup form is present
        const lookupForm = page.locator('form[action="lookup.htm"]');
        await expect(lookupForm).toBeVisible();
        console.log('Customer lookup form is visible');

        // Verify form contains expected fields
        const firstNameField = page.locator('input[name="firstName"]');
        const lastNameField = page.locator('input[name="lastName"]');
        const addressField = page.locator('input[name="address\.street"]');
        const cityField = page.locator('input[name="address\.city"]');
        const stateField = page.locator('input[name="address\.state"]');
        const zipCodeField = page.locator('input[name="address\.zipCode"]');
        const ssnField = page.locator('input[name="ssn"]');

        await expect(firstNameField).toBeVisible();
        await expect(lastNameField).toBeVisible();
        await expect(addressField).toBeVisible();
        await expect(cityField).toBeVisible();
        await expect(stateField).toBeVisible();
        await expect(zipCodeField).toBeVisible();
        await expect(ssnField).toBeVisible();

        console.log('All required form fields are present and visible');
      });

      // Add success assertion
      await test.step('Verify task completion', async () => {
        await allure.step('Task completed successfully', async () => {
          // Verify the page title or heading indicates we're on the forgot login page
          const pageTitle = page.locator('h1, h2, h3').filter({ hasText: /Forgot|Lookup/i });
          if (await pageTitle.isVisible()) {
            console.log('Page heading confirms we are on the forgot login page');
          } else {
            console.log('Could not find specific heading, but form is present');
          }

          // Final assertion that we've reached the customer lookup form
          const lookupForm = page.locator('form[action="lookup.htm"]');
          await expect(lookupForm).toBeVisible();
        });
      });
    } catch (error) {
      console.error('Test failed with error:', error);
      await allure.attachment('Error details', JSON.stringify(error, null, 2), 'application/json');
      throw error;
    }
  });
});
