import { test, expect } from '@playwright/test';

/**
 * Simple load test - Just check if page loads without crashing
 */
test.describe('Simple Load Test', () => {
  test('page should load without crashing', async ({ page }) => {
    console.log('Navigating to /...');
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    console.log('Page loaded, waiting 5 seconds...');
    await page.waitForTimeout(5000);

    console.log('Checking if page is still alive...');
    // Try to get URL without evaluate
    const url = page.url();
    console.log('Current URL:', url);

    // Try to find a simple element
    console.log('Looking for app root...');
    const appRoot = page.locator('#app');
    const count = await appRoot.count();
    console.log('App root count:', count);

    expect(count).toBeGreaterThan(0);
    expect(url).toContain('localhost');
  });
});
