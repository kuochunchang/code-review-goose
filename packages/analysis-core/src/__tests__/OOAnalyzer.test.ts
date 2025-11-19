import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '@babel/parser';
import { OOAnalyzer } from '../analyzers/OOAnalyzer.js';
import type { ImportInfo, ClassInfo } from '@code-review-goose/analysis-types';

describe('OOAnalyzer', () => {
  let analyzer: OOAnalyzer;

  beforeEach(() => {
    analyzer = new OOAnalyzer();
  });

  describe('extractImports', () => {
    it('should extract named imports', () => {
      const code = `import { Foo, Bar } from 'module';`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const imports = analyzer.extractImports(ast);

      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('module');
      expect(imports[0].specifiers).toEqual(['Foo', 'Bar']);
      expect(imports[0].isDefault).toBe(false);
      expect(imports[0].isNamespace).toBe(false);
    });

    it('should extract default imports', () => {
      const code = `import Foo from 'module';`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const imports = analyzer.extractImports(ast);

      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('module');
      expect(imports[0].specifiers).toContain('Foo');
      expect(imports[0].isDefault).toBe(true);
    });

    it('should extract namespace imports', () => {
      const code = `import * as Utils from 'module';`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const imports = analyzer.extractImports(ast);

      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('module');
      expect(imports[0].isNamespace).toBe(true);
      expect(imports[0].namespaceAlias).toBe('Utils');
    });

    it('should extract type-only imports', () => {
      const code = `import type { Foo } from 'module';`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const imports = analyzer.extractImports(ast);

      expect(imports).toHaveLength(1);
      expect(imports[0].isTypeOnly).toBe(true);
    });

    it('should extract dynamic imports', () => {
      const code = `const mod = import('module');`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const imports = analyzer.extractImports(ast);

      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('module');
      expect(imports[0].isDynamic).toBe(true);
    });

    it('should extract require() calls', () => {
      const code = `const mod = require('module');`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const imports = analyzer.extractImports(ast);

      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('module');
      expect(imports[0].isDynamic).toBe(true);
    });
  });

  describe('extractExports', () => {
    it('should extract named exports', () => {
      const code = `export const foo = 1; export let bar = 2;`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(2);
      expect(exports[0].name).toBe('foo');
      expect(exports[0].exportType).toBe('const');
      expect(exports[1].name).toBe('bar');
      expect(exports[1].exportType).toBe('variable');
    });

    it('should extract default export class', () => {
      const code = `export default class Foo {}`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('Foo');
      expect(exports[0].isDefault).toBe(true);
      expect(exports[0].exportType).toBe('class');
    });

    it('should extract default export function', () => {
      const code = `export default function foo() {}`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('foo');
      expect(exports[0].isDefault).toBe(true);
      expect(exports[0].exportType).toBe('function');
    });

    it('should extract exported class', () => {
      const code = `export class Foo {}`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('Foo');
      expect(exports[0].exportType).toBe('class');
    });

    it('should extract exported interface', () => {
      const code = `export interface Foo {}`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('Foo');
      expect(exports[0].exportType).toBe('interface');
    });

    it('should extract exported type', () => {
      const code = `export type Foo = string;`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('Foo');
      expect(exports[0].exportType).toBe('type');
    });

    it('should extract exported enum', () => {
      const code = `export enum Color { Red, Blue }`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('Color');
      expect(exports[0].exportType).toBe('enum');
    });

    it('should extract re-exports', () => {
      const code = `export { foo } from 'module';`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('foo');
      expect(exports[0].isReExport).toBe(true);
      expect(exports[0].source).toBe('module');
    });

    it('should extract wildcard re-exports', () => {
      const code = `export * from 'module';`;
      const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
      const exports = analyzer.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0].name).toBe('*');
      expect(exports[0].isReExport).toBe(true);
      expect(exports[0].source).toBe('module');
    });
  });

  describe('resolveTypeInfo', () => {
    it('should identify primitive types', () => {
      const imports: ImportInfo[] = [];
      const result = analyzer.resolveTypeInfo('string', imports);

      expect(result).toBeDefined();
      expect(result?.typeName).toBe('string');
      expect(result?.isPrimitive).toBe(true);
    });

    it('should identify built-in types', () => {
      const imports: ImportInfo[] = [];
      const result = analyzer.resolveTypeInfo('Array', imports);

      expect(result?.typeName).toBe('Array');
      expect(result?.isPrimitive).toBe(false);
      expect(result?.isClassType).toBe(false);
    });

    it('should identify array types', () => {
      const imports: ImportInfo[] = [];
      const result = analyzer.resolveTypeInfo('string[]', imports);

      expect(result?.isArray).toBe(true);
    });

    it('should identify class types', () => {
      const imports: ImportInfo[] = [];
      const result = analyzer.resolveTypeInfo('Person', imports);

      expect(result?.typeName).toBe('Person');
      expect(result?.isClassType).toBe(true);
    });

    it('should identify imported types', () => {
      const imports: ImportInfo[] = [
        {
          source: 'models',
          specifiers: ['Person'],
          isDefault: false,
          isNamespace: false,
          isDynamic: false,
          lineNumber: 1,
        },
      ];
      const result = analyzer.resolveTypeInfo('Person', imports);

      expect(result?.isExternal).toBe(true);
      expect(result?.sourceModule).toBe('models');
    });

    it('should parse generic types', () => {
      const imports: ImportInfo[] = [];
      const result = analyzer.resolveTypeInfo('Array<Person>', imports);

      expect(result?.typeName).toBe('Array');
      expect(result?.genericArgs).toEqual(['Person']);
    });
  });

  describe('extractComposition', () => {
    it('should extract composition relationships', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Car',
          type: 'class',
          properties: [
            {
              name: 'engine',
              type: 'Engine',
              visibility: 'private',
            },
          ],
          methods: [],
        },
      ];
      const imports: ImportInfo[] = [];

      const compositions = analyzer.extractComposition(classes, imports);

      expect(compositions).toHaveLength(1);
      expect(compositions[0].from).toBe('Car');
      expect(compositions[0].to).toBe('Engine');
      expect(compositions[0].type).toBe('composition');
      expect(compositions[0].cardinality).toBe('1');
    });

    it('should handle array composition', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Car',
          type: 'class',
          properties: [
            {
              name: 'wheels',
              type: 'Wheel[]',
              visibility: 'private',
            },
          ],
          methods: [],
        },
      ];
      const imports: ImportInfo[] = [];

      const compositions = analyzer.extractComposition(classes, imports);

      expect(compositions).toHaveLength(1);
      expect(compositions[0].cardinality).toBe('1..*');
    });
  });

  describe('extractAggregation', () => {
    it('should extract aggregation relationships', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Team',
          type: 'class',
          properties: [
            {
              name: 'members',
              type: 'Person[]',
              visibility: 'public',
            },
          ],
          methods: [],
        },
      ];
      const imports: ImportInfo[] = [];

      const aggregations = analyzer.extractAggregation(classes, imports);

      expect(aggregations).toHaveLength(1);
      expect(aggregations[0].from).toBe('Team');
      expect(aggregations[0].to).toBe('Person');
      expect(aggregations[0].type).toBe('aggregation');
      expect(aggregations[0].cardinality).toBe('*');
    });

    it('should not extract aggregation for private properties', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Team',
          type: 'class',
          properties: [
            {
              name: 'members',
              type: 'Person[]',
              visibility: 'private',
            },
          ],
          methods: [],
        },
      ];
      const imports: ImportInfo[] = [];

      const aggregations = analyzer.extractAggregation(classes, imports);

      expect(aggregations).toHaveLength(0);
    });
  });

  describe('extractDependency', () => {
    it('should extract dependency from method parameters', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Service',
          type: 'class',
          properties: [],
          methods: [
            {
              name: 'process',
              parameters: [
                {
                  name: 'data',
                  type: 'DataModel',
                },
              ],
              visibility: 'public',
            },
          ],
        },
      ];
      const imports: ImportInfo[] = [];

      const dependencies = analyzer.extractDependency(classes, imports);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].from).toBe('Service');
      expect(dependencies[0].to).toBe('DataModel');
      expect(dependencies[0].type).toBe('dependency');
    });

    it('should extract dependency from return type', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Service',
          type: 'class',
          properties: [],
          methods: [
            {
              name: 'getData',
              parameters: [],
              returnType: 'DataModel',
              visibility: 'public',
            },
          ],
        },
      ];
      const imports: ImportInfo[] = [];

      const dependencies = analyzer.extractDependency(classes, imports);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].to).toBe('DataModel');
    });
  });

  describe('extractAssociation', () => {
    it('should extract association relationships', () => {
      const classes: ClassInfo[] = [
        {
          name: 'User',
          type: 'class',
          properties: [
            {
              name: 'profile',
              type: 'Profile',
              visibility: 'public',
            },
          ],
          methods: [],
        },
      ];
      const imports: ImportInfo[] = [];

      const associations = analyzer.extractAssociation(classes, imports);

      expect(associations).toHaveLength(1);
      expect(associations[0].from).toBe('User');
      expect(associations[0].to).toBe('Profile');
      expect(associations[0].type).toBe('association');
    });
  });

  describe('extractDependencyInjection', () => {
    it('should extract dependency injection from constructor', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Controller',
          type: 'class',
          properties: [],
          methods: [],
          constructorParams: [
            {
              name: 'service',
              type: 'UserService',
            },
          ],
        },
      ];
      const imports: ImportInfo[] = [];

      const injections = analyzer.extractDependencyInjection(classes, imports);

      expect(injections).toHaveLength(1);
      expect(injections[0].from).toBe('Controller');
      expect(injections[0].to).toBe('UserService');
      expect(injections[0].type).toBe('injection');
    });
  });

  describe('analyze', () => {
    it('should perform complete OO analysis', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Car',
          type: 'class',
          extends: 'Vehicle',
          properties: [
            {
              name: 'engine',
              type: 'Engine',
              visibility: 'private',
            },
          ],
          methods: [
            {
              name: 'drive',
              parameters: [
                {
                  name: 'route',
                  type: 'Route',
                },
              ],
              visibility: 'public',
            },
          ],
        },
      ];
      const imports: ImportInfo[] = [];

      const result = analyzer.analyze(classes, imports);

      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.compositions.length).toBeGreaterThan(0);
      expect(result.dependencies.length).toBeGreaterThan(0);
      expect(result.inheritanceTree).toBeInstanceOf(Map);
    });

    it('should build inheritance tree', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Car',
          type: 'class',
          extends: 'Vehicle',
          properties: [],
          methods: [],
        },
        {
          name: 'Truck',
          type: 'class',
          extends: 'Vehicle',
          properties: [],
          methods: [],
        },
      ];
      const imports: ImportInfo[] = [];

      const result = analyzer.analyze(classes, imports);

      expect(result.inheritanceTree.has('Vehicle')).toBe(true);
      expect(result.inheritanceTree.get('Vehicle')).toEqual(['Car', 'Truck']);
    });
  });
});
