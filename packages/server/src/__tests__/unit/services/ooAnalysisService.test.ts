import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { OOAnalysisService } from '../../../services/ooAnalysisService.js';
import type { ClassInfo } from '../../../services/umlService.js';
import type { ImportInfo } from '../../../types/ast.js';

describe('OOAnalysisService', () => {
  const service = new OOAnalysisService();

  describe('extractImports', () => {
    it('should extract ES6 import statements', () => {
      const code = `
        import React from 'react';
        import { useState, useEffect } from 'react';
        import * as Utils from './utils';
        import type { User } from './types';
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const imports = service.extractImports(ast);

      expect(imports).toHaveLength(4);

      // Default import
      expect(imports[0]).toMatchObject({
        source: 'react',
        specifiers: ['React'],
        isDefault: true,
        isNamespace: false,
        isDynamic: false,
      });

      // Named imports
      expect(imports[1]).toMatchObject({
        source: 'react',
        specifiers: ['useState', 'useEffect'],
        isDefault: false,
        isNamespace: false,
        isDynamic: false,
      });

      // Namespace import
      expect(imports[2]).toMatchObject({
        source: './utils',
        isNamespace: true,
        namespaceAlias: 'Utils',
        isDynamic: false,
      });

      // Type-only import
      expect(imports[3]).toMatchObject({
        source: './types',
        specifiers: ['User'],
        isTypeOnly: true,
        isDynamic: false,
      });
    });

    it('should extract dynamic imports', () => {
      const code = `
        const module = import('./module');
        const legacy = require('./legacy');
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const imports = service.extractImports(ast);

      expect(imports).toHaveLength(2);

      // Dynamic import()
      expect(imports[0]).toMatchObject({
        source: './module',
        isDynamic: true,
      });

      // require()
      expect(imports[1]).toMatchObject({
        source: './legacy',
        isDynamic: true,
      });
    });
  });

  describe('extractExports', () => {
    it('should extract default export', () => {
      const code = `
        export default class MyClass {}
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const exports = service.extractExports(ast);

      expect(exports).toHaveLength(1);
      expect(exports[0]).toMatchObject({
        name: 'MyClass',
        isDefault: true,
        isReExport: false,
        exportType: 'class',
      });
    });

    it('should extract named exports', () => {
      const code = `
        export const API_KEY = 'secret';
        export let counter = 0;
        export class User {}
        export function login() {}
        export interface IUser {}
        export type Role = 'admin' | 'user';
        export enum Status { Active, Inactive }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const exports = service.extractExports(ast);

      expect(exports).toHaveLength(7);
      expect(exports[0]).toMatchObject({
        name: 'API_KEY',
        exportType: 'const',
      });
      expect(exports[1]).toMatchObject({
        name: 'counter',
        exportType: 'variable',
      });
      expect(exports[2]).toMatchObject({
        name: 'User',
        exportType: 'class',
      });
      expect(exports[3]).toMatchObject({
        name: 'login',
        exportType: 'function',
      });
      expect(exports[4]).toMatchObject({
        name: 'IUser',
        exportType: 'interface',
      });
      expect(exports[5]).toMatchObject({
        name: 'Role',
        exportType: 'type',
      });
      expect(exports[6]).toMatchObject({
        name: 'Status',
        exportType: 'enum',
      });
    });

    it('should extract re-exports', () => {
      const code = `
        export { User } from './user';
        export * from './utils';
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const exports = service.extractExports(ast);

      expect(exports).toHaveLength(2);
      expect(exports[0]).toMatchObject({
        name: 'User',
        isReExport: true,
        source: './user',
      });
      expect(exports[1]).toMatchObject({
        name: '*',
        isReExport: true,
        source: './utils',
      });
    });
  });

  describe('extractComposition', () => {
    it('should extract composition relationships (private class properties)', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Car',
          type: 'class',
          properties: [
            {
              name: 'engine',
              type: 'Engine',
              visibility: 'private',
              isClassType: true,
              isArray: false,
            },
          ],
          methods: [],
        },
      ];

      const imports: ImportInfo[] = [];
      const compositions = service.extractComposition(classes, imports);

      expect(compositions).toHaveLength(1);
      expect(compositions[0]).toMatchObject({
        from: 'Car',
        to: 'Engine',
        type: 'composition',
        cardinality: '1',
      });
    });

    it('should handle array compositions', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Garage',
          type: 'class',
          properties: [
            {
              name: 'vehicles',
              type: 'Vehicle[]',
              visibility: 'private',
              isClassType: true,
              isArray: true,
            },
          ],
          methods: [],
        },
      ];

      const imports: ImportInfo[] = [];
      const compositions = service.extractComposition(classes, imports);

      expect(compositions).toHaveLength(1);
      expect(compositions[0]).toMatchObject({
        from: 'Garage',
        to: 'Vehicle',
        type: 'composition',
        cardinality: '1..*',
      });
    });

    it('should not extract public properties as composition', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Car',
          type: 'class',
          properties: [
            {
              name: 'engine',
              type: 'Engine',
              visibility: 'public',
              isClassType: true,
            },
          ],
          methods: [],
        },
      ];

      const imports: ImportInfo[] = [];
      const compositions = service.extractComposition(classes, imports);

      expect(compositions).toHaveLength(0);
    });
  });

  describe('extractAggregation', () => {
    it('should extract aggregation relationships (public/protected arrays)', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Team',
          type: 'class',
          properties: [
            {
              name: 'members',
              type: 'Person[]',
              visibility: 'public',
              isClassType: true,
              isArray: true,
            },
          ],
          methods: [],
        },
      ];

      const imports: ImportInfo[] = [];
      const aggregations = service.extractAggregation(classes, imports);

      expect(aggregations).toHaveLength(1);
      expect(aggregations[0]).toMatchObject({
        from: 'Team',
        to: 'Person',
        type: 'aggregation',
        cardinality: '*',
      });
    });

    it('should not extract non-array public properties as aggregation', () => {
      const classes: ClassInfo[] = [
        {
          name: 'User',
          type: 'class',
          properties: [
            {
              name: 'profile',
              type: 'Profile',
              visibility: 'public',
              isClassType: true,
              isArray: false,
            },
          ],
          methods: [],
        },
      ];

      const imports: ImportInfo[] = [];
      const aggregations = service.extractAggregation(classes, imports);

      expect(aggregations).toHaveLength(0);
    });
  });

  describe('extractDependency', () => {
    it('should extract dependency from method parameters', () => {
      const classes: ClassInfo[] = [
        {
          name: 'UserService',
          type: 'class',
          properties: [],
          methods: [
            {
              name: 'processUser',
              parameters: [
                {
                  name: 'data',
                  type: 'UserData',
                },
              ],
              returnType: 'void',
              visibility: 'public',
              lineNumber: 10,
            },
          ],
        },
      ];

      const imports: ImportInfo[] = [];
      const dependencies = service.extractDependency(classes, imports);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0]).toMatchObject({
        from: 'UserService',
        to: 'UserData',
        type: 'dependency',
        context: 'processUser(data)',
      });
    });

    it('should extract dependency from method return type', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Factory',
          type: 'class',
          properties: [],
          methods: [
            {
              name: 'create',
              parameters: [],
              returnType: 'Product',
              visibility: 'public',
              lineNumber: 5,
            },
          ],
        },
      ];

      const imports: ImportInfo[] = [];
      const dependencies = service.extractDependency(classes, imports);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0]).toMatchObject({
        from: 'Factory',
        to: 'Product',
        type: 'dependency',
        context: 'create() returns Product',
      });
    });

    it('should not extract primitive types as dependencies', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Calculator',
          type: 'class',
          properties: [],
          methods: [
            {
              name: 'add',
              parameters: [
                { name: 'a', type: 'number' },
                { name: 'b', type: 'number' },
              ],
              returnType: 'number',
              visibility: 'public',
            },
          ],
        },
      ];

      const imports: ImportInfo[] = [];
      const dependencies = service.extractDependency(classes, imports);

      expect(dependencies).toHaveLength(0);
    });
  });

  describe('extractAssociation', () => {
    it('should extract association from public non-array class properties', () => {
      const classes: ClassInfo[] = [
        {
          name: 'User',
          type: 'class',
          properties: [
            {
              name: 'profile',
              type: 'Profile',
              visibility: 'public',
              isClassType: true,
              isArray: false,
            },
          ],
          methods: [],
        },
      ];

      const imports: ImportInfo[] = [];
      const associations = service.extractAssociation(classes, imports);

      expect(associations).toHaveLength(1);
      expect(associations[0]).toMatchObject({
        from: 'User',
        to: 'Profile',
        type: 'association',
        cardinality: '1',
      });
    });
  });

  describe('extractDependencyInjection', () => {
    it('should extract dependency injection from constructor parameters', () => {
      const classes: ClassInfo[] = [
        {
          name: 'UserController',
          type: 'class',
          properties: [],
          methods: [],
          constructorParams: [
            {
              name: 'userService',
              type: 'UserService',
            },
            {
              name: 'logger',
              type: 'Logger',
            },
          ],
          lineNumber: 1,
        },
      ];

      const imports: ImportInfo[] = [];
      const injections = service.extractDependencyInjection(classes, imports);

      expect(injections).toHaveLength(2);
      expect(injections[0]).toMatchObject({
        from: 'UserController',
        to: 'UserService',
        type: 'injection',
        context: 'constructor(userService)',
      });
      expect(injections[1]).toMatchObject({
        from: 'UserController',
        to: 'Logger',
        type: 'injection',
        context: 'constructor(logger)',
      });
    });

    it('should not extract primitive types as injections', () => {
      const classes: ClassInfo[] = [
        {
          name: 'Config',
          type: 'class',
          properties: [],
          methods: [],
          constructorParams: [
            {
              name: 'port',
              type: 'number',
            },
          ],
        },
      ];

      const imports: ImportInfo[] = [];
      const injections = service.extractDependencyInjection(classes, imports);

      expect(injections).toHaveLength(0);
    });
  });

  describe('analyze', () => {
    it('should analyze all OO relationships in a complex class structure', () => {
      const classes: ClassInfo[] = [
        {
          name: 'UserController',
          type: 'class',
          properties: [
            {
              name: 'cache',
              type: 'Cache',
              visibility: 'private',
              isClassType: true,
              isArray: false,
            },
          ],
          methods: [
            {
              name: 'getUser',
              parameters: [{ name: 'id', type: 'UserId' }],
              returnType: 'User',
              visibility: 'public',
            },
          ],
          constructorParams: [{ name: 'userService', type: 'UserService' }],
          lineNumber: 1,
        },
      ];

      const imports: ImportInfo[] = [
        {
          source: './services',
          specifiers: ['UserService'],
          isDefault: false,
          isNamespace: false,
          isDynamic: false,
          lineNumber: 1,
        },
      ];

      const result = service.analyze(classes, imports);

      // Should have composition (private Cache)
      expect(result.compositions).toHaveLength(1);
      expect(result.compositions[0].to).toBe('Cache');

      // Should have dependency injection (UserService in constructor)
      expect(result.injections).toHaveLength(1);
      expect(result.injections[0].to).toBe('UserService');

      // Should have dependencies (method parameter and return type)
      expect(result.dependencies.length).toBeGreaterThan(0);

      // Total relationships
      expect(result.relationships.length).toBeGreaterThan(0);
    });
  });

  describe('resolveTypeInfo', () => {
    it('should resolve primitive types', () => {
      const imports: ImportInfo[] = [];

      const resolved = service.resolveTypeInfo('string', imports);

      expect(resolved).toBeDefined();
      expect(resolved?.isPrimitive).toBe(true);
      expect(resolved?.isClassType).toBe(false);
    });

    it('should resolve class types', () => {
      const imports: ImportInfo[] = [];

      const resolved = service.resolveTypeInfo('User', imports);

      expect(resolved).toBeDefined();
      expect(resolved?.isPrimitive).toBe(false);
      expect(resolved?.isClassType).toBe(true);
      expect(resolved?.typeName).toBe('User');
    });

    it('should resolve array types', () => {
      const imports: ImportInfo[] = [];

      const resolved = service.resolveTypeInfo('User[]', imports);

      expect(resolved).toBeDefined();
      expect(resolved?.isArray).toBe(true);
      expect(resolved?.typeName).toBe('User');
    });

    it('should resolve generic types', () => {
      const imports: ImportInfo[] = [];

      const resolved = service.resolveTypeInfo('Array<User>', imports);

      expect(resolved).toBeDefined();
      expect(resolved?.isArray).toBe(true);
      expect(resolved?.typeName).toBe('Array');
      expect(resolved?.genericArgs).toContain('User');
    });

    it('should identify external types from imports', () => {
      const imports: ImportInfo[] = [
        {
          source: './models',
          specifiers: ['User'],
          isDefault: false,
          isNamespace: false,
          isDynamic: false,
          lineNumber: 1,
        },
      ];

      const resolved = service.resolveTypeInfo('User', imports);

      expect(resolved).toBeDefined();
      expect(resolved?.isExternal).toBe(true);
      expect(resolved?.sourceModule).toBe('./models');
    });
  });
});
