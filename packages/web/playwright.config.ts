import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 120 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests sequentially for better stability
  forbidOnly: !!process.env.CI, // Fail build on CI if test.only is committed
  retries: process.env.CI ? 2 : 1, // Retry failed tests (1 retry locally, 2 on CI)
  workers: 1, // Run one test at a time

  // Isolate tests to prevent crashes from affecting subsequent tests
  maxFailures: process.env.CI ? undefined : 5, // Stop after 5 failures locally

  // Global setup and teardown
  globalSetup: './e2e/setup/global-setup.ts',
  globalTeardown: './e2e/setup/global-teardown.ts',

  // Reporter configuration
  reporter: [
    ['html'],
    ['list'],
  ],

  // Shared settings for all tests
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying failed tests
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Increase browser resources to prevent crashes
        headless: process.env.HEADED !== 'true', // Allow headed mode for debugging
        launchOptions: {
          args: [
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--no-sandbox', // Disable sandbox for stability
            '--disable-setuid-sandbox',
            '--disable-gpu', // Disable GPU hardware acceleration
            '--disable-software-rasterizer',
            '--js-flags=--max-old-space-size=4096', // Increase JS memory limit
            // Removed '--single-process' to fix flaky tests caused by browser crashes
            '--disable-features=VizDisplayCompositor', // Disable display compositor
          ],
        },
      },
    },
  ],

  // Start dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
