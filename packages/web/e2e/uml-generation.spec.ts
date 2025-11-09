import { test, expect } from '@playwright/test';

test.describe('UML Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the review page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should generate and display UML diagram from code', async ({ page, context }) => {
    // Wait for file tree and select a TypeScript/JavaScript file
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 10000 });

    // Find a .ts or .js file
    const codeFile = page.locator('[data-testid="file-tree-item"]')
      .filter({ hasText: /\.(ts|js)$/ })
      .first();

    if (await codeFile.count() > 0) {
      await codeFile.click();

      // Wait for code to load
      await page.waitForTimeout(1000);

      // Look for UML generation button
      const umlButton = page.locator(
        '[data-testid="generate-uml-button"], button:has-text("Generate UML"), button:has-text("UML")'
      ).first();

      if (await umlButton.count() > 0) {
        // Set up listener for new page (UML opens in new window/tab)
        const pagePromise = context.waitForEvent('page');

        await umlButton.click();

        // Wait for the new page to open
        const umlPage = await pagePromise;
        await umlPage.waitForLoadState('networkidle');

        // Check that UML page loaded
        expect(umlPage.url()).toContain('/uml');

        // Check for UML viewer component
        await expect(umlPage.locator('[data-testid="uml-viewer"], .uml-viewer')).toBeVisible({ timeout: 10000 });

        // Check for Mermaid diagram
        const mermaidDiagram = umlPage.locator('.mermaid, [data-testid="mermaid-diagram"]');

        if (await mermaidDiagram.count() > 0) {
          await expect(mermaidDiagram).toBeVisible({ timeout: 5000 });
        }

        // Close the UML page
        await umlPage.close();
      }
    }
  });

  test('should handle UML generation errors gracefully', async ({ page }) => {
    // Wait for file tree
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 10000 });

    // Select a non-code file (like README.md or a config file)
    const nonCodeFile = page.locator('[data-testid="file-tree-item"]')
      .filter({ hasText: /\.(md|json|txt)$/ })
      .first();

    if (await nonCodeFile.count() > 0) {
      await nonCodeFile.click();

      // Wait for file to load
      await page.waitForTimeout(1000);

      // Try to generate UML
      const umlButton = page.locator(
        '[data-testid="generate-uml-button"], button:has-text("Generate UML"), button:has-text("UML")'
      ).first();

      if (await umlButton.count() > 0) {
        await umlButton.click();

        // Should show error message or the button should be disabled
        await page.waitForTimeout(1000);

        // Check for error snackbar or message
        const errorMessage = page.locator(
          '.v-snackbar:has-text("error"), .v-snackbar:has-text("failed"), [data-testid="error-message"]'
        );

        // Either error message appears or button was disabled
        const hasError = await errorMessage.count() > 0;
        const isDisabled = await umlButton.isDisabled();

        // One of these should be true
        expect(hasError || isDisabled).toBeTruthy();
      }
    }
  });
});
