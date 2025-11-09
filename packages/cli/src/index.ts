#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { exportCSVCommand } from './commands/export-csv.js';
import { exportJSONCommand } from './commands/export-json.js';
import { getPackageInfo } from './utils/package.js';

const program = new Command();

async function main() {
  try {
    const { version, description } = await getPackageInfo();

    program.name('goose').description(description).version(version, '-v, --version', 'Display version number');

    // Default command: start server
    program
      .command('start', { isDefault: true })
      .description('Start the code review web interface')
      .argument('[project-path]', 'Project path (defaults to current directory)')
      .option('-p, --port <port>', 'Specify server port', '3456')
      .option('--no-open', 'Do not automatically open browser')
      .action((projectPath, options) => {
        const resolvedPath = projectPath || process.cwd();
        startCommand(resolvedPath, options);
      });

    // Export CSV command
    program
      .command('export-csv')
      .description('Export code review results to CSV format')
      .argument('[project-path]', 'Project path (defaults to current directory)')
      .option('-o, --output <file>', 'Output file path (defaults to stdout)')
      .option('--include-resolved', 'Include resolved reviews in export')
      .action((projectPath, options) => {
        const resolvedPath = projectPath || process.cwd();
        exportCSVCommand(resolvedPath, options);
      });

    // Export JSON command
    program
      .command('export-json')
      .description('Export code review results to JSON format')
      .argument('[project-path]', 'Project path (defaults to current directory)')
      .option('-o, --output <file>', 'Output file path (defaults to stdout)')
      .option('--include-resolved', 'Include resolved reviews in export')
      .action((projectPath, options) => {
        const resolvedPath = projectPath || process.cwd();
        exportJSONCommand(resolvedPath, options);
      });

    program.on('--help', () => {
      console.log('');
      console.log('Examples:');
      console.log('  $ goose                                   # Start in current directory');
      console.log('  $ goose start /path/to/project            # Start in specified directory');
      console.log('  $ goose start -p 8080                     # Specify port');
      console.log('  $ goose start --no-open                   # Do not open browser');
      console.log('  $ goose export-csv                        # Export to stdout (CSV)');
      console.log('  $ goose export-csv -o reviews.csv         # Export to file (CSV)');
      console.log('  $ goose export-csv --include-resolved     # Include resolved reviews (CSV)');
      console.log('  $ goose export-json                       # Export to stdout (JSON)');
      console.log('  $ goose export-json -o reviews.json       # Export to file (JSON)');
      console.log('  $ goose export-json --include-resolved    # Include resolved reviews (JSON)');
      console.log('');
    });

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
