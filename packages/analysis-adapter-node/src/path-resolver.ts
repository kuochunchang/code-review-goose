/**
 * PathResolver - Resolve import paths to actual file system paths
 *
 * Features:
 * - Resolves relative paths (./, ../)
 * - Automatic extension inference (.ts, .tsx, .js, .jsx)
 * - Automatic index.ts file resolution
 * - Path safety validation (project boundary check)
 */

import * as path from 'path';
import fs from 'fs-extra';

export class PathResolver {
  private readonly projectPath: string;
  private readonly normalizedProjectPath: string;

  // Supported extensions in priority order
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    // Normalize project path and resolve symbolic links (if path exists)
    try {
      this.normalizedProjectPath = fs.realpathSync(projectPath);
    } catch {
      // If path doesn't exist or can't be resolved, use resolve
      this.normalizedProjectPath = path.resolve(projectPath);
    }
  }

  /**
   * Resolve import path to actual file path
   *
   * @param fromFile - File that contains the import statement
   * @param importPath - Path in import statement (e.g., './User', '../models/User')
   * @returns Resolved absolute path, or null if unable to resolve
   */
  async resolveImportPath(fromFile: string, importPath: string): Promise<string | null> {
    // Handle edge cases
    if (!importPath || importPath.trim() === '') {
      return null;
    }

    // Only handle relative paths
    if (!this.isRelativePath(importPath)) {
      return null;
    }

    // Verify fromFile is within project
    if (!(await this.fileExists(fromFile))) {
      return null;
    }

    // Calculate target path
    const fromDir = path.dirname(fromFile);
    const targetPath = path.resolve(fromDir, importPath);

    // Normalize path (remove ., .., extra /)
    const normalizedPath = path.normalize(targetPath);

    // Check if within project boundary
    if (!this.isWithinProject(normalizedPath)) {
      return null;
    }

    // Try to resolve file
    const resolved = await this.resolveFile(normalizedPath);

    return resolved;
  }

  /**
   * Check if path is a relative path
   */
  isRelativePath(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  /**
   * Check if path is within project boundary
   */
  isWithinProject(filePath: string): boolean {
    try {
      // First normalize and resolve relative paths (. and ..)
      const resolvedPath = path.resolve(filePath);

      // Try to get real path (resolve symbolic links)
      // If path doesn't exist, try to resolve parent directory and concatenate filename
      let realPath: string;
      try {
        if (fs.existsSync(resolvedPath)) {
          realPath = fs.realpathSync(resolvedPath);
        } else {
          // Path doesn't exist, recursively search upward for existing parent directory
          let currentPath = resolvedPath;
          const pathParts: string[] = [];

          while (!fs.existsSync(currentPath)) {
            pathParts.unshift(path.basename(currentPath));
            const parent = path.dirname(currentPath);
            if (parent === currentPath) {
              // Reached root directory
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

      // Normalize both paths and ensure they end with / for comparison
      const normalizedRealPath = realPath + (realPath.endsWith(path.sep) ? '' : path.sep);
      const normalizedProjectPath =
        this.normalizedProjectPath +
        (this.normalizedProjectPath.endsWith(path.sep) ? '' : path.sep);

      // Check if starts with project path
      return normalizedRealPath.startsWith(normalizedProjectPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolve file path, trying various extensions and index files
   *
   * @param basePath - Base path (may not have extension)
   * @returns Actual existing file path, or null if none exist
   */
  private async resolveFile(basePath: string): Promise<string | null> {
    // 1. If path already has extension and file exists, return directly
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

    // 3. Try as directory, look for index file
    if (await this.directoryExists(basePath)) {
      for (const ext of this.extensions) {
        const indexPath = path.join(basePath, `index${ext}`);
        if (await this.fileExists(indexPath)) {
          return indexPath;
        }
      }
    }

    // 4. Unable to resolve
    return null;
  }

  /**
   * Check if file exists
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
   * Check if directory exists
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
