import { test } from './custom-test';
import { expect } from '@playwright/test';

test('Login and Click to Bill Pay (Copy)', async ({ page, request }) => {
  import { test } from './custom-test';
  import { expect } from '@playwright/test';
  import * as allure from 'allure-js-commons';

  test.describe('ParaBank Login and Bill Pay Navigation', () => {
    test('should login successfully and navigate to Bill Pay', async ({ page }) => {
      // Test configuration
      const baseUrl = process.env.BASE_URL || 'https://parabank.parasoft.com/parabank/index.htm';
      const username = process.env.USERNAME || 'testuser';
      const password = process.env.PASSWORD || 'testpass';

      await test.step('Navigate to ParaBank homepage', async () => {
        try {
          await allure.step('Navigate to ParaBank homepage', async () => {
            console.log(`Navigating to ${baseUrl}`);
            await page.goto(baseUrl);
            await page.waitForLoadState('networkidle');

            // Verify page loaded successfully
            await expect(page).toHaveURL(/parabank\/index\.htm/);
            console.log('Successfully navigated to ParaBank homepage');
          });
        } catch (error) {
          console.error('Failed to navigate to homepage:', error);
          await allure.attachment('Navigation Error', error.message, 'text/plain');
          throw error;
        }
      });

      await test.step('Enter username', async () => {
        try {
          await allure.step('Enter username in login form', async () => {
            console.log('Attempting to locate username field');

            // Try multiple selector strategies for username field
            const usernameSelectors = [
              'input[name="username"]',
              'input[id="username"]',
              'input[placeholder*="username"]',
              'input[placeholder*="Username"]',
              'input[type="text"]:first-of-type',
              'input[name="user"]',
              'input[id="user"]',
            ];

            let usernameField = null;
            for (const selector of usernameSelectors) {
              try {
                usernameField = page.locator(selector);
                await usernameField.waitFor({ state: 'visible', timeout: 2000 });
                console.log(`Found username field with selector: ${selector}`);
                break;
              } catch (e) {
                // Continue to next selector
              }
            }

            if (!usernameField) {
              throw new Error('Could not locate username field with any selector');
            }

            await usernameField.fill(username);
            console.log('Username entered successfully');

            // Verify username was entered
            await expect(usernameField).toHaveValue(username);
          });
        } catch (error) {
          console.error('Failed to enter username:', error);
          await allure.attachment('Username Entry Error', error.message, 'text/plain');
          throw error;
        }
      });

      await test.step('Enter password', async () => {
        try {
          await allure.step('Enter password in login form', async () => {
            console.log('Attempting to locate password field');

            // Try multiple selector strategies for password field
            const passwordSelectors = [
              'input[name="password"]',
              'input[id="password"]',
              'input[placeholder*="password"]',
              'input[placeholder*="Password"]',
              'input[type="password"]',
              'input[name="pass"]',
              'input[id="pass"]',
            ];

            let passwordField = null;
            for (const selector of passwordSelectors) {
              try {
                passwordField = page.locator(selector);
                await passwordField.waitFor({ state: 'visible', timeout: 2000 });
                console.log(`Found password field with selector: ${selector}`);
                break;
              } catch (e) {
                // Continue to next selector
              }
            }

            if (!passwordField) {
              throw new Error('Could not locate password field with any selector');
            }

            await passwordField.fill(password);
            console.log('Password entered successfully');

            // Verify password was entered (value check for password fields)
            await expect(passwordField).toHaveValue(password);
          });
        } catch (error) {
          console.error('Failed to enter password:', error);
          await allure.attachment('Password Entry Error', error.message, 'text/plain');
          throw error;
        }
      });

      await test.step('Click login button', async () => {
        try {
          await allure.step('Click the login button to authenticate', async () => {
            console.log('Attempting to locate login button');

            // Try multiple selector strategies for login button
            const loginButtonSelectors = [
              'input[type="submit"][value*="Log"]',
              'input[type="submit"][value*="log"]',
              'button:has-text("Log")',
              'button:has-text("log")',
              'input[type="submit"]',
              'button[type="submit"]',
              'a:has-text("Log")',
              '.login-button',
              '#login-button',
              'button:has-text("Sign")',
              'button:has-text("sign")',
            ];

            let loginButton = null;
            for (const selector of loginButtonSelectors) {
              try {
                loginButton = page.locator(selector);
                await loginButton.waitFor({ state: 'visible', timeout: 2000 });
                console.log(`Found login button with selector: ${selector}`);
                break;
              } catch (e) {
                // Continue to next selector
              }
            }

            if (!loginButton) {
              throw new Error('Could not locate login button with any selector');
            }

            await loginButton.click();
            console.log('Login button clicked successfully');

            // Wait for navigation after login
            await page.waitForLoadState('networkidle');

            // Verify successful login with multiple possible indicators
            const loginSuccessSelectors = [
              'text=Logout',
              'a:has-text("Logout")',
              'text=Welcome',
              'text=Accounts Overview',
              '.logout',
              '#logout',
            ];

            let loginSuccess = false;
            for (const selector of loginSuccessSelectors) {
              try {
                await expect(page.locator(selector)).toBeVisible({ timeout: 5000 });
                console.log(`Login successful - found ${selector}`);
                loginSuccess = true;
                break;
              } catch (e) {
                // Continue to next selector
              }
            }

            if (!loginSuccess) {
              // Check if we're on a different page after login
              const currentUrl = page.url();
              if (!currentUrl.includes('index.htm')) {
                console.log('Login successful - URL changed to:', currentUrl);
              } else {
                throw new Error('Login may have failed - still on login page');
              }
            }
          });
        } catch (error) {
          console.error('Failed to click login button:', error);
          await allure.attachment('Login Button Error', error.message, 'text/plain');
          throw error;
        }
      });

      await test.step('Navigate to Bill Pay section', async () => {
        try {
          await allure.step('Click on Bill Pay link/menu item', async () => {
            console.log('Attempting to locate Bill Pay navigation');

            // Wait a moment for page to fully load after login
            await page.waitForTimeout(1000);

            // Try multiple selector strategies for Bill Pay link
            const billPaySelectors = [
              'a:has-text("Bill Pay")',
              'a:has-text("bill pay")',
              'a:has-text("BillPay")',
              'a[href*="billpay"]',
              'a[href*="bill-pay"]',
              'button:has-text("Bill Pay")',
              'li:has-text("Bill Pay") a',
              '.bill-pay-link',
              '#bill-pay-link',
              'a[title*="Bill Pay"]',
              'a[aria-label*="Bill Pay"]',
            ];

            let billPayLink = null;
            for (const selector of billPaySelectors) {
              try {
                billPayLink = page.locator(selector);
                await billPayLink.waitFor({ state: 'visible', timeout: 2000 });
                console.log(`Found Bill Pay link with selector: ${selector}`);
                break;
              } catch (e) {
                // Continue to next selector
              }
            }

            if (!billPayLink) {
              throw new Error('Could not locate Bill Pay link with any selector');
            }

            await billPayLink.click();
            console.log('Bill Pay link clicked successfully');

            // Wait for navigation to complete
            await page.waitForLoadState('networkidle');

            // Verify we're on the Bill Pay page
            await expect(page.locator('text=Bill Pay')).toBeVisible({ timeout: 10000 });
            console.log('Successfully navigated to Bill Pay page');
          });
        } catch (error) {
          console.error('Failed to navigate to Bill Pay:', error);
          await allure.attachment('Bill Pay Navigation Error', error.message, 'text/plain');
          throw error;
        }
      });

      await test.step('Verify Bill Pay page loaded correctly', async () => {
        try {
          await allure.step('Verify Bill Pay page elements are visible', async () => {
            console.log('Verifying Bill Pay page loaded correctly');

            // Check for common Bill Pay page elements
            const billPayPageSelectors = [
              'text=Bill Pay',
              'text=Pay Bills',
              'form',
              'input[name="payee"]',
              'input[name="amount"]',
              'button[type="submit"]',
              'select[name="fromAccount"]',
            ];

            let foundElements = 0;
            for (const selector of billPayPageSelectors) {
              try {
                const element = page.locator(selector);
                if (await element.isVisible({ timeout: 1000 })) {
                  foundElements++;
                  console.log(`Found element: ${selector}`);
                }
              } catch (e) {
                // Element not found, continue
              }
            }

            // At minimum, we should find the "Bill Pay" text
            await expect(page.locator('text=Bill Pay')).toBeVisible();
            console.log(`Bill Pay page verification complete - found ${foundElements} expected elements`);

            // Take screenshot for verification
            await page.screenshot({ path: 'bill-pay-page.png', fullPage: true });
            await allure.attachment('Bill Pay Page Screenshot', 'bill-pay-page.png', 'image/png');
          });
        } catch (error) {
          console.error('Failed to verify Bill Pay page:', error);
          await allure.attachment('Bill Pay Verification Error', error.message, 'text/plain');
          throw error;
        }
      });
    });
  });
});
