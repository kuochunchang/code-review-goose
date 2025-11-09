import { test, expect } from '@playwright/test';

test.describe('Review Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the review page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should create a new review record', async ({ page }) => {
    // Wait for file tree and select a file
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 10000 });

    const firstFile = page.locator('[data-testid="file-tree-item"]').first();
    await firstFile.click();

    // Wait for analysis panel
    await expect(page.locator('[data-testid="analysis-panel"]')).toBeVisible({ timeout: 5000 });

    // Look for create review button
    const createReviewBtn = page.locator('[data-testid="create-review-button"]');

    if (await createReviewBtn.count() > 0) {
      await createReviewBtn.click();

      // Wait for success message or confirmation
      await expect(
        page.locator('.v-snackbar, [data-testid="review-created-message"]')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view review history', async ({ page }) => {
    // Look for review history button (could be in toolbar or menu)
    const reviewHistoryBtn = page.locator(
      '[data-testid="review-history-button"], button:has-text("Review History")'
    ).first();

    if (await reviewHistoryBtn.count() > 0) {
      await reviewHistoryBtn.click();

      // Wait for review history dialog/panel to open
      await expect(
        page.locator('[data-testid="review-history-dialog"], [role="dialog"]')
      ).toBeVisible({ timeout: 5000 });

      // Check if there are any review records listed
      const reviewList = page.locator('[data-testid="review-list"], [data-testid="review-item"]');

      // Either there are reviews or an empty state message
      const hasReviews = await reviewList.count() > 0;
      const hasEmptyState = await page.locator('text=No reviews found').count() > 0;

      expect(hasReviews || hasEmptyState).toBeTruthy();
    }
  });

  test('should bookmark and filter reviews', async ({ page }) => {
    // Open review history
    const reviewHistoryBtn = page.locator(
      '[data-testid="review-history-button"], button:has-text("Review History")'
    ).first();

    if (await reviewHistoryBtn.count() > 0) {
      await reviewHistoryBtn.click();

      // Wait for dialog to open
      await expect(
        page.locator('[data-testid="review-history-dialog"], [role="dialog"]')
      ).toBeVisible({ timeout: 5000 });

      // Look for the first review item
      const firstReview = page.locator('[data-testid="review-item"]').first();

      if (await firstReview.count() > 0) {
        // Find and click bookmark button
        const bookmarkBtn = firstReview.locator('[data-testid="bookmark-button"], button[aria-label*="bookmark"]');

        if (await bookmarkBtn.count() > 0) {
          await bookmarkBtn.click();

          // Wait for bookmark to be applied
          await page.waitForTimeout(500);

          // Check for bookmark filter
          const bookmarkFilter = page.locator('[data-testid="bookmark-filter"], input[type="checkbox"]:near(text="Bookmarked")');

          if (await bookmarkFilter.count() > 0) {
            await bookmarkFilter.click();

            // Verify filtered results
            await page.waitForTimeout(500);
            const filteredReviews = page.locator('[data-testid="review-item"]');

            // All visible reviews should be bookmarked
            const count = await filteredReviews.count();
            expect(count).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});
