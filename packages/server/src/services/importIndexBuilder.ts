import fs from 'fs-extra';
import type { Ignore } from 'ignore';
import ignoreModule from 'ignore';
import pLimit from 'p-limit';
import * as path from 'path';
import type { ImportIndex, ImportIndexOptions } from '../types/ast.js';
import { PathResolver } from './pathResolver.js';

// Compatibility workaround for ESM/CommonJS interop
const ignore = (ignoreModule as any).default || ignoreModule;

/**
 * Default ignore patterns for project scanning
 */
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '*.log',
  '.DS_Store',
  '.env*',
  'tmp',
  'temp',
];

/**
 * Default file extensions to scan
 */
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Default maximum number of files to process
 */
const DEFAULT_MAX_FILES = 15000;

/**
 * Default concurrency limit for parallel processing
 * Increased from 10 to 20 for better performance on modern systems
 */
const DEFAULT_CONCURRENCY = 20;

/**
 * Import index entry for internal processing
 */
interface ImportIndexEntry {
  filePath: string;
  imports: Array<{
    source: string;
    resolvedPath: string;
  }>;
}

/**
 * ImportIndexBuilder
 *
 * Builds a lightweight import index for fast reverse dependency lookup.
 * Uses regex-based import extraction (10-20x faster than AST parsing).
 */
export class ImportIndexBuilder {
  private projectPath: string;
  private extensions: string[];
  private ignorePatterns: string[];
  private concurrency: number;
  private maxFiles: number;
  private ig: Ignore;
  private pathResolver: PathResolver;

  constructor(projectPath: string, options?: Partial<ImportIndexOptions>) {
    this.projectPath = path.resolve(projectPath);
    this.extensions = options?.extensions || DEFAULT_EXTENSIONS;
    this.ignorePatterns = options?.ignorePatterns || DEFAULT_IGNORE_PATTERNS;
    this.concurrency = options?.concurrency || DEFAULT_CONCURRENCY;
    this.maxFiles = options?.maxFiles || DEFAULT_MAX_FILES;

    // Initialize ignore matcher
    this.ig = ignore().add(this.ignorePatterns);

    // Initialize path resolver
    this.pathResolver = new PathResolver(this.projectPath);
  }

  /**
   * Build import index by scanning all project files
   * @param onProgress - Optional callback for progress updates (current, total, message)
   */
  async buildIndex(
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<ImportIndex> {
    // Verify project path exists
    if (!(await fs.pathExists(this.projectPath))) {
      throw new Error(`Project path does not exist: ${this.projectPath}`);
    }

    // Scan all project files
    onProgress?.(0, 100, 'Scanning project files...');
    const allFiles = await this.scanProjectFiles();
    onProgress?.(20, 100, `Found ${allFiles.length} files`);

    // Process files in parallel with p-limit
    const entries = await this.processFilesParallel(allFiles, onProgress);

    // Build forward and reverse maps
    const fileToImports = new Map<string, string[]>();
    const importToFiles = new Map<string, string[]>();

    for (const entry of entries) {
      const { filePath, imports } = entry;

      // Forward map: file -> imports
      const resolvedImports = imports.map((imp) => imp.resolvedPath).filter(Boolean);
      fileToImports.set(filePath, resolvedImports);

      // Reverse map: import -> files that import it
      for (const imp of imports) {
        if (imp.resolvedPath) {
          const importers = importToFiles.get(imp.resolvedPath) || [];
          if (!importers.includes(filePath)) {
            importers.push(filePath);
          }
          importToFiles.set(imp.resolvedPath, importers);
        }
      }
    }

    onProgress?.(100, 100, 'Import index built successfully');

    return {
      fileToImports,
      importToFiles,
      timestamp: Date.now(),
      fileCount: allFiles.length,
    };
  }

  /**
   * Scan project directory recursively for source files
   * Uses BFS with early exit for better performance
   */
  private async scanProjectFiles(): Promise<string[]> {
    const files: string[] = [];
    const dirsToScan: string[] = [this.projectPath];
    const limit = pLimit(this.concurrency);

    // BFS: process directories level by level
    while (dirsToScan.length > 0 && files.length < this.maxFiles) {
      const currentDirs = dirsToScan.splice(0); // Take all current dirs

      // Process all directories in current level in parallel
      const levelTasks = currentDirs.map((dirPath) =>
        limit(async () => {
          try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const newDirs: string[] = [];
            const newFiles: string[] = [];

            for (const entry of entries) {
              // Early exit if we've reached max files
              if (files.length + newFiles.length >= this.maxFiles) {
                break;
              }

              const fullPath = path.join(dirPath, entry.name);
              const relativePath = path.relative(this.projectPath, fullPath);

              // Skip if matches ignore patterns (check early)
              if (this.ig.ignores(relativePath)) {
                continue;
              }

              if (entry.isDirectory()) {
                newDirs.push(fullPath);
              } else if (entry.isFile()) {
                // Check file extension
                const ext = path.extname(entry.name);
                if (this.extensions.includes(ext)) {
                  newFiles.push(fullPath);
                }
              }
            }

            return { dirs: newDirs, files: newFiles };
          } catch (error) {
            // Skip directories that can't be read
            console.warn(`Failed to scan directory: ${dirPath}`, error);
            return { dirs: [], files: [] };
          }
        })
      );

      // Collect results from this level
      const results = await Promise.all(levelTasks);
      for (const result of results) {
        dirsToScan.push(...result.dirs);
        files.push(...result.files);

        // Early exit if we've reached max files
        if (files.length >= this.maxFiles) {
          break;
        }
      }
    }

    return files.slice(0, this.maxFiles); // Ensure exact max limit
  }

