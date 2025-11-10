import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import ignoreModule from 'ignore';
import type { Ignore } from 'ignore';

const ignore = (ignoreModule as any).default || ignoreModule;
import type {
  SearchOptions,
  SearchResult,
  SearchFileResult,
  SearchMatch,
  SearchMatchWithContext,
  SearchFileResultWithContext,
  SearchHistoryItem,
  SearchStats,
} from '../types/search.js';

const SEARCH_HISTORY_DIR = '.code-review/search';
const MAX_HISTORY_ITEMS = 100;

export class SearchService {
  private projectPath: string;
  private historyDir: string;
  private ig: Ignore;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.historyDir = path.join(projectPath, SEARCH_HISTORY_DIR);
    this.ig = ignore();
    this.initializeIgnorePatterns();
  }

  /**
   * Initialize ignore patterns
   */
  private initializeIgnorePatterns(): void {
    // Default ignore patterns
    this.ig.add([
      'node_modules/**',
      '.git/**',
      '.code-review/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.next/**',
      '.nuxt/**',
      '.vscode/**',
      '.idea/**',
      '*.log',
      '*.lock',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ]);
  }

  /**
   * Execute search
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    const {
      query,
      caseSensitive = false,
      useRegex = false,
      filePattern,
      includePatterns,
      excludePatterns,
      maxResults = 1000,
    } = options;

    if (!query || query.trim() === '') {
      throw new Error('Search query is required');
    }

    // Create search regular expression
    let searchRegex: RegExp;
    try {
      if (useRegex) {
        searchRegex = new RegExp(query, caseSensitive ? 'g' : 'gi');
      } else {
        // Escape special characters for literal search
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(escapedQuery, caseSensitive ? 'g' : 'gi');
      }
    } catch (error) {
      throw new Error(
        `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Collect all files
    const files = await this.collectFiles(filePattern, includePatterns, excludePatterns);

    // Search files
    const fileResults: SearchFileResult[] = [];
    let totalMatches = 0;
    let truncated = false;

    for (const file of files) {
      if (totalMatches >= maxResults) {
        truncated = true;
        break;
      }

      const result = await this.searchInFile(file, searchRegex, maxResults - totalMatches);

      if (result && result.matches.length > 0) {
        fileResults.push(result);
        totalMatches += result.totalMatches;
      }
    }

    const searchTime = Date.now() - startTime;

    // Save search history
    await this.saveHistory({
      query,
      options,
      resultCount: totalMatches,
    });

    return {
      files: fileResults,
      totalFiles: fileResults.length,
      totalMatches,
      searchTime,
      truncated,
    };
  }

  /**
   * Search with context
   */
  async searchWithContext(options: SearchOptions): Promise<{
    files: SearchFileResultWithContext[];
    totalFiles: number;
    totalMatches: number;
    searchTime: number;
    truncated: boolean;
  }> {
    const result = await this.search(options);
    const contextLines = options.contextLines || 2;

    const filesWithContext: SearchFileResultWithContext[] = [];

    for (const fileResult of result.files) {
      const filePath = path.join(this.projectPath, fileResult.filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      const matchesWithContext: SearchMatchWithContext[] = fileResult.matches.map((match) => {
        const lineIndex = match.line - 1;
        const contextBefore: string[] = [];
        const contextAfter: string[] = [];

        // Context before
        for (let i = Math.max(0, lineIndex - contextLines); i < lineIndex; i++) {
          contextBefore.push(lines[i] || '');
        }

        // Context after
        for (
          let i = lineIndex + 1;
          i <= Math.min(lines.length - 1, lineIndex + contextLines);
          i++
        ) {
          contextAfter.push(lines[i] || '');
        }

        return {
          ...match,
          contextBefore,
          contextAfter,
        };
      });

      filesWithContext.push({
        ...fileResult,
        matches: matchesWithContext,
      });
    }

    return {
      files: filesWithContext,
      totalFiles: result.totalFiles,
      totalMatches: result.totalMatches,
      searchTime: result.searchTime,
      truncated: result.truncated,
    };
  }

  /**
   * Collect files to search
   */
  private async collectFiles(
    filePattern?: string,
    includePatterns?: string[],
    excludePatterns?: string[]
  ): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectPath, fullPath);

        // Check if should be ignored
        if (this.ig.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          // Check file pattern
          if (filePattern && !this.matchPattern(entry.name, filePattern)) {
            continue;
          }

          // Check include patterns
          if (includePatterns && includePatterns.length > 0) {
            const matches = includePatterns.some((pattern) =>
              this.matchPattern(relativePath, pattern)
            );
            if (!matches) continue;
          }

          // Check exclude patterns
          if (excludePatterns && excludePatterns.length > 0) {
            const excluded = excludePatterns.some((pattern) =>
              this.matchPattern(relativePath, pattern)
            );
            if (excluded) continue;
          }

          files.push(relativePath);
        }
      }
    };

    await walk(this.projectPath);
    return files;
  }

  /**
   * Match pattern (supports * and **)
   */
  private matchPattern(filename: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  }

  /**
   * Search in single file
   */
  private async searchInFile(
    relativePath: string,
    searchRegex: RegExp,
    maxMatches: number
  ): Promise<SearchFileResult | null> {
    try {
      const filePath = path.join(this.projectPath, relativePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      const matches: SearchMatch[] = [];

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        if (matches.length >= maxMatches) break;

        const line = lines[lineIndex];
        const lineMatches = Array.from(line.matchAll(searchRegex));

        for (const match of lineMatches) {
          if (matches.length >= maxMatches) break;

          const matchStart = match.index || 0;
          const matchEnd = matchStart + match[0].length;

          matches.push({
            line: lineIndex + 1,
            column: matchStart,
            text: line,
            matchText: match[0],
            matchStart,
            matchEnd,
          });
        }
      }

      if (matches.length === 0) {
        return null;
      }

      return {
        filePath: relativePath,
        fileName: path.basename(relativePath),
        matches,
        totalMatches: matches.length,
      };
    } catch (error) {
      // Ignore unreadable files (e.g., binary files)
      return null;
    }
  }

  /**
   * Save search history
   */
  private async saveHistory(data: {
    query: string;
    options: SearchOptions;
    resultCount: number;
  }): Promise<void> {
    try {
      await fs.ensureDir(this.historyDir);

      const historyItem: SearchHistoryItem = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        query: data.query,
        options: data.options,
        resultCount: data.resultCount,
      };

      const historyFile = path.join(this.historyDir, 'history.json');
      let history: SearchHistoryItem[] = [];

      if (await fs.pathExists(historyFile)) {
        const content = await fs.readFile(historyFile, 'utf-8');
        history = JSON.parse(content);
      }

      // Add new item and limit quantity
      history.unshift(historyItem);
      history = history.slice(0, MAX_HISTORY_ITEMS);

      await fs.writeFile(historyFile, JSON.stringify(history, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save search history:', error);
      // Don't throw error, history failure should not affect search functionality
    }
  }

  /**
   * Get search history
   */
  async getHistory(limit: number = 10): Promise<SearchHistoryItem[]> {
    try {
      const historyFile = path.join(this.historyDir, 'history.json');

      if (!(await fs.pathExists(historyFile))) {
        return [];
      }

      const content = await fs.readFile(historyFile, 'utf-8');
      const history: SearchHistoryItem[] = JSON.parse(content);

      return history.slice(0, limit);
    } catch (error) {
      console.error('Failed to load search history:', error);
      return [];
    }
  }

  /**
   * Clear search history
   */
  async clearHistory(): Promise<void> {
    try {
      const historyFile = path.join(this.historyDir, 'history.json');
      if (await fs.pathExists(historyFile)) {
        await fs.remove(historyFile);
      }
    } catch (error) {
      console.error('Failed to clear search history:', error);
      throw new Error('Failed to clear search history');
    }
  }

  /**
   * Get search statistics
   */
  async getStats(): Promise<SearchStats> {
    try {
      const history = await this.getHistory(MAX_HISTORY_ITEMS);

      // Calculate popular queries
      const queryCount = new Map<string, number>();
      for (const item of history) {
        const count = queryCount.get(item.query) || 0;
        queryCount.set(item.query, count + 1);
      }

      const popularQueries = Array.from(queryCount.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalSearches: history.length,
        recentSearches: history.slice(0, 10),
        popularQueries,
      };
    } catch (error) {
      console.error('Failed to get search stats:', error);
      return {
        totalSearches: 0,
        recentSearches: [],
        popularQueries: [],
      };
    }
  }
}
