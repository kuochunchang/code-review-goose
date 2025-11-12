import fs from 'fs-extra';
import path from 'path';
import ignore from 'ignore';
import type { Ignore } from 'ignore';

export interface ProjectInfo {
  name: string;
  path: string;
  fileCount: number;
  totalSize: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.DS_Store',
  'dist',
  'build',
  '.code-review',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
];

export class ProjectService {
  private projectPath: string;
  private ig: Ignore;
  private projectInfoCache: ProjectInfo | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // Cache TTL: 5 minutes

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.ig = ignore.default().add(DEFAULT_IGNORE_PATTERNS);
    this.loadGitignore();
  }

  private async loadGitignore() {
    try {
      const gitignorePath = path.join(this.projectPath, '.gitignore');
      if (await fs.pathExists(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        this.ig.add(content);
      }
    } catch (error) {
      // .gitignore does not exist or cannot be read, using default rules
    }
  }

  async getProjectInfo(useCache: boolean = true): Promise<ProjectInfo> {
    // Check if cache is valid
    if (useCache && this.projectInfoCache && this.isCacheValid()) {
      return this.projectInfoCache;
    }

    await fs.stat(this.projectPath);
    const name = path.basename(this.projectPath);

    // Traverse entire directory tree to calculate file count and total size
    const stats = await this.calculateProjectStats(this.projectPath, '');

    const projectInfo: ProjectInfo = {
      name,
      path: this.projectPath,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
    };

    // Update cache
    this.projectInfoCache = projectInfo;
    this.cacheTimestamp = Date.now();

    return projectInfo;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  /**
   * Clear project info cache
   */
  clearCache(): void {
    this.projectInfoCache = null;
    this.cacheTimestamp = 0;
  }

  private async calculateProjectStats(
    fullPath: string,
    relativePath: string
  ): Promise<{ fileCount: number; totalSize: number }> {
    const stats = await fs.stat(fullPath);

    if (stats.isFile()) {
      return {
        fileCount: 1,
        totalSize: stats.size,
      };
    }

    // Directory: recursively calculate children
    let fileCount = 0;
    let totalSize = 0;

    try {
      const entries = await fs.readdir(fullPath);

      for (const entry of entries) {
        const entryRelativePath = relativePath ? `${relativePath}/${entry}` : entry;

        // Check if should be ignored
        if (this.ig.ignores(entryRelativePath)) {
          continue;
        }

        const entryFullPath = path.join(fullPath, entry);
        try {
          const childStats = await this.calculateProjectStats(entryFullPath, entryRelativePath);
          fileCount += childStats.fileCount;
          totalSize += childStats.totalSize;
        } catch (error) {
          // Ignore unreadable files/directories
          continue;
        }
      }
    } catch (error) {
      // Ignore unreadable directories
    }

    return { fileCount, totalSize };
  }

  async getFileTree(): Promise<FileNode> {
    return this.buildFileTree(this.projectPath, '');
  }

  /**
   * Find README file in project root directory
   * @returns README file path (relative) or null if not found
   */
  async findReadmeFile(): Promise<string | null> {
    // Common README file names (case-insensitive)
    const readmePatterns = [
      'README.md',
      'readme.md',
      'Readme.md',
      'README.MD',
      'README',
      'readme',
      'README.txt',
      'readme.txt',
      'README.rst',
      'readme.rst',
    ];

    try {
      const entries = await fs.readdir(this.projectPath);

      // Find the first matching README file
      for (const pattern of readmePatterns) {
        if (entries.includes(pattern)) {
          const filePath = path.join(this.projectPath, pattern);
          const stats = await fs.stat(filePath);

          // Make sure it's a file, not a directory
          if (stats.isFile()) {
            return pattern; // Return relative path
          }
        }
      }
    } catch (error) {
      // If directory can't be read, return null
      return null;
    }

    return null;
  }

  private async buildFileTree(fullPath: string, relativePath: string): Promise<FileNode> {
    const stats = await fs.stat(fullPath);
    const name = path.basename(fullPath);

    if (stats.isFile()) {
      return {
        name,
        path: relativePath,
        type: 'file',
        size: stats.size,
      };
    }

    // Directory
    const children: FileNode[] = [];
    const entries = await fs.readdir(fullPath);

    for (const entry of entries) {
      const entryRelativePath = relativePath ? `${relativePath}/${entry}` : entry;

      // Check if should be ignored
      if (this.ig.ignores(entryRelativePath)) {
        continue;
      }

      const entryFullPath = path.join(fullPath, entry);
      try {
        const childNode = await this.buildFileTree(entryFullPath, entryRelativePath);
        children.push(childNode);
      } catch (error) {
        // Ignore unreadable files/directories
        continue;
      }
    }

    return {
      name: name || path.basename(this.projectPath),
      path: relativePath,
      type: 'directory',
      children,
    };
  }
}
