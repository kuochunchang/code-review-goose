#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { batchCommand } from './commands/batch.js';
import { getPackageInfo } from './utils/package.js';

const program = new Command();

async function main() {
  try {
    const { version, description } = await getPackageInfo();

    program
      .name('goose')
      .description(description)
      .version(version, '-v, --version', 'Display version number');

    // Default command: start server
    program
      .command('start', { isDefault: true })
      .description('Start the code review server and open web interface')
      .argument('[project-path]', 'Project path (defaults to current directory)')
      .option('-p, --port <port>', 'Specify server port', '3456')
      .option('--no-open', 'Do not automatically open browser')
      .action((projectPath, options) => {
        const resolvedPath = projectPath || process.cwd();
        startCommand(resolvedPath, options);
      });

    // Batch analysis command
    program
      .command('batch')
      .description('Analyze all files in project (batch mode)')
      .argument('[project-path]', 'Project path (defaults to current directory)')
      .option('-f, --force', 'Force re-analysis of all files (ignore timestamps)')
      .option('-c, --concurrency <number>', 'Number of concurrent analyses (default: 1)', '1')
      .option('-o, --output <format>', 'Output format: text, json, markdown (default: text)', 'text')
      .option('-d, --dir <directory...>', 'Specific directories to analyze (e.g., src lib)')
      .action((projectPath, options) => {
        const resolvedPath = projectPath || process.cwd();
        batchCommand(resolvedPath, options);
      });

    program.on('--help', () => {
      console.log('');
      console.log('Examples:');
      console.log('  $ goose                           # Start server in current directory');
      console.log('  $ goose start /path/to/project    # Start server in specified directory');
      console.log('  $ goose -p 8080                   # Start server on port 8080');
      console.log('  $ goose --no-open                 # Start server without opening browser');
      console.log('');
      console.log('  $ goose batch                     # Batch analyze current directory');
      console.log('  $ goose batch /path/to/project    # Batch analyze specified directory');
      console.log('  $ goose batch --force             # Force re-analysis of all files');
      console.log('  $ goose batch -c 3                # Analyze with 3 concurrent processes');
      console.log('  $ goose batch -o json             # Output results as JSON');
      console.log('  $ goose batch -d src -d lib       # Only analyze src/ and lib/ directories');
      console.log('');
    });

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
