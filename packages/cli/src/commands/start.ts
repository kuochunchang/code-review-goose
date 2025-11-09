import chalk from 'chalk';
import detectPort from 'detect-port';
import fs from 'fs';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';

// Import from bundled server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '../../server-dist/index.js');
const { createServer } = await import(serverPath);

interface StartOptions {
  port: string;
  open: boolean;
}

export async function startCommand(projectPath: string, options: StartOptions) {
  try {
    console.log(chalk.cyan('🦆 Goose Code Review Tool'));
    console.log('');

    // Validate project path
    const absolutePath = path.resolve(projectPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Project path does not exist: ${absolutePath}`);
    }

    if (!fs.statSync(absolutePath).isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    console.log(chalk.gray(`Project path: ${absolutePath}`));
    console.log('');

    // Detect available port
    const requestedPort = parseInt(options.port, 10);
    const availablePort = await detectPort(requestedPort);

    if (availablePort !== requestedPort) {
      console.log(
        chalk.yellow(
          `⚠ Port ${requestedPort} is already in use, using port ${availablePort} instead`
        )
      );
    }

    // Start server
    console.log(chalk.gray('Starting server...'));
    const server = await createServer({
      projectPath: absolutePath,
      port: availablePort,
    });

    const url = `http://localhost:${availablePort}`;

    console.log('');
    console.log(chalk.green('✓ Server started!'));
    console.log('');
    console.log(chalk.bold(`  URL: ${chalk.cyan(url)}`));
    console.log('');
    console.log(chalk.gray('  Press Ctrl+C to stop server'));
    console.log('');

    // Automatically open browser
    if (options.open) {
      console.log(chalk.gray('Opening browser...'));
      await open(url);
    }

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('');
      console.log(chalk.yellow('Shutting down server...'));
      await server.close();
      console.log(chalk.green('✓ Server closed'));
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    throw new Error(
      `Startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
