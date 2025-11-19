/**
 * Tests for multi-language support using Python and Java fixtures
 * Tests actual parser functionality with real code samples
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { UMLAnalyzer } from '../analyzers/UMLAnalyzer.js';
import { ParserService } from '../parsers/ParserService.js';
import type { IFileProvider } from '@code-review-goose/analysis-types';
import {
  pythonAnimalCode,
  pythonDogCode,
  pythonUserCode,
  javaAnimalCode,
  javaDogCode,
  javaUserCode,
  javaIAnimalCode,
  javaCatCode,
} from './fixtures/multi-language.fixtures.js';

// Mock file provider for testing
class MockFileProvider implements IFileProvider {
  private files: Map<string, string> = new Map();

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (!content) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath);
  }

  async resolveImport(fromPath: string, importPath: string): Promise<string | null> {
    // Simple mock resolution
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const basePath = path.dirname(fromPath);
      return path.join(basePath, importPath.replace(/^\.\//, ''));
    }
    return null;
  }
}

describe('Multi-Language Fixtures Tests', () => {
  describe('Python Fixtures', () => {
    let fileProvider: MockFileProvider;
    let analyzer: UMLAnalyzer;

    beforeEach(() => {
      fileProvider = new MockFileProvider();
      analyzer = new UMLAnalyzer(fileProvider);
    });

    it('should parse Python Animal class from fixture', async () => {
      fileProvider.setFile('Animal.py', pythonAnimalCode);

      const result = await analyzer.generateUnifiedDiagram('Animal.py', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.mermaidCode).toContain('Animal');
      expect(result.metadata?.classes).toBeDefined();
      expect(result.metadata?.classes?.length).toBeGreaterThan(0);
      expect(result.metadata?.classes?.[0].name).toBe('Animal');
    });

    it('should parse Python Dog class with inheritance from fixture', async () => {
      fileProvider.setFile('Animal.py', pythonAnimalCode);
      fileProvider.setFile('Dog.py', pythonDogCode);

      const result = await analyzer.generateUnifiedDiagram('Dog.py', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.classes).toBeDefined();
      const dogClass = result.metadata?.classes?.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      if (dogClass) {
        expect(dogClass.name).toBe('Dog');
      }
    });

    it('should parse Python User class with type hints from fixture', async () => {
      fileProvider.setFile('User.py', pythonUserCode);

      const result = await analyzer.generateUnifiedDiagram('User.py', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.classes).toBeDefined();
      const userClass = result.metadata?.classes?.find((c) => c.name === 'User');
      expect(userClass).toBeDefined();
      if (userClass) {
        expect(userClass.methods).toBeDefined();
        const processDataMethod = userClass.methods.find((m) => m.name === 'process_data');
        expect(processDataMethod).toBeDefined();
      }
    });
  });

  describe('Java Fixtures', () => {
    let fileProvider: MockFileProvider;
    let analyzer: UMLAnalyzer;

    beforeEach(() => {
      fileProvider = new MockFileProvider();
      analyzer = new UMLAnalyzer(fileProvider);
    });

    it('should parse Java Animal class from fixture', async () => {
      fileProvider.setFile('Animal.java', javaAnimalCode);

      const result = await analyzer.generateUnifiedDiagram('Animal.java', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.mermaidCode).toContain('Animal');
      expect(result.metadata?.classes).toBeDefined();
      expect(result.metadata?.classes?.length).toBeGreaterThan(0);
      expect(result.metadata?.classes?.[0].name).toBe('Animal');
    });

    it('should parse Java Dog class with inheritance from fixture', async () => {
      fileProvider.setFile('Animal.java', javaAnimalCode);
      fileProvider.setFile('Dog.java', javaDogCode);

      const result = await analyzer.generateUnifiedDiagram('Dog.java', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.classes).toBeDefined();
      const dogClass = result.metadata?.classes?.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      if (dogClass) {
        expect(dogClass.name).toBe('Dog');
      }
    });

    it('should parse Java Cat class with inheritance and interface from fixture', async () => {
      fileProvider.setFile('Animal.java', javaAnimalCode);
      fileProvider.setFile('Cat.java', javaCatCode);

      const result = await analyzer.generateUnifiedDiagram('Cat.java', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.classes).toBeDefined();
      const catClass = result.metadata?.classes?.find((c) => c.name === 'Cat');
      expect(catClass).toBeDefined();
    });

    it('should parse Java IAnimal interface from fixture', async () => {
      fileProvider.setFile('IAnimal.java', javaIAnimalCode);

      const result = await analyzer.generateUnifiedDiagram('IAnimal.java', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.classes || result.metadata?.interfaces).toBeDefined();
    });

    it('should parse Java User class with generics from fixture', async () => {
      fileProvider.setFile('User.java', javaUserCode);

      const result = await analyzer.generateUnifiedDiagram('User.java', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.classes).toBeDefined();
      const userClass = result.metadata?.classes?.find((c) => c.name === 'User');
      expect(userClass).toBeDefined();
    });
  });

  describe('ParserService with Fixtures', () => {
    it('should parse Python code using ParserService', async () => {
      const parserService = new ParserService();
      const result = await parserService.parse(pythonAnimalCode, 'Animal.py');

      expect(result.language).toBe('python');
      expect(result.filePath).toBe('Animal.py');
      expect(result.classes.length).toBeGreaterThan(0);
      expect(result.classes[0].name).toBe('Animal');
    });

    it('should parse Java code using ParserService', async () => {
      const parserService = new ParserService();
      const result = await parserService.parse(javaAnimalCode, 'Animal.java');

      expect(result.language).toBe('java');
      expect(result.filePath).toBe('Animal.java');
      expect(result.classes.length).toBeGreaterThan(0);
      expect(result.classes[0].name).toBe('Animal');
    });
  });
});
