import { test, expect } from '@playwright/test';

/**
 * Simple load test - Check if page loads without crashing
 */
test.describe('Simple Load Test', () => {
  test('page should load without crashing', async ({ page }) => {
    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for app root element to be visible
    const appRoot = page.locator('#app');
    await expect(appRoot).toBeVisible({ timeout: 10000 });

    // Verify URL is correct
    expect(page.url()).toContain('localhost');

    // Verify page title is set
    await expect(page).toHaveTitle(/Goose Code Review|Code Review/, { timeout: 5000 });
  });

  test('should have navigation and main content areas', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check for main navigation/header
    const header = page.locator('header, .v-toolbar, nav').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Check for main content area
    const main = page.locator('main, #app > div').first();
    await expect(main).toBeVisible({ timeout: 10000 });
  });
});
