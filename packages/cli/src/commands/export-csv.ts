import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Import from bundled server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '../../server-dist/services/reviewService.js');
const { ReviewService } = await import(serverPath);

interface ExportCSVOptions {
  output?: string;
  includeResolved?: boolean;
}

export async function exportCSVCommand(projectPath: string, options: ExportCSVOptions) {
  try {
    console.log(chalk.cyan('🦆 Goose Code Review - CSV Export'));
    console.log('');

    // Validate project path
    const absolutePath = path.resolve(projectPath);
    if (!(await fs.pathExists(absolutePath))) {
      throw new Error(`Project path does not exist: ${absolutePath}`);
    }

    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    console.log(chalk.gray(`Project path: ${absolutePath}`));
    console.log('');

    // Check if reviews directory exists
    const reviewsDir = path.join(absolutePath, '.code-review', 'reviews');
    if (!(await fs.pathExists(reviewsDir))) {
      console.log(chalk.yellow('⚠ No reviews found in this project'));
      console.log(chalk.gray(`  Expected reviews in: ${reviewsDir}`));
      process.exit(0);
    }

    // Create ReviewService instance
    const reviewService = new ReviewService(absolutePath);

    console.log(chalk.gray('Generating CSV export...'));
    console.log('');

    // Export to CSV
    const csv = await reviewService.exportToCSV({
      format: 'csv',
      includeResolved: options.includeResolved ?? false,
    });

    // Output to file or stdout
    if (options.output) {
      const outputPath = path.resolve(options.output);
      await fs.writeFile(outputPath, csv, 'utf-8');
      console.log(chalk.green('✓ CSV export completed!'));
      console.log('');
      console.log(chalk.bold(`  Output file: ${chalk.cyan(outputPath)}`));
      console.log('');
    } else {
      // Output to stdout
      console.log(csv);
    }
  } catch (error) {
    throw new Error(
      `CSV export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
