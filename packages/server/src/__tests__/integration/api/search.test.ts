import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { searchRouter } from '../../../routes/search.js';
import { SearchService } from '../../../services/searchService.js';
import type { SearchResult, SearchResultWithContext } from '../../../types/search.js';

// Mock SearchService
vi.mock('../../../services/searchService.js');

describe('Search API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/search', searchRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/search', () => {
    it('should perform search successfully', async () => {
      const mockResult: SearchResult = {
        matches: [
          {
            filePath: 'src/test.ts',
            lineNumber: 10,
            line: 'const test = "search term";',
            column: 15,
          },
        ],
        totalMatches: 1,
        searchTime: 50,
      };

      const mockSearch = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            search: mockSearch,
          }) as any
      );

      const response = await request(app)
        .post('/api/search')
        .send({ query: 'search term', caseSensitive: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app).post('/api/search').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });

    it('should return 400 when query is empty string', async () => {
      const response = await request(app).post('/api/search').send({ query: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });

    it('should handle search errors', async () => {
      const mockSearch = vi.fn().mockRejectedValue(new Error('Search failed'));
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            search: mockSearch,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).post('/api/search').send({ query: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST /api/search/with-context', () => {
    it('should perform search with context successfully', async () => {
      const mockResult: SearchResultWithContext = {
        matches: [
          {
            filePath: 'src/test.ts',
            lineNumber: 10,
            line: 'const test = "search term";',
            column: 15,
            contextBefore: ['// Previous line'],
            contextAfter: ['// Next line'],
          },
        ],
        totalMatches: 1,
        searchTime: 60,
      };

      const mockSearchWithContext = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            searchWithContext: mockSearchWithContext,
          }) as any
      );

      const response = await request(app)
        .post('/api/search/with-context')
        .send({ query: 'search term', contextLines: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.data.matches[0].contextBefore).toBeDefined();
      expect(response.body.data.matches[0].contextAfter).toBeDefined();
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app).post('/api/search/with-context').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });

    it('should handle search errors', async () => {
      const mockSearchWithContext = vi.fn().mockRejectedValue(new Error('Context search failed'));
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            searchWithContext: mockSearchWithContext,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).post('/api/search/with-context').send({ query: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Context search failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/search/history', () => {
    it('should return search history', async () => {
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

      const mockGetHistory = vi.fn().mockResolvedValue(mockHistory);
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            getHistory: mockGetHistory,
          }) as any
      );

      const response = await request(app).get('/api/search/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistory);
    });

    it('should support limit parameter', async () => {
      const mockGetHistory = vi.fn().mockResolvedValue([]);
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            getHistory: mockGetHistory,
          }) as any
      );

      const response = await request(app).get('/api/search/history').query({ limit: '5' });

      expect(response.status).toBe(200);
      expect(mockGetHistory).toHaveBeenCalledWith(5);
    });

    it('should handle errors when getting history', async () => {
      const mockGetHistory = vi.fn().mockRejectedValue(new Error('History failed'));
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            getHistory: mockGetHistory,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/search/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('History failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE /api/search/history', () => {
    it('should clear search history', async () => {
      const mockClearHistory = vi.fn().mockResolvedValue(undefined);
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            clearHistory: mockClearHistory,
          }) as any
      );

      const response = await request(app).delete('/api/search/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Search history cleared successfully');
    });

    it('should handle errors when clearing history', async () => {
      const mockClearHistory = vi.fn().mockRejectedValue(new Error('Clear failed'));
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            clearHistory: mockClearHistory,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).delete('/api/search/history');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Clear failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/search/stats', () => {
    it('should return search statistics', async () => {
      const mockStats = {
        totalSearches: 10,
        recentSearches: ['test1', 'test2'],
        popularQueries: [
          { query: 'test', count: 5 },
          { query: 'search', count: 3 },
        ],
        averageResultCount: 7.5,
      };

      const mockGetStats = vi.fn().mockResolvedValue(mockStats);
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            getStats: mockGetStats,
          }) as any
      );

      const response = await request(app).get('/api/search/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should handle errors when getting stats', async () => {
      const mockGetStats = vi.fn().mockRejectedValue(new Error('Stats failed'));
      vi.mocked(SearchService).mockImplementation(
        () =>
          ({
            getStats: mockGetStats,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/search/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Stats failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
