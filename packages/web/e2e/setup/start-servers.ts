import { spawn, ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess: ChildProcess | null = null;

/**
 * Start the backend server for E2E tests
 */
export async function startBackendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, '../../../server');
    const testProjectPath = join(__dirname, '../../../..');

    // Read the pre-configured port from test config
    const testConfigPath = join(__dirname, '../.test-config.json');
    const testConfig = JSON.parse(readFileSync(testConfigPath, 'utf-8'));
    const configuredPort = testConfig.backendPort || 3456;

    console.log('Starting backend server...');
    console.log(`Test project path: ${testProjectPath}`);
    console.log(`Using pre-configured port: ${configuredPort}`);

    serverProcess = spawn('npm', ['run', 'dev:standalone'], {
      cwd: serverPath,
      stdio: 'pipe',
      shell: true,
      env: {
        ...process.env,
        TEST_PROJECT_PATH: testProjectPath,
        PORT: String(configuredPort),
      },
    });

    let started = false;

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`[Backend] ${message}`);

      // Check if server started successfully
      if (message.includes('Server running') && !started) {
        started = true;
        console.log(`Backend server started successfully on port ${configuredPort}`);
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error(`[Backend Error] ${data.toString()}`);
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        reject(new Error('Backend server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

/**
 * Stop the backend server
 */
export async function stopBackendServer(): Promise<void> {
  if (serverProcess) {
    console.log('Stopping backend server...');
    serverProcess.kill();
    serverProcess = null;
  }
}
