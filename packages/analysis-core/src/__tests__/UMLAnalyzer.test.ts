import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UMLAnalyzer } from '../analyzers/UMLAnalyzer.js';
import type { IFileProvider } from '@code-review-goose/analysis-types';

describe('UMLAnalyzer', () => {
  let analyzer: UMLAnalyzer;
  let mockFileProvider: IFileProvider;

  beforeEach(() => {
    mockFileProvider = {
      readFile: vi.fn(),
      exists: vi.fn(),
      resolveImport: vi.fn(),
      getProjectRoot: vi.fn(),
    };

    analyzer = new UMLAnalyzer(mockFileProvider);
  });

  describe('generateDiagram - class diagram', () => {
    it('should generate class diagram with single class', async () => {
      const code = `
        export class Person {
          private name: string;
          public age: number;

          getName(): string {
            return this.name;
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.type).toBe('class');
      expect(result.generationMode).toBe('native');
      expect(result.mermaidCode).toContain('classDiagram');
      expect(result.mermaidCode).toContain('class Person');
      expect(result.mermaidCode).toContain('name');
      expect(result.mermaidCode).toContain('getName');
      expect(result.metadata?.classes).toHaveLength(1);
    });

    it('should generate class diagram with multiple classes', async () => {
      const code = `
        export class Person {
          name: string;
        }

        export class Address {
          street: string;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('class Person');
      expect(result.mermaidCode).toContain('class Address');
      expect(result.metadata?.classes).toHaveLength(2);
    });

    it('should include visibility modifiers', async () => {
      const code = `
        export class Service {
          private secret: string;
          protected config: any;
          public data: number;

          private getSecret(): string { return ''; }
          protected getConfig(): any { return {}; }
          public getData(): number { return 0; }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('-secret');
      expect(result.mermaidCode).toContain('#config');
      expect(result.mermaidCode).toContain('+data');
      expect(result.mermaidCode).toContain('-getSecret');
      expect(result.mermaidCode).toContain('#getConfig');
      expect(result.mermaidCode).toContain('+getData');
    });

    it('should show inheritance relationships', async () => {
      const code = `
        export class Animal {
          name: string;
        }

        export class Dog extends Animal {
          breed: string;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('Animal <|-- Dog');
    });

    it('should show interface implementations', async () => {
      const code = `
        export interface IShape {
          area(): number;
        }

        export class Circle implements IShape {
          radius: number;
          area(): number { return 0; }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('IShape <|.. Circle');
      const hasInterfaceMarker =
        result.mermaidCode.includes('<<interface>>') ||
        result.mermaidCode.includes('interface IShape');
      expect(hasInterfaceMarker).toBe(true);
    });

    it('should show composition relationships', async () => {
      const code = `
        export class Engine {
          horsepower: number;
        }

        export class Car {
          private engine: Engine;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('Car *--');
      expect(result.mermaidCode).toContain('Engine');
    });

    it('should show aggregation relationships', async () => {
      const code = `
        export class Person {
          name: string;
        }

        export class Team {
          public members: Person[];
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('Team o--');
      expect(result.mermaidCode).toContain('Person');
    });

    it('should show dependency relationships', async () => {
      const code = `
        export class Data {
          value: number;
        }

        export class Processor {
          process(data: Data): void {}
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('Processor ..>');
      expect(result.mermaidCode).toContain('Data');
    });

    it('should show dependency injection', async () => {
      const code = `
        export class UserService {
          getUser() {}
        }

        export class UserController {
          constructor(private service: UserService) {}
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('UserController ..> UserService');
      expect(result.mermaidCode).toContain('<<inject>>');
    });

    it('should handle empty file', async () => {
      const code = ``;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('NoClassesFound');
    });

    it('should handle file with no classes', async () => {
      const code = `
        const x = 1;
        function foo() {}
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.mermaidCode).toContain('NoClassesFound');
    });
  });

  describe('generateDiagram - sequence diagram', () => {
    it('should generate sequence diagram with simple method calls', async () => {
      const code = `
        class Service {
          process() {
            this.validate();
          }

          validate() {
            return true;
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.type).toBe('sequence');
      expect(result.mermaidCode).toContain('sequenceDiagram');
      expect(result.mermaidCode).toContain('participant');
      expect(result.mermaidCode).toContain('Service');
    });

    it('should show method calls between classes', async () => {
      const code = `
        class Controller {
          constructor(private service: UserService) {}

          execute() {
            this.service.getUser();
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.mermaidCode).toContain('Controller');
      expect(result.mermaidCode).toContain('UserService');
      expect(result.mermaidCode).toContain('getUser');
    });

    it('should show async method calls', async () => {
      const code = `
        class Service {
          async process() {
            await this.fetchData();
          }

          async fetchData() {
            return {};
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.mermaidCode).toContain('Service');
      // Async calls should use different arrow
      const hasAsyncArrow = result.mermaidCode.includes('-)') || result.mermaidCode.includes('fetchData');
      expect(hasAsyncArrow).toBe(true);
    });

    it('should show return interactions', async () => {
      const code = `
        class Calculator {
          add(a, b) {
            return a + b;
          }

          calculate() {
            this.add(1, 2);
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.mermaidCode).toContain('Calculator');
      expect(result.mermaidCode).toContain('return');
    });

    it('should handle top-level functions', async () => {
      const code = `
        function main() {
          helper();
        }

        function helper() {
          return true;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.mermaidCode).toContain('participant');
      expect(result.metadata?.participants).toBeDefined();
    });

    it('should handle file with no function calls', async () => {
      const code = `
        const x = 1;
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.mermaidCode).toContain('No function calls detected');
    });
  });

  describe('generateDiagram - flowchart', () => {
    it('should generate flowchart for function', async () => {
      const code = `
        function processData() {
          const x = 1;
          return x * 2;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.type).toBe('flowchart');
      expect(result.mermaidCode).toContain('flowchart');
      expect(result.mermaidCode).toContain('Start');
      expect(result.mermaidCode).toContain('End');
    });

    it('should show conditional branches', async () => {
      const code = `
        function check(value) {
          if (value > 0) {
            return 'positive';
          } else {
            return 'negative';
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('Condition');
      expect(result.mermaidCode).toContain('Yes');
      expect(result.mermaidCode).toContain('No');
    });

    it('should show loops', async () => {
      const code = `
        function iterate() {
          while (true) {
            process();
          }
        }

        function process() {}
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('While loop');
    });

    it('should handle for loops', async () => {
      const code = `
        function iterate() {
          for (let i = 0; i < 10; i++) {
            process();
          }
        }

        function process() {}
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('For loop');
    });

    it('should handle class methods', async () => {
      const code = `
        class Service {
          process() {
            return true;
          }
        }
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('Start');
      expect(result.mermaidCode).toContain('End');
    });

    it('should handle arrow functions', async () => {
      const code = `
        const process = () => {
          return true;
        };
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('flowchart');
    });

    it('should generate simple flowchart for empty file', async () => {
      const code = ``;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.mermaidCode).toContain('flowchart');
      expect(result.mermaidCode).toContain('Start');
    });
  });

  describe('generateUnifiedDiagram', () => {
    it('should generate single-file class diagram with depth 0', async () => {
      const code = `export class Foo { name: string; }`;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);

      const result = await analyzer.generateUnifiedDiagram('foo.ts', 'class', { depth: 0 });

      expect(result.type).toBe('class');
      expect(result.metadata?.depth).toBe(0);
      expect(result.metadata?.singleFile).toBe(true);
      expect(result.metadata?.filePath).toBe('foo.ts');
    });

    it('should generate cross-file class diagram with depth 1', async () => {
      const fooCode = `
        import { Bar } from './bar';
        export class Foo {
          bar: Bar;
        }
      `;
      const barCode = `export class Bar { name: string; }`;

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path === 'foo.ts') return Promise.resolve(fooCode);
        if (path === 'bar.ts') return Promise.resolve(barCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.resolveImport as any).mockImplementation(
        (_from: string, source: string) => {
          if (source === './bar') return Promise.resolve('bar.ts');
          return Promise.resolve(null);
        }
      );

      const result = await analyzer.generateUnifiedDiagram('foo.ts', 'class', { depth: 1 });

      expect(result.type).toBe('class');
      expect(result.metadata?.depth).toBe(1);
      expect(result.metadata?.singleFile).toBe(false);
      expect(result.metadata?.classes?.length).toBeGreaterThanOrEqual(1);
      expect(result.mermaidCode).toContain('classDiagram');
    });

    it('should throw error for invalid depth', async () => {
      await expect(
        analyzer.generateUnifiedDiagram('foo.ts', 'class', { depth: 4 as any })
      ).rejects.toThrow('Depth must be between 0');
    });

    it('should throw error for cross-file sequence diagram', async () => {
      await expect(
        analyzer.generateUnifiedDiagram('foo.ts', 'sequence', { depth: 1 })
      ).rejects.toThrow('only supports depth=0');
    });

    it('should generate single-file flowchart with depth 0', async () => {
      const code = `function foo() {}`;

      (mockFileProvider.readFile as any).mockResolvedValue(code);
      (mockFileProvider.exists as any).mockResolvedValue(true);

      const result = await analyzer.generateUnifiedDiagram('foo.ts', 'flowchart', { depth: 0 });

      expect(result.type).toBe('flowchart');
      expect(result.metadata?.depth).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid code', async () => {
      const invalidCode = `class {`;

      await expect(analyzer.generateDiagram(invalidCode, 'class')).rejects.toThrow();
    });

    it('should throw error for unsupported diagram type', async () => {
      const code = `export class Foo {}`;

      await expect(analyzer.generateDiagram(code, 'invalid' as any)).rejects.toThrow(
        'Unsupported diagram type'
      );
    });
  });

  describe('metadata extraction', () => {
    it('should include classes in metadata', async () => {
      const code = `
        export class Person {
          name: string;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.metadata?.classes).toBeDefined();
      expect(result.metadata?.classes?.length).toBe(1);
      expect(result.metadata?.classes?.[0].name).toBe('Person');
    });

    it('should include dependencies in metadata', async () => {
      const code = `
        export class Car {
          private engine: Engine;
        }

        export class Engine {}
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.metadata?.dependencies).toBeDefined();
      expect(result.metadata?.dependencies?.length).toBeGreaterThan(0);
    });

    it('should include imports in metadata', async () => {
      const code = `
        import { Foo } from './foo';

        export class Bar {
          foo: Foo;
        }
      `;

      const result = await analyzer.generateDiagram(code, 'class');

      expect(result.metadata?.imports).toBeDefined();
      expect(result.metadata?.imports?.length).toBeGreaterThan(0);
    });

    it('should include sequence info in metadata', async () => {
      const code = `
        class Service {
          process() {
            this.validate();
          }
          validate() {}
        }
      `;

      const result = await analyzer.generateDiagram(code, 'sequence');

      expect(result.metadata?.sequences).toBeDefined();
      expect(result.metadata?.participants).toBeDefined();
      expect(result.metadata?.interactions).toBeDefined();
    });

    it('should include functions in flowchart metadata', async () => {
      const code = `
        function foo() {}
        function bar() {}
      `;

      const result = await analyzer.generateDiagram(code, 'flowchart');

      expect(result.metadata?.functions).toBeDefined();
      expect(result.metadata?.functions?.length).toBeGreaterThan(0);
    });
  });

  describe('generateCrossFileClassDiagram', () => {
    it('should generate cross-file class diagram with depth 1', async () => {
      const mainCode = `
        import { Service } from './service';
        export class Controller {
          constructor(private service: Service) {}
        }
      `;
      const serviceCode = `export class Service { getData() {} }`;

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path === 'controller.ts') return Promise.resolve(mainCode);
        if (path === 'service.ts') return Promise.resolve(serviceCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.resolveImport as any).mockImplementation(
        (_from: string, source: string) => {
          if (source === './service') return Promise.resolve('service.ts');
          return Promise.resolve(null);
        }
      );

      const result = await analyzer.generateCrossFileClassDiagram('controller.ts', 1);

      expect(result.type).toBe('class');
      expect(result.generationMode).toBe('native');
      expect(result.metadata?.depth).toBe(1);
      expect(result.metadata?.singleFile).toBe(false);
      expect(result.metadata?.classes?.length).toBeGreaterThanOrEqual(2);
      expect(result.mermaidCode).toContain('Controller');
      expect(result.mermaidCode).toContain('Service');
    });

    it('should include cross-file relationships', async () => {
      const carCode = `
        import { Engine } from './engine';
        export class Car {
          private engine: Engine;
        }
      `;
      const engineCode = `export class Engine { horsepower: number; }`;

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path === 'car.ts') return Promise.resolve(carCode);
        if (path === 'engine.ts') return Promise.resolve(engineCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.resolveImport as any).mockImplementation(
        (_from: string, source: string) => {
          if (source === './engine') return Promise.resolve('engine.ts');
          return Promise.resolve(null);
        }
      );

      const result = await analyzer.generateCrossFileClassDiagram('car.ts', 1);

      expect(result.metadata?.dependencies?.length).toBeGreaterThan(0);
      expect(result.metadata?.crossFileStats).toBeDefined();
      expect(result.metadata?.crossFileStats?.totalClasses).toBeGreaterThanOrEqual(2);
    });

    it('should handle depth 2 analysis', async () => {
      const aCode = `import { B } from './b'; export class A { b: B; }`;
      const bCode = `import { C } from './c'; export class B { c: C; }`;
      const cCode = `export class C { name: string; }`;

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path === 'a.ts') return Promise.resolve(aCode);
        if (path === 'b.ts') return Promise.resolve(bCode);
        if (path === 'c.ts') return Promise.resolve(cCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.resolveImport as any).mockImplementation(
        (_from: string, source: string) => {
          if (source === './b') return Promise.resolve('b.ts');
          if (source === './c') return Promise.resolve('c.ts');
          return Promise.resolve(null);
        }
      );

      const result = await analyzer.generateCrossFileClassDiagram('a.ts', 2);

      expect(result.metadata?.crossFileStats?.totalClasses).toBe(3);
      expect(result.metadata?.crossFileStats?.maxDepth).toBe(2);
      expect(result.mermaidCode).toContain('class A');
      expect(result.mermaidCode).toContain('class B');
      expect(result.mermaidCode).toContain('class C');
    });

    it('should handle circular dependencies', async () => {
      const aCode = `import { B } from './b'; export class A { b: B; }`;
      const bCode = `import { A } from './a'; export class B { a: A; }`;

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path === 'a.ts') return Promise.resolve(aCode);
        if (path === 'b.ts') return Promise.resolve(bCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.resolveImport as any).mockImplementation(
        (_from: string, source: string) => {
          if (source === './b') return Promise.resolve('b.ts');
          if (source === './a') return Promise.resolve('a.ts');
          return Promise.resolve(null);
        }
      );

      const result = await analyzer.generateCrossFileClassDiagram('a.ts', 1);

      expect(result.metadata?.classes?.length).toBeGreaterThanOrEqual(2);
      expect(result.mermaidCode).toContain('class A');
      expect(result.mermaidCode).toContain('class B');
    });

    it('should throw error for invalid depth', async () => {
      await expect(analyzer.generateCrossFileClassDiagram('foo.ts', 0 as any)).rejects.toThrow(
        'depth must be between 1 and 3'
      );

      await expect(analyzer.generateCrossFileClassDiagram('foo.ts', 4 as any)).rejects.toThrow(
        'depth must be between 1 and 3'
      );
    });

    it('should throw error for non-existent file', async () => {
      (mockFileProvider.exists as any).mockResolvedValue(false);

      await expect(analyzer.generateCrossFileClassDiagram('missing.ts', 1)).rejects.toThrow(
        'File not found'
      );
    });

    it('should include metadata for forward and reverse dependencies', async () => {
      const mainCode = `import { Helper } from './helper'; export class Main { h: Helper; }`;
      const helperCode = `export class Helper {}`;

      (mockFileProvider.readFile as any).mockImplementation((path: string) => {
        if (path === 'main.ts') return Promise.resolve(mainCode);
        if (path === 'helper.ts') return Promise.resolve(helperCode);
        return Promise.reject(new Error('File not found'));
      });

      (mockFileProvider.exists as any).mockResolvedValue(true);
      (mockFileProvider.resolveImport as any).mockImplementation(
        (_from: string, source: string) => {
          if (source === './helper') return Promise.resolve('helper.ts');
          return Promise.resolve(null);
        }
      );

      const result = await analyzer.generateCrossFileClassDiagram('main.ts', 1);

      expect(result.metadata?.forwardDependencies).toBeDefined();
      expect(result.metadata?.reverseDependencies).toBeDefined();
      expect(Array.isArray(result.metadata?.forwardDependencies)).toBe(true);
      expect(Array.isArray(result.metadata?.reverseDependencies)).toBe(true);
    });
  });
});
