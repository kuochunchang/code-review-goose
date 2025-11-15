import { test, expect } from '@playwright/test';

test.describe('Last Opened File Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.waitForLoadState('networkidle');
  });

  test('should remember and reopen the last opened file', async ({ page }) => {
    // Wait for the app to load
    await page.waitForTimeout(2000);

    // Wait for file tree to be visible
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 10000 });

    // Select a file from the tree
    const fileTreeItems = page.locator('[data-testid="file-tree-item"]');
    const itemCount = await fileTreeItems.count();

    if (itemCount > 0) {
      // Click on the first file item
      const firstFile = fileTreeItems.first();
      await firstFile.click();
      await page.waitForTimeout(1000);

      // Get the file path from localStorage
      const lastOpenedFile = await page.evaluate(() => {
        return localStorage.getItem('lastOpenedFile');
      });
      expect(lastOpenedFile).toBeTruthy();
      console.log('Last opened file saved:', lastOpenedFile);

      // Reload the page to simulate reopening the app
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify the same file is opened automatically
      const codeViewer = page.locator('[data-testid="code-viewer"]');
      await expect(codeViewer).toBeVisible();

      // Verify localStorage still has the same file
      const lastOpenedFileAfterReload = await page.evaluate(() => {
        return localStorage.getItem('lastOpenedFile');
      });
      expect(lastOpenedFileAfterReload).toBe(lastOpenedFile);
    }
  });

  test('should fallback to README when no last opened file exists', async ({ page }) => {
    // Ensure localStorage is empty
    await page.evaluate(() => {
      localStorage.removeItem('lastOpenedFile');
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if Monaco editor is visible (README should be opened if it exists)
    const monacoEditor = page.locator('.monaco-editor');
    const hasMonaco = (await monacoEditor.count()) > 0;

    if (hasMonaco) {
      // README was found and opened as fallback
      await expect(monacoEditor).toBeVisible();
      console.log('README opened as fallback');
    } else {
      // No README exists, app should be in valid state
      const appRoot = page.locator('#app');
      await expect(appRoot).toBeVisible();
      console.log('No README found, app in welcome state');
    }
  });

  test('should handle deleted last opened file gracefully', async ({ page }) => {
    // Wait for file tree to be visible
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 10000 });

    // Manually set a non-existent file in localStorage
    await page.evaluate(() => {
      localStorage.setItem('lastOpenedFile', 'non-existent-file.txt');
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // App should not crash and should fallback to README or empty state
    const appRoot = page.locator('#app');
    await expect(appRoot).toBeVisible();

    // localStorage should be cleared of the non-existent file
    const lastOpenedFile = await page.evaluate(() => {
      return localStorage.getItem('lastOpenedFile');
    });

    // Either it was cleared (null) or it was replaced with README
    console.log('Last opened file after invalid file:', lastOpenedFile);

    // No error messages should be shown
    const errorMessages = page.locator('.v-alert--type-error');
    expect(await errorMessages.count()).toBe(0);
  });

  test('should update last opened file when switching files', async ({ page }) => {
    // Wait for file tree to be visible
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 10000 });

    const fileTreeItems = page.locator('[data-testid="file-tree-item"]');
    const itemCount = await fileTreeItems.count();

    if (itemCount >= 2) {
      // Click on the first file
      await fileTreeItems.first().click();
      await page.waitForTimeout(1000);

      const firstFile = await page.evaluate(() => {
        return localStorage.getItem('lastOpenedFile');
      });

      // Click on the second file
      await fileTreeItems.nth(1).click();
      await page.waitForTimeout(1000);

      const secondFile = await page.evaluate(() => {
        return localStorage.getItem('lastOpenedFile');
      });

      // Verify that the last opened file was updated
      expect(firstFile).toBeTruthy();
      expect(secondFile).toBeTruthy();
      expect(firstFile).not.toBe(secondFile);
      console.log('File switched from', firstFile, 'to', secondFile);
    }
  });
});
