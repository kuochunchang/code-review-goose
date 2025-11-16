/**
 * Node.js implementation of IFileProvider interface
 * Uses fs-extra for file system operations
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import type { IFileProvider } from '@code-review-goose/analysis-types';

/**
 * NodeFileProvider
 * Implements IFileProvider interface using Node.js file system APIs
 *
 * Features:
 * - Async file reading with UTF-8 encoding
 * - Path resolution with extension inference
 * - Glob pattern matching for file listing
 * - Project boundary validation
 */
export class NodeFileProvider implements IFileProvider {
  private readonly basePath: string;
  private readonly normalizedBasePath: string;
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];

  /**
   * @param basePath - Base directory for all file operations (project root)
   */
  constructor(basePath: string) {
    this.basePath = path.resolve(basePath);

    // Normalize and resolve symbolic links
    try {
      this.normalizedBasePath = fs.realpathSync(this.basePath);
    } catch {
      // If path doesn't exist or can't be resolved, use resolved path
      this.normalizedBasePath = this.basePath;
    }
  }

  /**
   * Read file content as UTF-8 string
   * @throws Error if file does not exist or cannot be read
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      // Validate file is within project boundary
      if (!this.isWithinProject(resolvedPath)) {
        throw new Error(`File path is outside project boundary: ${filePath}`);
      }

      // Check if file exists and is a file (not directory)
      const stats = await fs.stat(resolvedPath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      return await fs.readFile(resolvedPath, 'utf-8');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Resolve import statement to absolute file path
   * Handles relative paths with extension inference and index file resolution
   *
   * @param from - Source file path (importer)
   * @param to - Import specifier (e.g., './utils', '../models/User')
   * @returns Resolved absolute path, or null if cannot be resolved
   */
  async resolveImport(from: string, to: string): Promise<string | null> {
    try {
      // Only handle relative imports (not node_modules)
      if (!this.isRelativePath(to)) {
        return null;
      }

      // Validate from file exists
      const fromPath = this.resolvePath(from);
      if (!(await this.exists(fromPath))) {
        return null;
      }

      // Calculate target path
      const fromDir = path.dirname(fromPath);
      const targetPath = path.resolve(fromDir, to);

      // Validate within project boundary
      if (!this.isWithinProject(targetPath)) {
        return null;
      }

      // Try to resolve the file with various extensions and index files
      const resolved = await this.resolveFile(targetPath);
      return resolved;
    } catch {
      return null;
    }
  }

  /**
   * List files matching a glob pattern
   * @param pattern - Glob pattern (e.g., '**\/*.ts', 'src/**\/*.{ts,tsx}')
   * @returns Array of absolute file paths
   */
  async listFiles(pattern: string): Promise<string[]> {
    try {
      const files = await glob(pattern, {
        cwd: this.basePath,
        absolute: true,
        nodir: true, // Only return files, not directories
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
      });

      // Filter to ensure all files are within project boundary
      return files.filter((file) => this.isWithinProject(file));
    } catch (error) {
      console.error(`Failed to list files with pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await fs.access(resolvedPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve path relative to base path
   * If already absolute, validates it's within project
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.basePath, filePath);
  }

  /**
   * Check if path is a relative import (./ or ../)
   */
  private isRelativePath(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  /**
   * Validate that file path is within project boundary
   * Prevents path traversal attacks
   */
  private isWithinProject(filePath: string): boolean {
    try {
      // Resolve and normalize the path
      const resolvedPath = path.resolve(filePath);

      // Try to get real path (resolving symlinks)
      let realPath: string;
      try {
        if (fs.existsSync(resolvedPath)) {
          realPath = fs.realpathSync(resolvedPath);
        } else {
          // Path doesn't exist, recursively find existing parent
          let currentPath = resolvedPath;
          const pathParts: string[] = [];

          while (!fs.existsSync(currentPath)) {
            pathParts.unshift(path.basename(currentPath));
            const parent = path.dirname(currentPath);
            if (parent === currentPath) {
              // Reached root
              realPath = resolvedPath;
              break;
            }
            currentPath = parent;
          }

          if (fs.existsSync(currentPath)) {
            const realDir = fs.realpathSync(currentPath);
            realPath = path.join(realDir, ...pathParts);
          } else {
            realPath = resolvedPath;
          }
        }
      } catch {
        realPath = resolvedPath;
      }

      // Normalize both paths for comparison
      const normalizedRealPath = realPath + (realPath.endsWith(path.sep) ? '' : path.sep);
      const normalizedProjectPath =
        this.normalizedBasePath + (this.normalizedBasePath.endsWith(path.sep) ? '' : path.sep);

      // Check if file path starts with project path
      return normalizedRealPath.startsWith(normalizedProjectPath);
    } catch {
      return false;
    }
  }

  /**
   * Resolve file path with extension inference and index file resolution
   *
   * Tries in order:
   * 1. Exact path (if has extension)
   * 2. Path + supported extensions (.ts, .tsx, .js, .jsx)
   * 3. Path as directory with index file
   *
   * @param basePath - Base path without extension
   * @returns Resolved file path or null if not found
   */
  private async resolveFile(basePath: string): Promise<string | null> {
    // 1. If path already has extension and exists, return it
    if (path.extname(basePath) && (await this.fileExists(basePath))) {
      return basePath;
    }

    // 2. Try adding various extensions
    for (const ext of this.extensions) {
      const pathWithExt = basePath + ext;
      if (await this.fileExists(pathWithExt)) {
        return pathWithExt;
      }
    }

    // 3. Try as directory with index file
    if (await this.directoryExists(basePath)) {
      for (const ext of this.extensions) {
        const indexPath = path.join(basePath, `index${ext}`);
        if (await this.fileExists(indexPath)) {
          return indexPath;
        }
      }
    }

    // 4. Cannot resolve
    return null;
  }

  /**
   * Check if path exists and is a file
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Check if path exists and is a directory
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}
