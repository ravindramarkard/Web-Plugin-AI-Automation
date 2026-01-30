import { test, ensureLoggedIn } from './custom-test';
import { expect } from '@playwright/test';

test('Navigate to Products and Forum from logged-in session', async ({ page }) => {
  await ensureLoggedIn(page);

  await page.goto(process.env.TEST_BASE_URL || 'https://parabank.parasoft.com/parabank/index.htm');
  await page.locator('#footerPanel').getByRole('link', { name: 'Products' }).click();

  await page.goto(process.env.TEST_BASE_URL || 'https://parabank.parasoft.com/parabank/index.htm');
  await page.getByRole('link', { name: 'Forum' }).click();

  await expect(page).toHaveURL(/forums\.parasoft\.com/);
});