  /**
   * Process files in parallel with p-limit
   */
  private async processFilesParallel(
    files: string[],
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<ImportIndexEntry[]> {
    const limit = pLimit(this.concurrency);
    const entries: ImportIndexEntry[] = [];
    const totalFiles = files.length;
    let processedFiles = 0;

    const tasks = files.map((filePath) =>
      limit(async () => {
        try {
          const code = await fs.readFile(filePath, 'utf-8');
          const imports = await this.extractImportsFromCode(code, filePath);
          entries.push({ filePath, imports });
        } catch (error) {
          // Skip files that can't be read or parsed
          console.warn(`Failed to process file: ${filePath}`, error);
        } finally {
          processedFiles++;
          // Report progress every 10% or every 100 files
          if (onProgress && (processedFiles % 100 === 0 || processedFiles === totalFiles)) {
            const progress = 20 + Math.floor((processedFiles / totalFiles) * 70);
            onProgress(progress, 100, `Processing files: ${processedFiles}/${totalFiles}`);
          }
        }
      })
    );

    await Promise.all(tasks);
    onProgress?.(90, 100, 'Building import index...');
    return entries;
  }

  /**
   * Extract imports from code using fast regex (no AST parsing)
   *
   * Supports:
   * - ES6 imports: import { A } from './A'
   * - Default imports: import A from './A'
   * - Namespace imports: import * as A from './A'
   * - Dynamic imports: import('./A')
   * - CommonJS: require('./A')
   */
  private async extractImportsFromCode(
    code: string,
    fromFile: string
  ): Promise<Array<{ source: string; resolvedPath: string }>> {
    const imports: Array<{ source: string; resolvedPath: string }> = [];
    const seen = new Set<string>();

    // Regex patterns for different import types
    const patterns = [
      // ES6 import statements (including type imports)
      /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g,

      // Dynamic imports
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,

      // CommonJS require
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,

      // Export from (including type exports)
      /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const source = match[1];

        // Skip if already processed
        if (seen.has(source)) {
          continue;
        }
        seen.add(source);

        // Only process relative imports (skip node_modules)
        if (this.pathResolver.isRelativePath(source)) {
          try {
            const resolvedPath = await this.pathResolver.resolveImportPath(fromFile, source);
            if (resolvedPath) {
              imports.push({ source, resolvedPath });
            }
          } catch (error) {
            // Skip imports that can't be resolved
            // (e.g., non-existent files, path traversal outside project)
          }
        }
      }
    }

    return imports;
  }
}
