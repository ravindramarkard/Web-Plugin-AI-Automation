import { test, expect } from '@playwright/test';
import * as allure from 'allure-js-commons';

const allureRuntime = allure.allure();

test.describe('Contact Us Form Test', () => {
  test('successfully submits contact form', async ({ page }) => {
    allureRuntime.feature('Contact Form');
    allureRuntime.story('Submit Contact Information');

    // Navigate to the Parabank URL
    await test.step('Navigate to Parabank URL', async () => {
      allureRuntime.step('Navigating to https://parabank.parasoft.com');
      await page.goto('https://parabank.parasoft.com');
      await page.waitForLoadState('networkidle');
      console.log('Successfully navigated to Parabank URL');
    });

    // Click on Contact Us link
    await test.step('Click Contact Us link', async () => {
      allureRuntime.step('Clicking Contact Us link');
      try {
        // Try multiple selectors in order of preference
        const contactLink = await page
          .locator('a[href*="contact"], a:has-text("Contact"), a[href*="contact.htm"]')
          .first();
        await contactLink.waitFor({ state: 'visible', timeout: 15000 });
        await contactLink.click();
        console.log('Successfully clicked Contact Us link');
      } catch (error) {
        console.log('Contact link not found with preferred selectors, trying xpath');
        // Fallback to xpath if other selectors fail
        const contactLink = await page.locator('xpath=//a[contains(@href, "contact")]').first();
        await contactLink.waitFor({ state: 'visible', timeout: 15000 });
        await contactLink.click();
        console.log('Successfully clicked Contact Us link using xpath');
      }
      await page.waitForLoadState('networkidle');
    });

    // Fill out the contact form
    await test.step('Fill out contact form', async () => {
      allureRuntime.step('Filling out contact form details');

      // Fill Name field
      try {
        const nameField = await page
          .locator('input[name="name"], input#name, input[placeholder*="Name"], input[placeholder*="name"]')
          .first();
        await nameField.waitFor({ state: 'visible', timeout: 15000 });
        await nameField.fill('John Doe');
        console.log('Successfully filled Name field');
      } catch (error) {
        console.log('Name field not found with preferred selectors, trying xpath');
        const nameField = await page.locator('xpath=//input[@name="name" or @id="name"]').first();
        await nameField.waitFor({ state: 'visible', timeout: 15000 });
        await nameField.fill('John Doe');
        console.log('Successfully filled Name field using xpath');
      }

      // Fill Email field
      try {
        const emailField = await page
          .locator('input[name="email"], input#email, input[type="email"], input[placeholder*="Email"]')
          .first();
        await emailField.waitFor({ state: 'visible', timeout: 15000 });
        await emailField.fill('john.doe@example.com');
        console.log('Successfully filled Email field');
      } catch (error) {
        console.log('Email field not found with preferred selectors, trying xpath');
        const emailField = await page.locator('xpath=//input[@name="email" or @id="email" or @type="email"]').first();
        await emailField.waitFor({ state: 'visible', timeout: 15000 });
        await emailField.fill('john.doe@example.com');
        console.log('Successfully filled Email field using xpath');
      }

      // Fill Phone field
      try {
        const phoneField = await page
          .locator('input[name="phone"], input#phone, input[placeholder*="Phone"], input[placeholder*="phone"]')
          .first();
        await phoneField.waitFor({ state: 'visible', timeout: 15000 });
        await phoneField.fill('555-123-4567');
        console.log('Successfully filled Phone field');
      } catch (error) {
        console.log('Phone field not found with preferred selectors, trying xpath');
        const phoneField = await page.locator('xpath=//input[@name="phone" or @id="phone"]').first();
        await phoneField.waitFor({ state: 'visible', timeout: 15000 });
        await phoneField.fill('555-123-4567');
        console.log('Successfully filled Phone field using xpath');
      }

      // Fill Message field
      try {
        const messageField = await page
          .locator(
            'textarea[name="message"], textarea#message, textarea[placeholder*="Message"], textarea[placeholder*="message"]',
          )
          .first();
        await messageField.waitFor({ state: 'visible', timeout: 15000 });
        await messageField.fill('inquiry about banking services');
        console.log('Successfully filled Message field');
      } catch (error) {
        console.log('Message field not found with preferred selectors, trying xpath');
        const messageField = await page.locator('xpath=//textarea[@name="message" or @id="message"]').first();
        await messageField.waitFor({ state: 'visible', timeout: 15000 });
        await messageField.fill('inquiry about banking services');
        console.log('Successfully filled Message field using xpath');
      }
    });

    // Submit the form
    await test.step('Submit the contact form', async () => {
      allureRuntime.step('Submitting the contact form');
      try {
        // Try multiple selectors for submit button
        const submitButton = await page
          .locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")')
          .first();
        await submitButton.waitFor({ state: 'visible', timeout: 15000 });
        await submitButton.click();
        console.log('Successfully clicked submit button');
      } catch (error) {
        console.log('Submit button not found with preferred selectors, trying xpath');
        const submitButton = await page
          .locator(
            'xpath=//button[@type="submit" or @type="submit" or contains(text(), "Submit") or contains(text(), "Send")]',
          )
          .first();
        await submitButton.waitFor({ state: 'visible', timeout: 15000 });
        await submitButton.click();
        console.log('Successfully clicked submit button using xpath');
      }
      await page.waitForLoadState('networkidle');
    });

    // Verify successful submission
    await test.step('Verify form submission success', async () => {
      allureRuntime.step('Verifying form submission success');

      // Wait for success message to appear
      try {
        await page.locator('text=Thank you John Doe').waitFor({ state: 'visible', timeout: 15000 });
        await page
          .locator('text=A Customer Care Representative will be contacting you')
          .waitFor({ state: 'visible', timeout: 15000 });

        // Verify the success messages are visible
        const thankYouMessage = await page.locator('text=Thank you John Doe').isVisible();
        const representativeMessage = await page
          .locator('text=A Customer Care Representative will be contacting you')
          .isVisible();

        expect(thankYouMessage).toBe(true);
        expect(representativeMessage).toBe(true);

        console.log('Form submission verified successfully');
        allureRuntime.attachment('Success screenshot', await page.screenshot(), 'image/png');
      } catch (error) {
        console.error('Form submission verification failed:', error);
        allureRuntime.attachment('Error screenshot', await page.screenshot(), 'image/png');
        throw error;
      }
    });

    // Log completion
    await test.step('Log completion', async () => {
      allureRuntime.step('Logging task completion');
      console.log(
        'I have successfully completed the task. I navigated to the Parabank URL https://parabank.parasoft.com/parabank/index.htm?ConnType=JDBC, clicked on the Contact Us link, filled out all the contact form details (Name: John Doe, Email: john.doe@example.com, Phone: 555-123-4567, Message: inquiry about banking services), and submitted the form to customer care. The page now shows "Thank you John Doe" and "A Customer Care Representative will be contacting you." indicating the form was successfully submitted.',
      );
    });
  });
});
