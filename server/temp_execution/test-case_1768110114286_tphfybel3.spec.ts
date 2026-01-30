import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test.describe('Forgot Login Information Test', () => {
  test('should navigate to forgot login page', async ({ page }) => {
    await allure.story('Forgot Login Information');
    await allure.feature('Customer Lookup');

    // Navigate to the base URL
    await test.step('Navigate to Parabank homepage', async () => {
      console.log('Navigating to Parabank homepage...');
      await page.goto('https://parabank.parasoft.com');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*parabank\/index\.htm/);
      console.log('Successfully navigated to Parabank homepage');
    });

    // Click the 'Forgot login info?' link
    await test.step('Click Forgot login info? link', async () => {
      console.log('Clicking Forgot login info? link...');

      try {
        // Try to find the link by text content first (most reliable)
        const forgotLink = page.locator('a:has-text("Forgot login info?")');
        await forgotLink.waitFor({ state: 'visible', timeout: 15000 });

        // Verify the link is clickable
        await expect(forgotLink).toBeVisible();
        await expect(forgotLink).toBeEnabled();

        // Click the link
        await forgotLink.click();

        console.log('Successfully clicked Forgot login info? link');
      } catch (error) {
        console.log('Could not find link by text, trying alternative selectors...');

        // Alternative: Try to find by href
        const forgotLinkByHref = page.locator('a[href*="lookup"]');
        await forgotLinkByHref.waitFor({ state: 'visible', timeout: 15000 });
        await expect(forgotLinkByHref).toBeVisible();
        await expect(forgotLinkByHref).toBeEnabled();
        await forgotLinkByHref.click();

        console.log('Successfully clicked link using href selector');
      }
    });

    // Verify navigation to the Customer Lookup page
    await test.step('Verify navigation to Customer Lookup page', async () => {
      console.log('Verifying navigation to Customer Lookup page...');
      await page.waitForLoadState('networkidle');

      // Wait for the page to load completely
      await page.waitForTimeout(1000);

      // Verify we're on the correct page
      await expect(page).toHaveURL(/.*parabank\/lookup\.htm/);

      // Verify the page title or heading to confirm we're on the Customer Lookup page
      const pageTitle = page.locator('h1, h2, h3').first();
      if (await pageTitle.isVisible()) {
        const titleText = await pageTitle.textContent();
        console.log(`Page title: ${titleText}`);
      }

      console.log('Successfully navigated to Customer Lookup page');
    });

    // Add final assertion to confirm task completion
    await test.step('Final verification', async () => {
      console.log('Performing final verification...');
      const currentUrl = page.url();
      expect(currentUrl).toContain('lookup.htm');
      console.log('Task completed successfully - on Customer Lookup page');
    });
  });
});
