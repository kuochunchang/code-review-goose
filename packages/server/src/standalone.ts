#!/usr/bin/env node
import { createServer } from './app.js';
import detectPort from 'detect-port';

/**
 * Standalone server for E2E testing
 * Starts the server with a test project path
 */
async function main() {
  const projectPath = process.env.TEST_PROJECT_PATH || process.cwd();
  const requestedPort = parseInt(process.env.PORT || '3456', 10);

  try {
    // Detect available port
    const availablePort = await detectPort(requestedPort);

    if (availablePort !== requestedPort) {
      console.log(`Port ${requestedPort} is already in use, using port ${availablePort} instead`);
    }

    console.log(`Starting Goose server on port ${availablePort}...`);
    console.log(`Project path: ${projectPath}`);

    const server = await createServer({
      projectPath,
      port: availablePort,
    });

    console.log(`Server running on http://localhost:${availablePort}`);
    console.log('Press Ctrl+C to stop');

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down...');
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
