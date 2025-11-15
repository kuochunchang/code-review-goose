import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { umlRouter } from '../../../routes/uml.js';
import { AIService } from '../../../services/aiService.js';
import { ConfigService } from '../../../services/configService.js';
import type { UMLResult } from '../../../services/umlService.js';
import { UMLService } from '../../../services/umlService.js';

// Mock services
vi.mock('../../../services/umlService.js');
vi.mock('../../../services/aiService.js');
vi.mock('../../../services/configService.js');

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
      expect(mockGenerateDiagram).toHaveBeenCalledWith('class Test {}', 'class');
    });

    it('should accept forceRefresh parameter for backward compatibility', async () => {
      const mockGenerateDiagram = vi.fn().mockResolvedValue(mockUMLResult);

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
        .send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          forceRefresh: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mermaidCode).toBeDefined();
      expect(mockGenerateDiagram).toHaveBeenCalled();
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post('/api/uml/generate').send({ type: 'class' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Code is required');
    });

    it('should return 400 when type is missing', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', filePath: '/test/file.ts' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Type is required');
    });

    it('should return 400 for invalid diagram type', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'invalid', filePath: '/test/file.ts' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be one of');
    });

    it('should handle UML generation errors', async () => {
      const mockGenerateDiagram = vi.fn().mockRejectedValue(new Error('Generation failed'));

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
        .send({ code: 'class Test {}', type: 'class', filePath: '/test/file.ts' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Generation failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    describe('Cross-file analysis', () => {
      const mockCrossFileUMLResult: UMLResult = {
        type: 'class',
        mermaidCode: 'classDiagram\n  class Car\n  class Engine\n  Car *-- Engine',
        generationMode: 'native',
        metadata: {
          depth: 1,
          mode: 'bidirectional',
          analysis: {
            targetFile: '/test/file.ts',
            totalFiles: 3,
            totalClasses: 3,
            totalRelationships: 2,
            forwardDeps: 2,
            reverseDeps: 0,
          },
          validation: { valid: true, errors: [] },
        },
      };

      it('should generate cross-file class diagram with bidirectional analysis', async () => {
        const mockGenerateCrossFile = vi.fn().mockResolvedValue(mockCrossFileUMLResult);

        vi.mocked(ConfigService).mockImplementation(
          () =>
            ({
              get: vi.fn().mockResolvedValue({ aiProvider: 'openai' }),
            }) as any
        );

        vi.mocked(AIService).mockImplementation(
          () =>
            ({
              isConfigured: vi.fn().mockResolvedValue(false),
            }) as any
        );

        vi.mocked(UMLService).mockImplementation(
          () =>
            ({
              generateCrossFileClassDiagram: mockGenerateCrossFile,
            }) as any
        );

        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          crossFileAnalysis: true,
          analysisDepth: 1,
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.crossFileAnalysis).toBe(true);
        expect(response.body.data.metadata.analysis).toBeDefined();
        expect(mockGenerateCrossFile).toHaveBeenCalledWith('/test/file.ts', '/test/project', 1, 'bidirectional');
      });

      it('should use default value for analysisDepth', async () => {
        const mockGenerateCrossFile = vi.fn().mockResolvedValue(mockCrossFileUMLResult);

        vi.mocked(ConfigService).mockImplementation(
          () =>
            ({
              get: vi.fn().mockResolvedValue({}),
            }) as any
        );

        vi.mocked(AIService).mockImplementation(
          () =>
            ({
              isConfigured: vi.fn().mockResolvedValue(false),
            }) as any
        );

        vi.mocked(UMLService).mockImplementation(
          () =>
            ({
              generateCrossFileClassDiagram: mockGenerateCrossFile,
            }) as any
        );

        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          crossFileAnalysis: true,
        });

        expect(response.status).toBe(200);
        expect(mockGenerateCrossFile).toHaveBeenCalledWith('/test/file.ts', '/test/project', 1, 'bidirectional');
      });

      it('should return 400 when crossFileAnalysis is used with non-class diagram', async () => {
        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'flowchart',
          filePath: '/test/file.ts',
          crossFileAnalysis: true,
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('only supported for class diagrams');
      });

      it('should return 400 for invalid analysisDepth', async () => {
        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          crossFileAnalysis: true,
          analysisDepth: 4,
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('analysisDepth must be 1, 2, or 3');
      });
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
