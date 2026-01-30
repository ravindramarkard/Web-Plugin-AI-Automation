import { test, expect } from '@playwright/test';

test('home/AboutUs', async ({ page }) => {
  import type { Page } from '@playwright/test';
  import { test, expect } from '@playwright/test';
  import * as allure from 'allure-js-commons';

  test.describe('Home/AboutUs Navigation Test', () => {
    let page: Page;

    test.beforeEach(async ({ page: testPage }) => {
      page = testPage;
      await allure.description('Test navigation to About Us page');
      await allure.severity('critical');
    });

    test('Navigate to About Us page via footer link', async () => {
      try {
        // Step 1: Navigate to the base URL
        await test.step('Navigate to base URL', async () => {
          await allure.step('Navigate to https://parabank.parasoft.com', async () => {
            console.log('Navigating to base URL...');
            await page.goto('https://parabank.parasoft.com');
            await page.waitForLoadState('networkidle');
            console.log('Page loaded successfully');
          });
        });

        // Step 2: Click on the About Us link in the footer
        await test.step('Click About Us link in footer', async () => {
          await allure.step('Click the About Us link in the footer', async () => {
            console.log('Looking for About Us link in footer...');

            // Try multiple selector strategies to find the About Us link
            const aboutUsLink = page
              .locator('a[href*="about"]')
              .or(page.locator('a:has-text("About Us")'))
              .or(page.locator('a:has-text("About")'))
              .or(page.getByRole('link', { name: /about/i }))
              .or(page.locator('footer a').filter({ hasText: /about/i }))
              .or(page.locator('a[href$="about.htm"]'));

            // Wait for the link to be visible
            await aboutUsLink.waitFor({ state: 'visible', timeout: 15000 });

            // Verify the link is clickable
            await expect(aboutUsLink).toBeVisible();
            await expect(aboutUsLink).toBeEnabled();

            console.log('About Us link found, clicking...');
            await aboutUsLink.click();

            // Wait for navigation
            await page.waitForLoadState('networkidle');
            console.log('Navigation completed');
          });
        });

        // Step 3: Verify we're on the About Us page
        await test.step('Verify About Us page loaded', async () => {
          await allure.step('Verify the About Us page has loaded correctly', async () => {
            console.log('Verifying About Us page...');

            // Check URL contains about
            expect(page.url()).toContain('about');

            // Check for About Us heading or content
            const aboutHeading = page.locator('h1, h2, h3').filter({ hasText: /about/i });
            await aboutHeading.waitFor({ state: 'visible', timeout: 10000 });
            await expect(aboutHeading).toBeVisible();

            console.log('About Us page verified successfully');
          });
        });

        console.log('Test completed successfully');
      } catch (error) {
        console.error('Test failed:', error);
        await allure.attachment('Error screenshot', await page.screenshot(), 'image/png');
        throw error;
      }
    });
  });
});
