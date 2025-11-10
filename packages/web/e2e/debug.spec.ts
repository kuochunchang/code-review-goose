import { test, expect } from '@playwright/test';

/**
 * Debug test - Capture console errors and page crashes
 */
test.describe('Debug Tests', () => {
  test('capture page errors and console logs', async ({ page }) => {
    const errors: string[] = [];
    const consoleLogs: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}\n${error.stack}`);
    });

    // Listen for request failures
    page.on('requestfailed', (request) => {
      errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    try {
      console.log('Navigating to /...');
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

      console.log('Waiting a bit for app to initialize...');
      await page.waitForTimeout(2000);

      console.log('Checking page state...');
      const pageState = await page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyExists: !!document.body,
          bodyChildren: document.body?.children.length || 0,
        };
      });
      console.log('Page state:', pageState);

      console.log('Taking viewport screenshot (not fullPage)...');
      await page.screenshot({
        path: 'packages/web/test-results/debug-screenshot.png',
        fullPage: false,
      });

      console.log('Checking for app root element...');
      const appExists = await page.locator('#app').count();
      console.log('App element exists:', appExists > 0);
    } catch (error) {
      console.error('Error during page load:', error);
    }

    // Print collected errors and logs
    console.log('\n=== Console Logs ===');
    consoleLogs.forEach((log) => console.log(log));

    console.log('\n=== Errors ===');
    errors.forEach((error) => console.log(error));

    // Check if page is still alive
    const isPageAlive = await page
      .evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyContent: document.body?.innerText?.substring(0, 200),
        };
      })
      .catch((err) => {
        console.error('Page is crashed or not responding:', err);
        return null;
      });

    console.log('\n=== Page State ===');
    console.log(JSON.stringify(isPageAlive, null, 2));

    // This test should pass - we're just collecting information
    expect(true).toBe(true);
  });
});
