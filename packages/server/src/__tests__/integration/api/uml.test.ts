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

    it('should generate UML diagram successfully with unified interface', async () => {
      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

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
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class', filePath: '/test/file.ts' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mermaidCode).toBeDefined();
      expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
        '/test/file.ts',
        '/test/project',
        'class',
        expect.objectContaining({
          depth: 0,
          mode: 'bidirectional',
        })
      );
    });

    it('should accept depth parameter for unified interface', async () => {
      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

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
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          depth: 1,
          analysisMode: 'forward',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mermaidCode).toBeDefined();
      expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
        '/test/file.ts',
        '/test/project',
        'class',
        expect.objectContaining({
          depth: 1,
          mode: 'forward',
        })
      );
    });

    it('should return 400 when filePath is missing', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('filePath is required');
    });

    it('should return 400 when type is missing', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', filePath: '/test/file.ts' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('type is required');
    });

    it('should return 400 for invalid diagram type', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'invalid', filePath: '/test/file.ts' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be one of');
    });

    it('should return 400 for invalid depth', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({ code: 'class Test {}', type: 'class', filePath: '/test/file.ts', depth: 5 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('depth must be between 0');
    });

    it('should return 400 for cross-file analysis on non-class diagrams', async () => {
      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: 'function test() {}',
          type: 'flowchart',
          filePath: '/test/file.ts',
          depth: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('only supported for class diagrams');
    });

    it('should handle UML generation errors', async () => {
      const mockGenerateUnifiedDiagram = vi
        .fn()
        .mockRejectedValue(new Error('Generation failed'));

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
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
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

    describe('Unified analysis with depth parameter', () => {
      const mockCrossFileUMLResult: UMLResult = {
        type: 'class',
        mermaidCode: 'classDiagram\n  class Car\n  class Engine\n  Car *-- Engine',
        generationMode: 'native',
        metadata: {
          depth: 1,
          mode: 'bidirectional',
          singleFile: false,
          filePath: '/test/file.ts',
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

      it('should generate cross-file class diagram with depth=1', async () => {
        const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockCrossFileUMLResult);

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
              generateUnifiedDiagram: mockGenerateUnifiedDiagram,
            }) as any
        );

        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          depth: 1,
          analysisMode: 'bidirectional',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.crossFileAnalysis).toBe(true);
        expect(response.body.data.metadata.analysis).toBeDefined();
        expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
          '/test/file.ts',
          '/test/project',
          'class',
          expect.objectContaining({
            depth: 1,
            mode: 'bidirectional',
          })
        );
      });

      it('should support legacy crossFileAnalysis parameter', async () => {
        const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockCrossFileUMLResult);

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
              generateUnifiedDiagram: mockGenerateUnifiedDiagram,
            }) as any
        );

        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          crossFileAnalysis: true,
        });

        expect(response.status).toBe(200);
        expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
          '/test/file.ts',
          '/test/project',
          'class',
          expect.objectContaining({
            depth: 1, // crossFileAnalysis=true maps to depth=1
            mode: 'bidirectional',
          })
        );
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

      it('should return 400 for invalid depth value', async () => {
        const response = await request(app).post('/api/uml/generate').send({
          code: 'class Test {}',
          type: 'class',
          filePath: '/test/file.ts',
          depth: 4,
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('depth must be between 0');
      });
    });

    describe('Sequence diagram generation', () => {
      const mockSequenceUMLResult: UMLResult = {
        type: 'sequence',
        mermaidCode:
          'sequenceDiagram\n  participant main\n  participant helper\n  main->>helper: helper()',
        generationMode: 'native',
        metadata: {
          participants: [
            { name: 'main', type: 'function' },
            { name: 'helper', type: 'function' },
          ],
          interactions: [{ from: 'main', to: 'helper', message: 'helper()', type: 'sync' }],
          entryPoints: ['main'],
        },
      };

      it('should generate sequence diagram in native mode', async () => {
        const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockSequenceUMLResult);

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
              generateUnifiedDiagram: mockGenerateUnifiedDiagram,
            }) as any
        );

        const response = await request(app).post('/api/uml/generate').send({
          code: 'function helper() {} function main() { helper(); }',
          type: 'sequence',
          filePath: '/test/file.ts',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.mermaidCode).toContain('sequenceDiagram');
        expect(response.body.data.metadata.participants).toBeDefined();
        expect(response.body.data.metadata.interactions).toBeDefined();
        expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
          '/test/file.ts',
          '/test/project',
          'sequence',
          expect.objectContaining({
            depth: 0,
          })
        );
      });
    });
  });

  describe('GET /api/uml/supported-types', () => {
    it('should return supported UML types (native mode only)', async () => {
      const response = await request(app).get('/api/uml/supported-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.generationMode).toBe('native');
      expect(response.body.data.aiAvailable).toBe(false);
      expect(response.body.data.types).toHaveLength(3); // class, flowchart, sequence
      expect(response.body.data.types[0].id).toBe('class');
      expect(response.body.data.types[1].id).toBe('flowchart');
      expect(response.body.data.types[2].id).toBe('sequence');
      // All should have native mode only
      response.body.data.types.forEach((type: any) => {
        expect(type.modes).toEqual(['native']);
        expect(type.defaultMode).toBe('native');
      });
    });
  });
});
