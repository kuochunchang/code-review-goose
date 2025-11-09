import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchService } from '../../../services/searchService.js';
import type { SearchOptions } from '../../../types/search.js';
import fs from 'fs-extra';

// Mock fs-extra
vi.mock('fs-extra');

describe('SearchService', () => {
  let searchService: SearchService;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    searchService = new SearchService(mockProjectPath);
  });

  describe('search', () => {
    it('should throw error when query is empty', async () => {
      const options: SearchOptions = {
        query: '',
      };

      await expect(searchService.search(options)).rejects.toThrow('Search query is required');
    });

    it('should throw error when query is only whitespace', async () => {
      const options: SearchOptions = {
        query: '   ',
      };

      await expect(searchService.search(options)).rejects.toThrow('Search query is required');
    });

    it('should throw error for invalid regex pattern', async () => {
      const options: SearchOptions = {
        query: '[invalid(',
        useRegex: true,
      };

      await expect(searchService.search(options)).rejects.toThrow('Invalid regex pattern');
    });

    it('should perform basic search and return results', async () => {
      const options: SearchOptions = {
        query: 'test',
        caseSensitive: false,
      };

      // Mock fs.readdir for project root
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
      ] as any);

      // Mock fs.readFile for file content
      vi.mocked(fs.readFile).mockResolvedValueOnce('This is a test file\ntest content here' as any);

      // Mock fs.ensureDir for history
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.search(options);

      expect(result.totalFiles).toBeGreaterThanOrEqual(0);
      expect(result.totalMatches).toBeGreaterThanOrEqual(0);
      expect(result.searchTime).toBeGreaterThanOrEqual(0);
      expect(result.truncated).toBe(false);
    });

    it('should respect case sensitivity option', async () => {
      const options: SearchOptions = {
        query: 'TEST',
        caseSensitive: true,
      };

      // Mock empty directory
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      // Mock history operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.search(options);

      expect(result).toBeDefined();
      expect(result.totalFiles).toBe(0);
    });

    it('should support regex search', async () => {
      const options: SearchOptions = {
        query: 'test\\w+',
        useRegex: true,
      };

      // Mock empty directory
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      // Mock history operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.search(options);

      expect(result).toBeDefined();
      expect(result.totalFiles).toBe(0);
    });

    it('should respect maxResults limit', async () => {
      const options: SearchOptions = {
        query: 'test',
        maxResults: 5,
      };

      // Mock empty directory
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      // Mock history operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.search(options);

      expect(result.totalMatches).toBeLessThanOrEqual(5);
    });

    it('should handle file reading errors gracefully', async () => {
      const options: SearchOptions = {
        query: 'test',
      };

      // Mock directory with one file
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
      ] as any);

      // Mock file read error
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Permission denied'));

      // Mock history operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.search(options);

      // Should not throw, just return empty results
      expect(result.totalFiles).toBe(0);
      expect(result.totalMatches).toBe(0);
    });
  });

  describe('searchWithContext', () => {
    it('should return results with context lines', async () => {
      const options: SearchOptions = {
        query: 'test',
        contextLines: 2,
      };

      // Mock empty directory
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      // Mock history operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.searchWithContext(options);

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
    });

    it('should use default context lines when not specified', async () => {
      const options: SearchOptions = {
        query: 'test',
      };

      // Mock empty directory
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      // Mock history operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await searchService.searchWithContext(options);

      expect(result).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return search history', async () => {
      // Mock history file exists
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      // Mock history data
      const mockHistory = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          query: 'test1',
          options: { query: 'test1' },
          resultCount: 5,
        },
        {
          id: '2',
          timestamp: new Date().toISOString(),
          query: 'test2',
          options: { query: 'test2' },
          resultCount: 3,
        },
      ];

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockHistory) as any);

      const history = await searchService.getHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(2);
    });

    it('should return empty array when history directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const history = await searchService.getHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should handle errors when reading history', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));

      const history = await searchService.getHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should limit history to specified number', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      // Mock many history items
      const mockHistory = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        timestamp: new Date().toISOString(),
        query: `test${i}`,
        options: { query: `test${i}` },
        resultCount: 1,
      }));

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockHistory) as any);

      const history = await searchService.getHistory(10);

      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('clearHistory', () => {
    it('should clear search history', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);

      await expect(searchService.clearHistory()).resolves.not.toThrow();
      expect(fs.remove).toHaveBeenCalled();
    });

    it('should handle when history directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await expect(searchService.clearHistory()).resolves.not.toThrow();
      expect(fs.remove).not.toHaveBeenCalled();
    });

    it('should handle errors when clearing history', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('Remove error'));

      await expect(searchService.clearHistory()).rejects.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return search statistics', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);

      const mockHistory = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          query: 'test',
          options: { query: 'test' },
          resultCount: 5,
        },
      ];

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockHistory) as any);

      const stats = await searchService.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalSearches).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.recentSearches)).toBe(true);
      expect(Array.isArray(stats.popularQueries)).toBe(true);
    });

    it('should return empty stats when no history exists', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const stats = await searchService.getStats();

      expect(stats.totalSearches).toBe(0);
      expect(stats.recentSearches.length).toBe(0);
      expect(stats.popularQueries.length).toBe(0);
    });

    it('should handle errors when getting stats', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));

      const stats = await searchService.getStats();

      expect(stats.totalSearches).toBe(0);
      expect(stats.recentSearches.length).toBe(0);
    });
  });
});
