import { stopBackendServer } from './start-servers';

/**
 * Global teardown for Playwright tests
 * Stops the backend server after all tests complete
 */
async function globalTeardown() {
  console.log('\n=== Stopping E2E Test Environment ===\n');

  try {
    await stopBackendServer();
    console.log('\n=== Backend server stopped ===\n');
  } catch (error) {
    console.error('Error stopping backend server:', error);
  }
}

export default globalTeardown;
