import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrossFileAnalyzer } from '../analyzers/CrossFileAnalyzer.js';
import type { IFileProvider } from '@code-review-goose/analysis-types';

describe('CrossFileAnalyzer', () => {
  let analyzer: CrossFileAnalyzer;
  let mockFileProvider: IFileProvider;

  beforeEach(() => {
    mockFileProvider = {
      readFile: vi.fn(),
      exists: vi.fn(),
      resolveImport: vi.fn(),
      getProjectRoot: vi.fn(),
    };

    analyzer = new CrossFileAnalyzer(mockFileProvider);
  });

  describe('analyzeForward', () => {
    it('should throw error for invalid depth', async () => {
      await expect(analyzer.analyzeForward('test.ts', 0 as any)).rejects.toThrow(
        'Depth must be between 1 and 3'
      );

      await expect(analyzer.analyzeForward('test.ts', 4 as any)).rejects.toThrow(
        'Depth must be between 1 and 3'
      );
    });

    it('should throw error if file does not exist', async () => {
      (mockFileProvider.exists as any).mockResolvedValue(false);

      await expect(analyzer.analyzeForward('nonexistent.ts', 1)).rejects.toThrow(
        'File not found: nonexistent.ts'
      );
    });

    it('should analyze single file with depth 1', async () => {
      const testCode = `
        import { Foo } from './foo';

        export class Bar {
          private foo: Foo;

          constructor() {
            this.foo = new Foo();
          }
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('bar.ts', 1);

      expect(result.size).toBeGreaterThan(0);
      expect(result.has('bar.ts')).toBe(true);

      const barAnalysis = result.get('bar.ts');
      expect(barAnalysis).toBeDefined();
      expect(barAnalysis?.filePath).toBe('bar.ts');
      expect(barAnalysis?.depth).toBe(0);
      expect(barAnalysis?.classes.length).toBeGreaterThan(0);
    });

    it('should analyze dependencies with depth 2', async () => {
      const barCode = `
        import { Foo } from './foo';

        export class Bar {
          foo: Foo;
        }
      `;

      const fooCode = `
        export class Foo {
          name: string;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any)
        .mockResolvedValueOnce(barCode)
        .mockResolvedValueOnce(fooCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue('foo.ts');

      const result = await analyzer.analyzeForward('bar.ts', 2);

      expect(result.size).toBe(2);
      expect(result.has('bar.ts')).toBe(true);
      expect(result.has('foo.ts')).toBe(true);

      const barAnalysis = result.get('bar.ts');
      const fooAnalysis = result.get('foo.ts');

      expect(barAnalysis?.depth).toBe(0);
      expect(fooAnalysis?.depth).toBe(1);
    });

    it('should handle circular dependencies', async () => {
      const aCode = `
        import { B } from './b';
        export class A {
          b: B;
        }
      `;

      const bCode = `
        import { A } from './a';
        export class B {
          a: A;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any)
        .mockResolvedValueOnce(aCode)
        .mockResolvedValueOnce(bCode);
      (mockFileProvider.resolveImport as any)
        .mockResolvedValueOnce('b.ts')
        .mockResolvedValueOnce('a.ts');

      const result = await analyzer.analyzeForward('a.ts', 3);

      // Should not get stuck in infinite loop
      expect(result.size).toBe(2);
      expect(result.has('a.ts')).toBe(true);
      expect(result.has('b.ts')).toBe(true);
    });

    it('should respect max depth limit', async () => {
      const level0Code = `
        import { Level1 } from './level1';
        export class Level0 {
          level1: Level1;
        }
      `;

      const level1Code = `
        import { Level2 } from './level2';
        export class Level1 {
          level2: Level2;
        }
      `;

      const level2Code = `
        import { Level3 } from './level3';
        export class Level2 {
          level3: Level3;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any)
        .mockResolvedValueOnce(level0Code)
        .mockResolvedValueOnce(level1Code)
        .mockResolvedValueOnce(level2Code);
      (mockFileProvider.resolveImport as any)
        .mockResolvedValueOnce('level1.ts')
        .mockResolvedValueOnce('level2.ts')
        .mockResolvedValueOnce('level3.ts');

      const result = await analyzer.analyzeForward('level0.ts', 2);

      // Should stop at depth 2 (level0 at depth 0, level1 at depth 1, level2 at depth 2)
      expect(result.size).toBe(3);
      expect(result.has('level0.ts')).toBe(true);
      expect(result.has('level1.ts')).toBe(true);
      expect(result.has('level2.ts')).toBe(true);
      expect(result.has('level3.ts')).toBe(false);
    });
  });

  describe('analyzeBidirectional', () => {
    it('should throw error for invalid depth', async () => {
      await expect(analyzer.analyzeBidirectional('test.ts', 0 as any)).rejects.toThrow(
        'Depth must be between 1 and 3'
      );
    });

    it('should throw error if file does not exist', async () => {
      (mockFileProvider.exists as any).mockResolvedValue(false);

      await expect(analyzer.analyzeBidirectional('nonexistent.ts', 1)).rejects.toThrow(
        'File not found: nonexistent.ts'
      );
    });

    it('should perform forward analysis and return bidirectional result', async () => {
      const testCode = `
        import { Foo } from './foo';

        export class Bar {
          foo: Foo;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeBidirectional('bar.ts', 1);

      expect(result.targetFile).toBe('bar.ts');
      expect(result.forwardDeps).toBeInstanceOf(Array);
      expect(result.reverseDeps).toBeInstanceOf(Array);
      expect(result.allClasses).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalFiles).toBeGreaterThan(0);
    });

    it('should calculate statistics correctly', async () => {
      const testCode = `
        export class Bar {
          name: string;
          value: number;

          process(): void {}
          calculate(): number { return 0; }
        }

        export class Baz extends Bar {
          extra: string;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeBidirectional('bar.ts', 1);

      expect(result.stats.totalFiles).toBe(1);
      expect(result.stats.totalClasses).toBeGreaterThan(0);
      expect(result.stats.maxDepth).toBe(0);
    });

    it('should deduplicate classes and relationships', async () => {
      const testCode = `
        export class Foo {
          name: string;
        }

        export class Bar {
          foo1: Foo;
          foo2: Foo;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeBidirectional('test.ts', 1);

      // Foo should only appear once in allClasses even though it's referenced twice
      const fooClasses = result.allClasses.filter((c) => c.name === 'Foo');
      expect(fooClasses.length).toBe(1);
    });
  });

  describe('getAnalyzedFiles', () => {
    it('should return empty array initially', () => {
      const files = analyzer.getAnalyzedFiles();
      expect(files).toEqual([]);
    });

    it('should return analyzed files after analysis', async () => {
      const testCode = `export class Foo {}`;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      await analyzer.analyzeForward('foo.ts', 1);

      const files = analyzer.getAnalyzedFiles();
      expect(files).toContain('foo.ts');
    });
  });

  describe('clearCache', () => {
    it('should clear cache and analyzed files', async () => {
      const testCode = `export class Foo {}`;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      await analyzer.analyzeForward('foo.ts', 1);
      expect(analyzer.getAnalyzedFiles().length).toBeGreaterThan(0);

      analyzer.clearCache();
      expect(analyzer.getAnalyzedFiles()).toEqual([]);
    });
  });

  describe('extractClassInfo', () => {
    it('should extract class with properties and methods', async () => {
      const testCode = `
        export class Person {
          private name: string;
          public age: number;

          constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
          }

          getName(): string {
            return this.name;
          }

          setAge(age: number): void {
            this.age = age;
          }
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('person.ts', 1);
      const personAnalysis = result.get('person.ts');

      expect(personAnalysis?.classes).toHaveLength(1);
      const personClass = personAnalysis?.classes[0];
      expect(personClass?.name).toBe('Person');
      expect(personClass?.properties.length).toBe(2);
      expect(personClass?.methods.length).toBeGreaterThan(0);
    });

    it('should extract interface information', async () => {
      const testCode = `
        export interface IUser {
          id: number;
          name: string;
          getEmail(): string;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('user.ts', 1);
      const userAnalysis = result.get('user.ts');

      expect(userAnalysis?.classes).toHaveLength(1);
      const userInterface = userAnalysis?.classes[0];
      expect(userInterface?.name).toBe('IUser');
      expect(userInterface?.type).toBe('interface');
      expect(userInterface?.properties.length).toBe(2);
      expect(userInterface?.methods.length).toBe(1);
    });

    it('should extract inheritance relationships', async () => {
      const testCode = `
        export class Animal {
          name: string;
        }

        export class Dog extends Animal {
          breed: string;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('animal.ts', 1);
      const analysis = result.get('animal.ts');

      const dogClass = analysis?.classes.find((c) => c.name === 'Dog');
      expect(dogClass?.extends).toBe('Animal');
    });

    it('should extract interface implementations', async () => {
      const testCode = `
        export interface IShape {
          area(): number;
        }

        export class Circle implements IShape {
          radius: number;

          area(): number {
            return Math.PI * this.radius * this.radius;
          }
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('shape.ts', 1);
      const analysis = result.get('shape.ts');

      const circleClass = analysis?.classes.find((c) => c.name === 'Circle');
      expect(circleClass?.implements).toContain('IShape');
    });
  });

  describe('extractImports and extractExports', () => {
    it('should extract imports', async () => {
      const testCode = `
        import { Foo } from './foo';
        import Bar from './bar';
        import * as Utils from './utils';

        export class MyClass {
          foo: Foo;
          bar: Bar;
        }
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('myclass.ts', 1);
      const analysis = result.get('myclass.ts');

      expect(analysis?.imports).toHaveLength(3);
      expect(analysis?.imports.some((i) => i.source === './foo')).toBe(true);
      expect(analysis?.imports.some((i) => i.source === './bar')).toBe(true);
      expect(analysis?.imports.some((i) => i.source === './utils')).toBe(true);
    });

    it('should extract exports', async () => {
      const testCode = `
        export class Foo {}
        export const bar = 1;
        export function baz() {}
      `;

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.readFile as any).mockResolvedValue(testCode);
      (mockFileProvider.resolveImport as any).mockResolvedValue(null);

      const result = await analyzer.analyzeForward('exports.ts', 1);
      const analysis = result.get('exports.ts');

      expect(analysis?.exports).toHaveLength(3);
      expect(analysis?.exports.some((e) => e.name === 'Foo')).toBe(true);
      expect(analysis?.exports.some((e) => e.name === 'bar')).toBe(true);
      expect(analysis?.exports.some((e) => e.name === 'baz')).toBe(true);
    });
  });
});
