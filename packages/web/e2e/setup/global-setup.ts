import { startBackendServer } from './start-servers';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import detectPort from 'detect-port';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global setup for Playwright tests
 * Starts the backend server before running tests
 */
async function globalSetup() {
  console.log('\n=== Starting E2E Test Environment ===\n');

  // Detect available backend port and write config BEFORE webServer starts
  const requestedPort = 3456;
  const availablePort = await detectPort(requestedPort);

  const testConfigPath = join(__dirname, '../.test-config.json');
  writeFileSync(testConfigPath, JSON.stringify({ backendPort: availablePort }));
  console.log(`Pre-configured backend port: ${availablePort}`);

  try {
    await startBackendServer();
    console.log('\n=== Backend server ready ===\n');

    // Give servers a moment to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.error('Failed to start backend server:', error);
    throw error;
  }
}

export default globalSetup;
