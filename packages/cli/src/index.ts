#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { startCommand } from './commands/start.js';
import { getPackageInfo } from './utils/package.js';

const program = new Command();

async function main() {
  try {
    const { version, description } = await getPackageInfo();

    program
      .name('goose')
      .description(description)
      .version(version, '-v, --version', 'Display version number');

    program
      .argument('[project-path]', 'Project path (defaults to current directory)')
      .option('-p, --port <port>', 'Specify server port', '3456')
      .option('--no-open', 'Do not automatically open browser')
      .action((projectPath, options) => {
        // If no path provided, use current working directory (evaluated at runtime)
        const resolvedPath = projectPath || process.cwd();
        startCommand(resolvedPath, options);
      });

    program.on('--help', () => {
      console.log('');
      console.log('Examples:');
      console.log('  $ goose                    # Start in current directory');
      console.log('  $ goose /path/to/project   # Start in specified directory');
      console.log('  $ goose -p 8080            # Specify port');
      console.log('  $ goose --no-open          # Do not open browser');
      console.log('');
    });

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
