import { test, ensureLoggedIn } from '../custom-test';
import { expect } from '@playwright/test';

test('test', async ({ page }) => {
  await ensureLoggedIn(page);

  await page.goto('https://parabank.parasoft.com/parabank/index.htm');
  await page.locator('#footerPanel').getByRole('link', { name: 'Products' }).click();
  await page.goto('https://parabank.parasoft.com/parabank/index.htm');
  await page.getByRole('link', { name: 'Forum' }).click();
});
