import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

// Define types locally to avoid cross-package import issues
interface BatchProgress {
  currentFile: string;
  analyzed: number;
  skipped: number;
  errors: number;
  total: number;
  status: string;
}

interface BatchAnalysisResult {
  totalFiles: number;
  analyzableFiles: number;
  analyzedCount: number;
  skippedCount: number;
  errorCount: number;
  results: any[];
  totalDuration: number;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  };
}

// Import from bundled server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '../../server-dist/services/batchAnalysisService.js');
const { BatchAnalysisService } = await import(serverPath);

interface BatchOptions {
  force?: boolean;
  concurrency?: string;
  output?: 'json' | 'markdown' | 'text';
  dir?: string | string[];
  exclude?: string | string[];
  yes?: boolean;
}

// Helper function to prompt user for confirmation
function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes' || normalized === '');
    });
  });
}

export async function batchCommand(projectPath: string, options: BatchOptions) {
  try {
    console.log(chalk.cyan('🦆 Goose Code Review - Batch Analysis'));
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

    const concurrency = options.concurrency ? parseInt(options.concurrency, 10) : 1;
    const outputFormat = options.output || 'text';

    // Handle directories option (can be string or array)
    let directories: string[] | undefined;
    if (options.dir) {
      directories = Array.isArray(options.dir) ? options.dir : [options.dir];
    }

    // Handle exclude patterns option (can be string or array)
    let excludePatterns: string[] | undefined;
    if (options.exclude) {
      excludePatterns = Array.isArray(options.exclude) ? options.exclude : [options.exclude];
    }

    if (options.force) {
      console.log(chalk.yellow('⚠ Force mode enabled - re-analyzing all files'));
      console.log('');
    }

    if (directories && directories.length > 0) {
      console.log(chalk.cyan(`📁 Analyzing directories: ${directories.join(', ')}`));
      console.log('');
    }

    if (excludePatterns && excludePatterns.length > 0) {
      console.log(chalk.yellow(`🚫 Excluding patterns: ${excludePatterns.join(', ')}`));
      console.log('');
    }

    console.log(chalk.gray(`Concurrency: ${concurrency}`));
    console.log(chalk.gray(`Output format: ${outputFormat}`));
    console.log('');

    // Create batch analysis service
    const batchService = new BatchAnalysisService(absolutePath);

    // Get list of files that will be analyzed
    console.log(chalk.cyan('🔍 Scanning files...'));
    const { totalFiles, analyzableFiles } = await batchService.getAnalyzableFiles({
      directories,
      excludePatterns,
    });

    console.log('');
    console.log(
      chalk.bold(`Found ${analyzableFiles.length} files to analyze (${totalFiles} total)`)
    );
    console.log('');

    // Group files by directory for better display
    const filesByDir: Record<string, string[]> = {};
    for (const file of analyzableFiles) {
      const dir = path.dirname(file);
      if (!filesByDir[dir]) {
        filesByDir[dir] = [];
      }
      filesByDir[dir].push(path.basename(file));
    }

    // Display files grouped by directory
    const dirs = Object.keys(filesByDir).sort();
    const MAX_DISPLAY = 50; // Limit display to prevent overwhelming output

    if (analyzableFiles.length <= MAX_DISPLAY) {
      // Show all files if not too many
      for (const dir of dirs) {
        console.log(chalk.gray(`  ${dir}/`));
        for (const file of filesByDir[dir].sort()) {
          console.log(chalk.gray(`    ${file}`));
        }
      }
    } else {
      // Show summary if too many files
      const displayCount = Math.min(dirs.length, 10);
      for (let i = 0; i < displayCount; i++) {
        const dir = dirs[i];
        console.log(chalk.gray(`  ${dir}/ (${filesByDir[dir].length} files)`));
      }
      if (dirs.length > displayCount) {
        console.log(chalk.gray(`  ... and ${dirs.length - displayCount} more directories`));
      }
    }

    console.log('');

    // Ask for confirmation unless --yes flag is provided
    if (!options.yes) {
      const confirmed = await promptConfirmation(chalk.yellow(`Proceed with analysis? [Y/n] `));

      if (!confirmed) {
        console.log(chalk.yellow('Analysis cancelled.'));
        return;
      }
      console.log('');
    }

    // Track start time
    const startTime = Date.now();

    // Progress reporting
    const onProgress = (progress: BatchProgress) => {
      const percentage =
        progress.total > 0
          ? Math.round(
              ((progress.analyzed + progress.skipped + progress.errors) / progress.total) * 100
            )
          : 0;

      process.stdout.write(
        chalk.gray(
          `\r[${percentage}%] ${progress.analyzed} analyzed, ${progress.skipped} skipped, ${progress.errors} errors | ${progress.currentFile}`
        ) + ' '.repeat(10)
      );
    };

    console.log(chalk.cyan('🚀 Starting batch analysis...'));
    console.log('');

    // Run batch analysis
    const result: BatchAnalysisResult = await batchService.analyzeProject({
      force: options.force || false,
      concurrency,
      directories,
      excludePatterns,
      onProgress,
    });

    // Clear progress line
    process.stdout.write('\r' + ' '.repeat(100) + '\r');

    // Display results
    displayResults(result, outputFormat);

    // Display duration
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('');
    console.log(chalk.gray(`Total time: ${duration}s`));
    console.log('');
  } catch (error) {
    console.error('');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

function displayResults(result: BatchAnalysisResult, format: string) {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (format === 'markdown') {
    displayMarkdownResults(result);
    return;
  }

  // Text format (default)
  displayTextResults(result);
}

function displayTextResults(result: BatchAnalysisResult) {
  console.log('');
  console.log(chalk.green('✓ Batch analysis completed!'));
  console.log('');

  // Summary
  console.log(chalk.bold('Summary:'));
  console.log(chalk.gray(`  Total files in project: ${result.totalFiles}`));
  console.log(chalk.gray(`  Analyzable files: ${result.analyzableFiles}`));
  console.log(chalk.cyan(`  Files analyzed: ${result.analyzedCount}`));
  console.log(chalk.yellow(`  Files skipped: ${result.skippedCount}`));

  if (result.errorCount > 0) {
    console.log(chalk.red(`  Files with errors: ${result.errorCount}`));
  }

  console.log('');

  // Issue statistics
  console.log(chalk.bold('Issues Found:'));
  console.log(chalk.gray(`  Total: ${result.summary.totalIssues}`));

  if (result.summary.criticalIssues > 0) {
    console.log(chalk.red(`  Critical: ${result.summary.criticalIssues}`));
  }

  if (result.summary.highIssues > 0) {
    console.log(chalk.red(`  High: ${result.summary.highIssues}`));
  }

  if (result.summary.mediumIssues > 0) {
    console.log(chalk.yellow(`  Medium: ${result.summary.mediumIssues}`));
  }

  if (result.summary.lowIssues > 0) {
    console.log(chalk.cyan(`  Low: ${result.summary.lowIssues}`));
  }

  if (result.summary.infoIssues > 0) {
    console.log(chalk.gray(`  Info: ${result.summary.infoIssues}`));
  }

  console.log('');

  // Show files with errors
  if (result.errorCount > 0) {
    console.log(chalk.bold('Files with errors:'));
    const errored = result.results.filter((r) => r.error);
    for (const file of errored) {
      console.log(chalk.red(`  ✗ ${file.filePath}: ${file.error}`));
    }
    console.log('');
  }

  // Show files with critical issues
  const criticalFiles = result.results.filter(
    (r) => r.analysis && r.analysis.issues.some((i: any) => i.severity === 'critical')
  );

  if (criticalFiles.length > 0) {
    console.log(chalk.bold('Files with critical issues:'));
    for (const file of criticalFiles) {
      const criticalCount = file.analysis!.issues.filter(
        (i: any) => i.severity === 'critical'
      ).length;
      console.log(
        chalk.red(
          `  🔴 ${file.filePath} (${criticalCount} critical issue${criticalCount > 1 ? 's' : ''})`
        )
      );
    }
    console.log('');
  }

  // Next steps
  console.log(chalk.bold('Next Steps:'));
  console.log(chalk.gray('  • Run `goose` to start the web UI and review detailed analysis'));
  console.log(chalk.gray('  • Check the .code-review/reviews directory for saved reviews'));
  console.log('');
}

function displayMarkdownResults(result: BatchAnalysisResult) {
  console.log('# Batch Analysis Report');
  console.log('');
  console.log(`**Generated:** ${new Date().toISOString()}`);
  console.log('');
  console.log('## Summary');
  console.log('');
  console.log(`- Total files in project: ${result.totalFiles}`);
  console.log(`- Analyzable files: ${result.analyzableFiles}`);
  console.log(`- Files analyzed: ${result.analyzedCount}`);
  console.log(`- Files skipped: ${result.skippedCount}`);
  console.log(`- Files with errors: ${result.errorCount}`);
  console.log('');
  console.log('## Issues Found');
  console.log('');
  console.log(`- Total: ${result.summary.totalIssues}`);
  console.log(`- Critical: ${result.summary.criticalIssues}`);
  console.log(`- High: ${result.summary.highIssues}`);
  console.log(`- Medium: ${result.summary.mediumIssues}`);
  console.log(`- Low: ${result.summary.lowIssues}`);
  console.log(`- Info: ${result.summary.infoIssues}`);
  console.log('');

  if (result.errorCount > 0) {
    console.log('## Files with Errors');
    console.log('');
    const errored = result.results.filter((r) => r.error);
    for (const file of errored) {
      console.log(`- \`${file.filePath}\`: ${file.error}`);
    }
    console.log('');
  }

  const criticalFiles = result.results.filter(
    (r) => r.analysis && r.analysis.issues.some((i: any) => i.severity === 'critical')
  );

  if (criticalFiles.length > 0) {
    console.log('## Files with Critical Issues');
    console.log('');
    for (const file of criticalFiles) {
      const criticalCount = file.analysis!.issues.filter(
        (i: any) => i.severity === 'critical'
      ).length;
      console.log(
        `- \`${file.filePath}\` (${criticalCount} critical issue${criticalCount > 1 ? 's' : ''})`
      );
    }
    console.log('');
  }
}
