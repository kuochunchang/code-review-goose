import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { umlRouter } from '../../../routes/uml.js';
import { UMLService } from '../../../services/umlService.js';
import { AIService } from '../../../services/aiService.js';
import { ConfigService } from '../../../services/configService.js';
import { InsightService } from '../../../services/insightService.js';
import type { UMLResult } from '../../../services/umlService.js';

// Mock services
vi.mock('../../../services/umlService.js');
vi.mock('../../../services/aiService.js');
vi.mock('../../../services/configService.js');
vi.mock('../../../services/insightService.js');

describe('UML API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/uml', umlRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/uml/generate', () => {
    const mockUMLResult: UMLResult = {
      type: 'class',
      mermaidCode: 'classDiagram\n  class Test',
      generationMode: 'native',
      metadata: {
        classes: [{ name: 'Test', type: 'class', properties: [], methods: [] }],
      },
    };

    it('should generate UML diagram successfully', async () => {
      const mockGenerateDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(InsightService).mockImplementation(
        () =>
          ({
            check: vi.fn().mockResolvedValue({ hasRecord: false, hashMatched: false, insight: null }),
            setUML: vi.fn().mockResolvedValue(undefined),
          }) as any
      );

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue({ aiProvider: 'openai' }),
          }) as any
      );

      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
          }) as any
      );

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateDiagram: mockGenerateDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class', filePath: '/test/file.ts' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mermaidCode).toBeDefined();
      expect(response.body.data.fromInsights).toBe(false);
    });

    it('should return cached result when available', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockUMLResult),
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fromCache).toBe(true);
    });

    it('should force refresh when requested', async () => {
      const mockGenerateDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockUMLResult),
            set: vi.fn().mockResolvedValue(undefined),
          }) as any
      );

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue({ aiProvider: 'openai' }),
          }) as any
      );

      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
          }) as any
      );

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateDiagram: mockGenerateDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class', forceRefresh: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.forceRefreshed).toBe(true);
      expect(mockGenerateDiagram).toHaveBeenCalled();
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post('/api/uml/generate').send({ type: 'class' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Code is required');
    });

    it('should return 400 when type is missing', async () => {
      const response = await request(app).post('/api/uml/generate').send({ code: 'class Test {}' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Type is required');
    });

    it('should return 400 for invalid diagram type', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be one of');
    });

    it('should handle UML generation errors', async () => {
      const mockGenerateDiagram = vi.fn().mockRejectedValue(new Error('Generation failed'));

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn(),
          }) as any
      );

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue({ aiProvider: 'openai' }),
          }) as any
      );

      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
          }) as any
      );

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateDiagram: mockGenerateDiagram,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Generation failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE /api/uml/cache', () => {
    it('should clear UML cache successfully', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            clear: vi.fn().mockResolvedValue(undefined),
          }) as any
      );

      const response = await request(app).delete('/api/uml/cache');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('UML cache cleared successfully');
    });

    it('should handle errors when clearing cache', async () => {
      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            clear: vi.fn().mockRejectedValue(new Error('Clear failed')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).delete('/api/uml/cache');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Clear failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/uml/cache/stats', () => {
    it('should return UML cache statistics', async () => {
      const mockStats = {
        totalEntries: 10,
        totalSize: 2048,
        oldestEntry: new Date().toISOString(),
        newestEntry: new Date().toISOString(),
      };

      vi.mocked(CacheService).mockImplementation(
        () =>
          ({
            getStats: vi.fn().mockResolvedValue(mockStats),
          }) as any
      );

      const response = await request(app).get('/api/uml/cache/stats');

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

      const response = await request(app).get('/api/uml/cache/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Stats failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/uml/supported-types', () => {
    it('should return supported UML types when AI is available', async () => {
      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue({
              uml: {
                generationMode: 'hybrid',
                aiOptions: {
                  enabledTypes: ['sequence', 'dependency'],
                },
              },
            }),
          }) as any
      );

      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(true),
          }) as any
      );

      const response = await request(app).get('/api/uml/supported-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.generationMode).toBe('hybrid');
      expect(response.body.data.aiAvailable).toBe(true);
      expect(response.body.data.types).toHaveLength(4);
      expect(response.body.data.types[0].id).toBe('class');
    });

    it('should return supported UML types when AI is not available', async () => {
      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue({
              uml: {
                generationMode: 'native',
              },
            }),
          }) as any
      );

      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            isConfigured: vi.fn().mockResolvedValue(false),
          }) as any
      );

      const response = await request(app).get('/api/uml/supported-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.aiAvailable).toBe(false);
      expect(response.body.data.types).toHaveLength(4);
    });

    it('should handle errors when getting supported types', async () => {
      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockRejectedValue(new Error('Config failed')),
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/uml/supported-types');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Config failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
