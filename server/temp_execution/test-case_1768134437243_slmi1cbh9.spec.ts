import { test } from './custom-test';
import { expect } from '@playwright/test';

test('Register with dynamic data', async ({ page }) => {
  const BASE_URL = process.env.BASE_URL || process.env.TEST_BASE_URL || 'https://example.com';
  const USERNAME = process.env.TEST_USERNAME || process.env.USERNAME || 'testuser';
  const PASSWORD = process.env.TEST_PASSWORD || process.env.PASSWORD || 'password';

  const randomSuffix = Date.now();
  const dynamicEmail = `test_${randomSuffix}@example.com`;
  const dynamicPhone = `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dynamicName = `User ${randomSuffix}`;
  const dynamicAddress = `${Math.floor(Math.random() * 999)} Random St`;
  const dynamicCity = `City_${randomSuffix}`;
  const dynamicZip = `${Math.floor(10000 + Math.random() * 90000)}`;
  const dynamicText = `Random text content ${randomSuffix}`;
  const dynamicNumber = Math.floor(Math.random() * 100).toString();

  await page.goto(`${BASE_URL}/register`);

  await page.fill('[name="name"], #name, input[name*="name"], input[placeholder*="name"]', dynamicName);
  await page.fill('[name="email"], #email, input[name*="email"], input[placeholder*="email"]', dynamicEmail);

  await page.click('[type="submit"], button[type="submit"], button:has-text("Register")');

  await expect(page).toHaveURL(/.*example\.com.*/);
});
