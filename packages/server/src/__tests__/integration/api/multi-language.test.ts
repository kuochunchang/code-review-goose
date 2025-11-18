/**
 * Multi-language support integration tests
 * Tests UML generation for Python and Java using fixtures
 */

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { umlRouter } from '../../../routes/uml.js';
import { AIService } from '../../../services/aiService.js';
import { ConfigService } from '../../../services/configService.js';
import { UMLService } from '../../../services/umlService.js';
import {
  mockPythonAnimalContent,
  mockPythonDogContent,
  mockPythonUserContent,
  mockJavaAnimalContent,
  mockJavaDogContent,
  mockJavaUserContent,
  mockJavaIAnimalContent,
  mockJavaCatContent,
} from '../../fixtures/index.js';

// Mock services
vi.mock('../../../services/umlService.js');
vi.mock('../../../services/aiService.js');
vi.mock('../../../services/configService.js');

describe('Multi-Language UML API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/uml', umlRouter);
    vi.clearAllMocks();
  });

  describe('Python Support', () => {
    it('should generate class diagram for Python Animal class', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Animal',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'Animal',
              type: 'class' as const,
              properties: [],
              methods: [
                { name: '__init__', parameters: [], returnType: 'void', visibility: 'public' },
                { name: 'speak', parameters: [], returnType: 'str', visibility: 'public' },
                { name: 'get_name', parameters: [], returnType: 'str', visibility: 'public' },
              ],
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockPythonAnimalContent,
          type: 'class',
          filePath: '/test/Animal.py',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mermaidCode).toContain('Animal');
      expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
        '/test/Animal.py',
        '/test/project',
        'class',
        expect.objectContaining({
          depth: 0,
          mode: 'bidirectional',
        })
      );
    });

    it('should generate class diagram for Python Dog class with inheritance', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Animal\n  class Dog\n  Animal <|-- Dog',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'Animal',
              type: 'class' as const,
              properties: [],
              methods: [],
            },
            {
              name: 'Dog',
              type: 'class' as const,
              properties: [],
              methods: [],
              extends: 'Animal',
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockPythonDogContent,
          type: 'class',
          filePath: '/test/Dog.py',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.classes).toBeDefined();
      const dogClass = response.body.data.metadata.classes.find((c: any) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
    });

    it('should parse Python User class with type hints', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class User',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'User',
              type: 'class' as const,
              properties: [],
              methods: [
                {
                  name: 'process_data',
                  parameters: [
                    { name: 'items', type: 'List[str]' },
                    { name: 'config', type: 'Dict[str, int]' },
                  ],
                  returnType: 'Dict[str, int]',
                  visibility: 'public',
                },
              ],
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockPythonUserContent,
          type: 'class',
          filePath: '/test/User.py',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.classes).toBeDefined();
      const userClass = response.body.data.metadata.classes.find((c: any) => c.name === 'User');
      expect(userClass).toBeDefined();
    });
  });

  describe('Java Support', () => {
    it('should generate class diagram for Java Animal class', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Animal',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'Animal',
              type: 'class' as const,
              properties: [
                { name: 'name', type: 'String', visibility: 'private' },
                { name: 'age', type: 'int', visibility: 'private' },
              ],
              methods: [
                { name: 'speak', parameters: [], returnType: 'String', visibility: 'public' },
                { name: 'getName', parameters: [], returnType: 'String', visibility: 'public' },
              ],
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaAnimalContent,
          type: 'class',
          filePath: '/test/Animal.java',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mermaidCode).toContain('Animal');
      expect(response.body.data.metadata.classes).toBeDefined();
    });

    it('should generate class diagram for Java Dog class with inheritance', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Animal\n  class Dog\n  Animal <|-- Dog',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'Animal',
              type: 'class' as const,
              properties: [],
              methods: [],
            },
            {
              name: 'Dog',
              type: 'class' as const,
              properties: [{ name: 'breed', type: 'String', visibility: 'private' }],
              methods: [],
              extends: 'Animal',
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaDogContent,
          type: 'class',
          filePath: '/test/Dog.java',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.classes).toBeDefined();
      const dogClass = response.body.data.metadata.classes.find((c: any) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
    });

    it('should parse Java Cat class with inheritance and interface implementation', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Animal\n  class Cat\n  interface IAnimal\n  Animal <|-- Cat\n  IAnimal <|.. Cat',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'Cat',
              type: 'class' as const,
              properties: [],
              methods: [],
              extends: 'Animal',
              implements: ['IAnimal'],
            },
          ],
          interfaces: [
            {
              name: 'IAnimal',
              type: 'interface' as const,
              methods: [],
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaCatContent,
          type: 'class',
          filePath: '/test/Cat.java',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.classes).toBeDefined();
    });

    it('should parse Java User class with generics', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class User',
        generationMode: 'native' as const,
        metadata: {
          classes: [
            {
              name: 'User',
              type: 'class' as const,
              properties: [
                { name: 'name', type: 'String', visibility: 'private' },
                { name: 'age', type: 'int', visibility: 'private' },
                { name: 'tags', type: 'List<String>', visibility: 'private' },
              ],
              methods: [
                {
                  name: 'processData',
                  parameters: [{ name: 'items', type: 'List<String>' }],
                  returnType: 'Map<String, Integer>',
                  visibility: 'public',
                },
              ],
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaUserContent,
          type: 'class',
          filePath: '/test/User.java',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.classes).toBeDefined();
    });

    it('should parse Java interface', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class IAnimal',
        generationMode: 'native' as const,
        metadata: {
          interfaces: [
            {
              name: 'IAnimal',
              type: 'interface' as const,
              methods: [
                { name: 'getName', parameters: [], returnType: 'String', visibility: 'public' },
                { name: 'getAge', parameters: [], returnType: 'int', visibility: 'public' },
                { name: 'speak', parameters: [], returnType: 'String', visibility: 'public' },
              ],
            },
          ],
        },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaIAnimalContent,
          type: 'class',
          filePath: '/test/IAnimal.java',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.interfaces || response.body.data.metadata.classes).toBeDefined();
    });
  });

  describe('Language Detection', () => {
    it('should detect Python from .py extension', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Test',
        generationMode: 'native' as const,
        metadata: { classes: [] },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockPythonAnimalContent,
          type: 'class',
          filePath: '/test/Animal.py',
        });

      expect(response.status).toBe(200);
      expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
        '/test/Animal.py',
        '/test/project',
        'class',
        expect.any(Object)
      );
    });

    it('should detect Java from .java extension', async () => {
      const mockUMLResult = {
        type: 'class' as const,
        mermaidCode: 'classDiagram\n  class Test',
        generationMode: 'native' as const,
        metadata: { classes: [] },
      };

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

      const mockGenerateUnifiedDiagram = vi.fn().mockResolvedValue(mockUMLResult);

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaAnimalContent,
          type: 'class',
          filePath: '/test/Animal.java',
        });

      expect(response.status).toBe(200);
      expect(mockGenerateUnifiedDiagram).toHaveBeenCalledWith(
        '/test/Animal.java',
        '/test/project',
        'class',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error for unsupported diagram type in Python', async () => {
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

      const mockGenerateUnifiedDiagram = vi
        .fn()
        .mockRejectedValue(new Error('Sequence diagrams are currently only supported for TypeScript/JavaScript files'));

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockPythonAnimalContent,
          type: 'sequence',
          filePath: '/test/Animal.py',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should return error for unsupported diagram type in Java', async () => {
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

      const mockGenerateUnifiedDiagram = vi
        .fn()
        .mockRejectedValue(new Error('Flowchart diagrams are currently only supported for TypeScript/JavaScript files'));

      vi.mocked(UMLService).mockImplementation(
        () =>
          ({
            generateUnifiedDiagram: mockGenerateUnifiedDiagram,
          }) as any
      );

      const response = await request(app)
        .post('/api/uml/generate')
        .send({
          code: mockJavaAnimalContent,
          type: 'flowchart',
          filePath: '/test/Animal.java',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
