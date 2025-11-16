/**
 * VS Code implementation of IFileProvider interface
 * Uses vscode.workspace.fs for file system operations
 */

import * as vscode from 'vscode';
import type { IFileProvider } from '@code-review-goose/analysis-types';

/**
 * VSCodeFileProvider
 * Implements IFileProvider interface using VS Code Workspace APIs
 *
 * Features:
 * - Async file reading with UTF-8 encoding
 * - Path resolution with extension inference
 * - Glob pattern matching using VS Code APIs
 * - Workspace boundary validation
 */
export class VSCodeFileProvider implements IFileProvider {
  private readonly workspaceUri: vscode.Uri;
  private readonly extensions = ['.ts', '.tsx', '.js', '.jsx'];

  /**
   * @param workspaceUri - Workspace root URI for all file operations
   */
  constructor(workspaceUri: vscode.Uri) {
    this.workspaceUri = workspaceUri;
  }

  /**
   * Read file content as UTF-8 string
   * @throws Error if file does not exist or cannot be read
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const uri = this.resolveUri(filePath);

      // Validate file is within workspace boundary
      if (!this.isWithinWorkspace(uri)) {
        throw new Error(`File path is outside workspace boundary: ${filePath}`);
      }

      // Check if file exists
      const fileType = await this.getFileType(uri);
      if (fileType === null) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      if (fileType !== vscode.FileType.File) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      // Read file content
      const contentBytes = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder('utf-8').decode(contentBytes);
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
        console.debug(`[VSCodeFileProvider] Skipping non-relative import: ${to}`);
        return null;
      }

      // Validate from file exists
      const fromUri = this.resolveUri(from);
      if (!(await this.exists(from))) {
        console.warn(`[VSCodeFileProvider] Source file does not exist: ${from}`);
        return null;
      }

      // Calculate target path
      const fromDir = this.getDirectoryUri(fromUri);
      const targetUri = vscode.Uri.joinPath(fromDir, to);

      console.debug(
        `[VSCodeFileProvider] Resolving import: from="${from}", to="${to}", targetUri="${targetUri.fsPath}"`
      );

      // Validate within workspace boundary
      if (!this.isWithinWorkspace(targetUri)) {
        console.warn(
          `[VSCodeFileProvider] Import target outside workspace: ${targetUri.fsPath}`
        );
        return null;
      }

      // Try to resolve the file with various extensions and index files
      const resolved = await this.resolveFile(targetUri);

      if (resolved) {
        console.debug(`[VSCodeFileProvider] Import resolved: ${resolved.fsPath}`);
      } else {
        console.warn(
          `[VSCodeFileProvider] Failed to resolve import: from="${from}", to="${to}"`
        );
      }

      return resolved ? resolved.fsPath : null;
    } catch (error) {
      console.error(
        `[VSCodeFileProvider] Error resolving import: from="${from}", to="${to}"`,
        error
      );
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
      // Convert the pattern to a RelativePattern based on workspace
      const relativePattern = new vscode.RelativePattern(this.workspaceUri, pattern);

      // Use VS Code's findFiles API
      const uris = await vscode.workspace.findFiles(
        relativePattern,
        '**/node_modules/**' // Exclude node_modules
      );

      // Filter to ensure all files are within workspace boundary
      return uris
        .filter((uri) => this.isWithinWorkspace(uri))
        .map((uri) => uri.fsPath);
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
      const uri = this.resolveUri(filePath);
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve path relative to workspace root
   * If already absolute URI, validates it's within workspace
   */
  private resolveUri(filePath: string): vscode.Uri {
    // If already a URI, parse it
    if (filePath.startsWith('file://')) {
      return vscode.Uri.parse(filePath);
    }

    // If absolute path, create URI from file system path
    if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) {
      return vscode.Uri.file(filePath);
    }

    // Relative path - resolve from workspace root
    return vscode.Uri.joinPath(this.workspaceUri, filePath);
  }

  /**
   * Get directory URI from file URI
   */
  private getDirectoryUri(fileUri: vscode.Uri): vscode.Uri {
    const pathParts = fileUri.path.split('/');
    pathParts.pop(); // Remove file name
    return fileUri.with({ path: pathParts.join('/') });
  }

  /**
   * Check if path is a relative import (./ or ../)
   */
  private isRelativePath(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  /**
   * Validate that file URI is within workspace boundary
   * Prevents path traversal attacks
   */
  private isWithinWorkspace(uri: vscode.Uri): boolean {
    try {
      const workspacePath = this.workspaceUri.fsPath.toLowerCase();
      const filePath = uri.fsPath.toLowerCase();

      // Normalize paths for comparison
      const normalizedWorkspace = workspacePath.endsWith('/') || workspacePath.endsWith('\\')
        ? workspacePath
        : workspacePath + '/';

      const normalizedFile = filePath.endsWith('/') || filePath.endsWith('\\')
        ? filePath
        : filePath + '/';

      // Check if file path starts with workspace path
      return normalizedFile.startsWith(normalizedWorkspace) || filePath === workspacePath;
    } catch {
      return false;
    }
  }

  /**
   * Resolve file URI with extension inference and index file resolution
   *
   * Tries in order:
   * 1. Exact path (if has extension)
   * 2. Path + supported extensions (.ts, .tsx, .js, .jsx)
   * 3. Path as directory with index file
   *
   * @param baseUri - Base URI without extension
   * @returns Resolved file URI or null if not found
   */
  private async resolveFile(baseUri: vscode.Uri): Promise<vscode.Uri | null> {
    // 1. If path already has extension and exists, return it
    const hasExtension = this.extensions.some((ext) => baseUri.path.endsWith(ext));
    if (hasExtension && (await this.fileExists(baseUri))) {
      return baseUri;
    }

    // 2. Try adding various extensions
    for (const ext of this.extensions) {
      const uriWithExt = baseUri.with({ path: baseUri.path + ext });
      if (await this.fileExists(uriWithExt)) {
        return uriWithExt;
      }
    }

    // 3. Try as directory with index file
    if (await this.directoryExists(baseUri)) {
      for (const ext of this.extensions) {
        const indexUri = vscode.Uri.joinPath(baseUri, `index${ext}`);
        if (await this.fileExists(indexUri)) {
          return indexUri;
        }
      }
    }

    // 4. Cannot resolve
    return null;
  }

  /**
   * Get file type from URI (File, Directory, or null if not exists)
   */
  private async getFileType(uri: vscode.Uri): Promise<vscode.FileType | null> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      return stat.type;
    } catch {
      return null;
    }
  }

  /**
   * Check if URI exists and is a file
   */
  private async fileExists(uri: vscode.Uri): Promise<boolean> {
    const fileType = await this.getFileType(uri);
    return fileType === vscode.FileType.File;
  }

  /**
   * Check if URI exists and is a directory
   */
  private async directoryExists(uri: vscode.Uri): Promise<boolean> {
    const fileType = await this.getFileType(uri);
    return fileType === vscode.FileType.Directory;
  }
}
