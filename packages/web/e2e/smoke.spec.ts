import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Basic application loading and navigation tests
 * Note: These tests require the backend server to be running
 */
test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for these tests
    test.setTimeout(60000);

    // Navigate to the app before each test
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
  });

  test('should load the application and display file tree', async ({ page }) => {
    // Wait for URL to update after redirect
    await page.waitForURL('**/review', { timeout: 10000 });

    // Check that we're on the review page (default route)
    expect(page.url()).toContain('/review');

    // Check for file tree component (data-testid added for E2E)
    const fileTree = page.locator('[data-testid="file-tree"]');
    await expect(fileTree).toBeVisible({ timeout: 15000 });

    // Verify file tree has loaded content
    await expect(fileTree).toContainText(/Files|No files found/, { timeout: 5000 });
  });

  test('should display code viewer component', async ({ page }) => {
    // Check for code viewer component
    const codeViewer = page.locator('[data-testid="code-viewer"]');
    await expect(codeViewer).toBeVisible({ timeout: 10000 });

    // Verify code viewer is ready
    const editorContainer = page.locator('.monaco-editor, [data-testid="code-viewer"] > div').first();
    await expect(editorContainer).toBeVisible({ timeout: 5000 });
  });

  test('should display analysis panel component', async ({ page }) => {
    // Check for analysis panel component
    const analysisPanel = page.locator('[data-testid="analysis-panel"]');
    await expect(analysisPanel).toBeVisible({ timeout: 10000 });

    // Verify analysis panel has basic structure
    await expect(analysisPanel).toContainText(/Analysis|Review|No analysis/, { timeout: 5000 });
  });

  test('should be able to navigate to UML page', async ({ page }) => {
    // Navigate to UML page
    await page.goto('/uml', { waitUntil: 'networkidle' });

    // Verify we're on the UML page
    expect(page.url()).toContain('/uml');

    // Check for UML viewer component
    const umlViewer = page.locator('[data-testid="uml-viewer"]');
    await expect(umlViewer).toBeVisible({ timeout: 10000 });

    // Verify UML viewer has diagram type buttons
    await expect(page.locator('text=CLASS')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=FLOW')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=SEQUENCE')).toBeVisible({ timeout: 5000 });
  });

  test('should handle navigation between pages', async ({ page }) => {
    // Start on review page
    await page.waitForURL('**/review', { timeout: 10000 });
    expect(page.url()).toContain('/review');

    // Navigate to UML page
    await page.goto('/uml', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/uml');

    // Navigate back to review page
    await page.goto('/review', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/review');

    // Verify review page components are still visible
    const fileTree = page.locator('[data-testid="file-tree"]');
    await expect(fileTree).toBeVisible({ timeout: 10000 });
  });
});
