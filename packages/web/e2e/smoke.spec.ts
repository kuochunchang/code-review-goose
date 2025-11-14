import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Basic application loading and navigation tests
 * Note: These tests require the backend server to be running on port 3456
 */
test.describe('Smoke Tests', () => {
  test.beforeEach(async () => {
    // Set a longer timeout for these tests
    test.setTimeout(60000);
  });

  test('should load the application and display file tree', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load and navigation to complete
    await page.waitForLoadState('networkidle');

    // Wait for URL to update after redirect
    await page.waitForURL('**/review', { timeout: 5000 });

    // Check that we're on the review page (default route)
    expect(page.url()).toContain('/review');

    // Check for file tree component (data-testid added for E2E)
    const fileTree = page.locator('[data-testid="file-tree"]');
    await expect(fileTree).toBeVisible({ timeout: 15000 });
  });

  test('should display code viewer component', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for code viewer component
    const codeViewer = page.locator('[data-testid="code-viewer"]');
    await expect(codeViewer).toBeVisible({ timeout: 10000 });
  });

  test('should display analysis panel component', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for analysis panel component
    const analysisPanel = page.locator('[data-testid="analysis-panel"]');
    await expect(analysisPanel).toBeVisible({ timeout: 10000 });
  });

  test('should be able to navigate to UML page', async ({ page }) => {
    await page.goto('/uml');
    await page.waitForLoadState('networkidle');

    // Verify we're on the UML page
    expect(page.url()).toContain('/uml');

    // Check for UML page content (use .first() to handle multiple matches)
    const umlPage = page.locator('.uml-page, .uml-content').first();
    await expect(umlPage).toBeVisible({ timeout: 5000 });
  });
});
