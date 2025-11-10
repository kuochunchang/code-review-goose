import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { analysisRouter } from '../../../routes/analysis.js';
import { AIService } from '../../../services/aiService.js';
import { CacheService } from '../../../services/cacheService.js';
import { mockAnalysisResult, mockCachedResult, mockOpenAIConfig } from '../../fixtures/index.js';

// Mock services
vi.mock('../../../services/aiService.js');
vi.mock('../../../services/cacheService.js');

describe('Analysis API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/analysis', analysisRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/analysis/analyze', () => {
    it('should analyze code successfully', async () => {
      // ✅ Using pre-defined fixture from fixtures/analysis.fixtures.ts
      const mockIsConfigured = vi.fn().mockResolvedValue(true);
      const mockAnalyzeCode = vi.fn().mockResolvedValue(mockAnalysisResult);

      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: mockIsConfigured,
            analyzeCode: mockAnalyzeCode,
          }) as any
      );

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
          }) as any
      );

      const response = await request(app)
        .post('/api/analysis/analyze')
        .send({ code: 'const x = 1;', options: { language: 'typescript' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.issues).toBeDefined();
      expect(response.body.data.fromCache).toBe(false);
    });

    it('should return cached result when available', async () => {
      // ✅ Using pre-defined cached result fixture
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
          }) as any
      );

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockCachedResult),
          }) as any
      );

      const response = await request(app)
        .post('/api/analysis/analyze')
        .send({ code: 'const x = 1;' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fromCache).toBe(true);
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post('/api/analysis/analyze').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Code is required and must be a string');
    });

    it('should return 400 when AI is not configured', async () => {
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(false),
          }) as any
      );

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(null),
          }) as any
      );

      const response = await request(app)
        .post('/api/analysis/analyze')
        .send({ code: 'const x = 1;' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('AI provider not configured');
    });

    it('should return 400 when file type is not analyzable', async () => {
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
            isFileAnalyzable: vi.fn().mockResolvedValue(false),
          }) as any
      );

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(null),
          }) as any
      );

      const response = await request(app)
        .post('/api/analysis/analyze')
        .send({ code: 'const x = 1;', options: { filePath: 'test.txt' } });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('cannot be analyzed');
    });

    it('should handle analysis errors', async () => {
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
            analyzeCode: vi.fn().mockRejectedValue(new Error('Analysis failed')),
          }) as any
      );

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn(),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/analysis/analyze')
        .send({ code: 'const x = 1;' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Analysis failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/analysis/status', () => {
    it('should return AI configuration status', async () => {
      // ✅ Using pre-defined OpenAI config fixture
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
            getConfig: vi.fn().mockResolvedValue(mockOpenAIConfig),
          }) as any
      );

      const response = await request(app).get('/api/analysis/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.configured).toBe(true);
      expect(response.body.data.provider).toBe('openai');
      expect(response.body.data.model).toBe('gpt-4');
    });

    it('should handle errors when checking status', async () => {
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockRejectedValue(new Error('Config error')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/analysis/status');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Config error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE /api/analysis/cache', () => {
    it('should clear cache successfully', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            clear: vi.fn().mockResolvedValue(undefined),
          }) as any
      );

      const response = await request(app).delete('/api/analysis/cache');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Cache cleared successfully');
    });

    it('should handle errors when clearing cache', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            clear: vi.fn().mockRejectedValue(new Error('Clear failed')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).delete('/api/analysis/cache');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Clear failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/analysis/cache/stats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        totalEntries: 5,
        totalSize: 1024,
        oldestEntry: new Date().toISOString(),
        newestEntry: new Date().toISOString(),
      };

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            getStats: vi.fn().mockResolvedValue(mockStats),
          }) as any
      );

      const response = await request(app).get('/api/analysis/cache/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should handle errors when getting cache stats', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            getStats: vi.fn().mockRejectedValue(new Error('Stats failed')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/analysis/cache/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Stats failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/analysis/is-analyzable', () => {
    it('should check if file is analyzable', async () => {
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isFileAnalyzable: vi.fn().mockResolvedValue(true),
          }) as any
      );

      const response = await request(app)
        .get('/api/analysis/is-analyzable')
        .query({ filePath: 'src/test.ts' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAnalyzable).toBe(true);
      expect(response.body.data.filePath).toBe('src/test.ts');
    });

    it('should return 400 when filePath is missing', async () => {
      const response = await request(app).get('/api/analysis/is-analyzable');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File path is required');
    });

    it('should handle errors when checking analyzability', async () => {
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isFileAnalyzable: vi.fn().mockRejectedValue(new Error('Check failed')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .get('/api/analysis/is-analyzable')
        .query({ filePath: 'src/test.ts' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Check failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST /api/analysis/cached', () => {
    it('should return cached result when available', async () => {
      // ✅ Using pre-defined cached result fixture
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockCachedResult),
          }) as any
      );

      const response = await request(app)
        .post('/api/analysis/cached')
        .send({ code: 'const x = 1;' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fromCache).toBe(true);
    });

    it('should return null when no cache available', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(null),
          }) as any
      );

      const response = await request(app)
        .post('/api/analysis/cached')
        .send({ code: 'const x = 1;' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post('/api/analysis/cached').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Code is required and must be a string');
    });

    it('should handle errors when querying cache', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockRejectedValue(new Error('Query failed')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/analysis/cached')
        .send({ code: 'const x = 1;' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Query failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
