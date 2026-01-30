import { test, ensureLoggedIn } from './custom-test';
import { expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

test('Login and Click to Transfer Funds', async ({ page }) => {
  await allure.tag('TransferFunds');
  await allure.description('Test to login and navigate to transfer funds page');

  try {
    await ensureLoggedIn(page);

    // Click transfer funds link (Step 5)
    await test.step('Click transfer funds link', async () => {
      const transferFundsLink = page.locator('a[href="transfer.htm"]');
      await transferFundsLink.waitFor({ state: 'visible', timeout: 15000 });
      await transferFundsLink.click();
      await page.waitForLoadState('networkidle');
      console.log('Clicked transfer funds link');
    });

    // Verify we are on the transfer funds page
    await test.step('Verify transfer funds page is loaded', async () => {
      await expect(page).toHaveURL(/.*transfer.htm/);
      const transferFundsHeader = page.getByRole('heading', { name: 'Transfer Funds' });
      await expect(transferFundsHeader).toBeVisible();
      console.log('Verified transfer funds page is loaded');
    });
  } catch (error) {
    console.error('Test failed with error:', error);
    throw error;
  }
});
