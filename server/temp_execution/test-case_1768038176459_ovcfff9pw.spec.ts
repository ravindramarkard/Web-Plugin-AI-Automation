import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Forgot Login Information Test', () => {
  test('should navigate to forgot login page', async ({ page }) => {
    // Set up allure report
    await allure.description('Test to verify navigation to forgot login page');

    try {
      // Navigate to the base URL
      await test.step('Navigate to Parabank website', async () => {
        console.log('Navigating to Parabank website...');
        await page.goto('https://parabank.parasoft.com');
        await page.waitForLoadState('networkidle');
        console.log('Page loaded successfully');
      });

      // Click on the 'Forgot login info?' link
      await test.step('Click on Forgot login info link', async () => {
        console.log('Looking for Forgot login info link...');

        // Try multiple selector strategies in order of preference
        let forgotLink = null;

        // Strategy 1: Try to find by text content using getByRole
        try {
          forgotLink = page.getByRole('link', { name: 'Forgot login info?' });
          await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
          console.log('Found Forgot login info link using role + name');
        } catch (e) {
          console.log('Could not find using role + name, trying other strategies...');
        }

        // Strategy 2: Try to find by text content using getByText
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            forgotLink = page.getByText('Forgot login info?');
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Forgot login info link using text');
          } catch (e) {
            console.log('Could not find using text, trying xpath...');
          }
        }

        // Strategy 3: Try to find using xpath (last resort)
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            // Look for common patterns in the DOM structure
            forgotLink = page.locator('//a[contains(text(), "Forgot login info")]');
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Forgot login info link using xpath');
          } catch (e) {
            console.log('Could not find using xpath, trying alternative xpath...');
          }
        }

        // Strategy 4: Alternative xpath patterns
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            forgotLink = page.locator('//a[contains(@href, "lookup")]');
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found Forgot login info link using href pattern');
          } catch (e) {
            console.log('Could not find using href pattern');
          }
        }

        // Strategy 5: Look for any link that contains "lookup" or "forgot"
        if (!forgotLink || !(await forgotLink.isVisible())) {
          try {
            forgotLink = page.locator(
              '//a[contains(@href, "lookup") or contains(text(), "forgot") or contains(text(), "Forgot")]',
            );
            await forgotLink.waitFor({ state: 'visible', timeout: 5000 });
            console.log('Found link using combined pattern');
          } catch (e) {
            console.log('Could not find any suitable link');
          }
        }

        // If we found a link, click it
        if (forgotLink && (await forgotLink.isVisible())) {
          await forgotLink.click();
          console.log('Successfully clicked Forgot login info link');
        } else {
          throw new Error('Could not locate the Forgot login info link using any available selector strategy');
        }
      });

      // Verify we're on the Customer Lookup page
      await test.step('Verify navigation to Customer Lookup page', async () => {
        console.log('Verifying navigation to Customer Lookup page...');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        // Verify the URL contains the lookup page
        expect(currentUrl).toContain('lookup.htm');

        // Verify the page title or content indicates we're on the forgot login page
        const pageTitle = await page.title();
        console.log(`Page title: ${pageTitle}`);

        // Check for content that indicates this is the forgot login page
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('Customer Lookup'); // Common text on forgot login pages

        console.log('Successfully navigated to Customer Lookup page');
      });
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});
