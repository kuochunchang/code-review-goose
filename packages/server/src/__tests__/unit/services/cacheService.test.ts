import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../../../services/cacheService.js';
import type { AnalysisResult } from '../../../types/ai.js';
import fs from 'fs-extra';

// Mock fs-extra
vi.mock('fs-extra');

describe('CacheService', () => {
  let cacheService: CacheService;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    cacheService = new CacheService(mockProjectPath, 'analysis');
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached result if exists and not expired', async () => {
      const mockCode = 'console.log("test");';
      const mockOptions = { language: 'typescript' };
      const mockResult: AnalysisResult = {
        issues: [],
        summary: 'No issues found',
        timestamp: new Date().toISOString(),
      };

      const cacheData = {
        timestamp: new Date().toISOString(),
        result: mockResult,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData) as any);

      const result = await cacheService.get(mockCode, mockOptions);

      expect(result).toEqual(mockResult);
    });

    it('should return null if cache does not exist', async () => {
      const mockCode = 'console.log("test");';
      const mockOptions = {};

      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await cacheService.get(mockCode, mockOptions);

      expect(result).toBeNull();
    });

    it('should return null and remove cache if expired (> 7 days)', async () => {
      const mockCode = 'console.log("test");';
      const mockOptions = {};

      // Create cache data that is 8 days old
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 8);

      const cacheData = {
        timestamp: expiredDate.toISOString(),
        result: { issues: [] },
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(cacheData) as any);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await cacheService.get(mockCode, mockOptions);

      expect(result).toBeNull();
      expect(fs.remove).toHaveBeenCalled();
    });

    it('should return null on read error', async () => {
      const mockCode = 'console.log("test");';
      const mockOptions = {};

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cacheService.get(mockCode, mockOptions);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache read error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should save result to cache', async () => {
      const mockCode = 'console.log("test");';
      const mockOptions = { language: 'typescript' };
      const mockResult: AnalysisResult = {
        issues: [],
        summary: 'No issues found',
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await cacheService.set(mockCode, mockOptions, mockResult);

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const cacheData = JSON.parse(writeCall[1] as string);
      expect(cacheData.result).toEqual(mockResult);
      expect(cacheData.timestamp).toBeDefined();
    });

    it('should not throw error on write failure', async () => {
      const mockCode = 'console.log("test");';
      const mockOptions = {};
      const mockResult: AnalysisResult = {
        issues: [],
        summary: 'No issues found',
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        cacheService.set(mockCode, mockOptions, mockResult)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Cache write error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should remove cache directory', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      await cacheService.clear();

      expect(fs.remove).toHaveBeenCalled();
    });

    it('should not fail if cache directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await expect(cacheService.clear()).resolves.not.toThrow();
      expect(fs.remove).not.toHaveBeenCalled();
    });

    it('should throw error on clear failure', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('Remove error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(cacheService.clear()).rejects.toThrow('Failed to clear cache');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockFiles = ['file1.json', 'file2.json', 'readme.txt'];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);

      const stats = await cacheService.getStats();

      expect(stats.count).toBe(2); // Only .json files
      expect(stats.totalSize).toBe(2048); // 2 files * 1024
    });

    it('should return zero stats if cache directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const stats = await cacheService.getStats();

      expect(stats.count).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it('should return zero stats on error', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const stats = await cacheService.getStats();

      expect(stats.count).toBe(0);
      expect(stats.totalSize).toBe(0);

      consoleErrorSpy.mockRestore();
    });
  });
});
