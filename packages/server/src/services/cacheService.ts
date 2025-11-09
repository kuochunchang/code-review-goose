import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import type { AnalysisResult } from '../types/ai.js';

const CACHE_BASE_DIR = '.code-review/cache';

export type CacheType = 'analysis' | 'uml';

export class CacheService {
  private cacheDir: string;
  private cacheType: CacheType;

  constructor(projectPath: string, cacheType: CacheType = 'analysis') {
    this.cacheType = cacheType;
    this.cacheDir = path.join(projectPath, CACHE_BASE_DIR, cacheType);
  }

  /**
   * Calculate hash value of code
   */
  private computeHash(code: string, options: any): string {
    const data = JSON.stringify({ code, options });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    await fs.ensureDir(this.cacheDir);
  }

  /**
   * Get cache file path
   */
  private getCachePath(hash: string): string {
    return path.join(this.cacheDir, `${hash}.json`);
  }

  /**
   * Get result from cache
   */
  async get<T = AnalysisResult>(code: string, options: any): Promise<T | null> {
    try {
      const hash = this.computeHash(code, options);
      const cachePath = this.getCachePath(hash);

      if (await fs.pathExists(cachePath)) {
        const content = await fs.readFile(cachePath, 'utf-8');
        const cached = JSON.parse(content);

        // Check if cache is expired (7 days)
        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (cacheAge < maxAge) {
          return cached.result as T;
        }

        // Cache expired, delete
        await fs.remove(cachePath);
      }

      return null;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Save result to cache
   */
  async set<T = AnalysisResult>(code: string, options: any, result: T): Promise<void> {
    try {
      await this.ensureCacheDir();

      const hash = this.computeHash(code, options);
      const cachePath = this.getCachePath(hash);

      const cacheData = {
        timestamp: new Date().toISOString(),
        result,
      };

      await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Cache write error:', error);
      // Don't throw error, cache failure should not affect main functionality
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (await fs.pathExists(this.cacheDir)) {
        await fs.remove(this.cacheDir);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    count: number;
    totalSize: number;
  }> {
    try {
      if (!(await fs.pathExists(this.cacheDir))) {
        return { count: 0, totalSize: 0 };
      }

      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return {
        count: files.filter((f) => f.endsWith('.json')).length,
        totalSize,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}
