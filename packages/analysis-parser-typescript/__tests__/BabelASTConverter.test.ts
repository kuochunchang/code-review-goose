/**
 * Tests for BabelASTConverter
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { BabelASTConverter } from '../src/BabelASTConverter.js';

describe('BabelASTConverter', () => {
  const converter = new BabelASTConverter();

  describe('convert', () => {
    it('should convert simple class to UnifiedAST', () => {
      const code = `
        class User {
          name: string;
          age: number;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'User.ts');

      expect(unifiedAST.language).toBe('typescript');
      expect(unifiedAST.filePath).toBe('User.ts');
      expect(unifiedAST.classes).toHaveLength(1);
      expect(unifiedAST.classes[0].name).toBe('User');
      expect(unifiedAST.classes[0].type).toBe('class');
      expect(unifiedAST.dependencies).toEqual([]);
    });

    it('should extract class properties', () => {
      const code = `
        class User {
          private name: string;
          public age: number;
          protected email: string;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'User.ts');

      expect(unifiedAST.classes[0].properties).toHaveLength(3);
      expect(unifiedAST.classes[0].properties[0].name).toBe('name');
      expect(unifiedAST.classes[0].properties[0].visibility).toBe('private');
      expect(unifiedAST.classes[0].properties[1].visibility).toBe('public');
      expect(unifiedAST.classes[0].properties[2].visibility).toBe('protected');
    });

    it('should extract class methods', () => {
      const code = `
        class User {
          getName(): string {
            return this.name;
          }

          setAge(age: number): void {
            this.age = age;
          }
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'User.ts');

      expect(unifiedAST.classes[0].methods).toHaveLength(2);
      expect(unifiedAST.classes[0].methods[0].name).toBe('getName');
      expect(unifiedAST.classes[0].methods[0].returnType).toBe('string');
      expect(unifiedAST.classes[0].methods[1].name).toBe('setAge');
      expect(unifiedAST.classes[0].methods[1].parameters).toHaveLength(1);
    });

    it('should extract constructor parameters', () => {
      const code = `
        class User {
          constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
          }
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'User.ts');

      expect(unifiedAST.classes[0].constructorParams).toBeDefined();
      expect(unifiedAST.classes[0].constructorParams).toHaveLength(2);
      expect(unifiedAST.classes[0].constructorParams![0].name).toBe('name');
      expect(unifiedAST.classes[0].constructorParams![0].type).toBe('string');
    });

    it('should extract inheritance relationship', () => {
      const code = `
        class Animal {
          name: string;
        }

        class Dog extends Animal {
          breed: string;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'Animal.ts');

      const dogClass = unifiedAST.classes.find((c) => c.name === 'Dog');
      expect(dogClass?.extends).toBe('Animal');
    });

    it('should extract implements relationship', () => {
      const code = `
        interface IAnimal {
          name: string;
        }

        class Dog implements IAnimal {
          name: string;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'Dog.ts');

      const dogClass = unifiedAST.classes.find((c) => c.name === 'Dog');
      expect(dogClass?.implements).toContain('IAnimal');
    });

    it('should extract interfaces', () => {
      const code = `
        interface IUser {
          name: string;
          age: number;
          getName(): string;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'IUser.ts');

      expect(unifiedAST.interfaces).toHaveLength(1);
      expect(unifiedAST.interfaces[0].name).toBe('IUser');
      expect(unifiedAST.interfaces[0].type).toBe('interface');
      expect(unifiedAST.interfaces[0].properties).toHaveLength(2);
      expect(unifiedAST.interfaces[0].methods).toHaveLength(1);
    });

    it('should extract interface inheritance', () => {
      const code = `
        interface IAnimal {
          name: string;
        }

        interface IDog extends IAnimal {
          breed: string;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'IDog.ts');

      const dogInterface = unifiedAST.interfaces.find((i) => i.name === 'IDog');
      expect(dogInterface?.extends).toContain('IAnimal');
    });

    it('should extract functions', () => {
      const code = `
        function add(a: number, b: number): number {
          return a + b;
        }

        async function fetchData(): Promise<string> {
          return 'data';
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'utils.ts');

      expect(unifiedAST.functions).toHaveLength(2);
      expect(unifiedAST.functions[0].name).toBe('add');
      expect(unifiedAST.functions[0].parameters).toHaveLength(2);
      expect(unifiedAST.functions[0].returnType).toBe('number');
    });

    it('should extract imports', () => {
      const code = `
        import { Component } from 'react';
        import type { Props } from './types';
        import * as utils from './utils';
        import defaultExport from './default';
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'App.tsx');

      expect(unifiedAST.imports).toHaveLength(4);
      expect(unifiedAST.imports[0].source).toBe('react');
      expect(unifiedAST.imports[0].specifiers).toContain('Component');
      expect(unifiedAST.imports[1].isTypeOnly).toBe(true);
      expect(unifiedAST.imports[2].isNamespace).toBe(true);
      expect(unifiedAST.imports[2].namespaceAlias).toBe('utils');
      expect(unifiedAST.imports[3].isDefault).toBe(true);
    });

    it('should extract exports', () => {
      const code = `
        export class User {}
        export interface IUser {}
        export function createUser() {}
        export default class Admin {}
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'User.ts');

      expect(unifiedAST.exports.length).toBeGreaterThanOrEqual(3);
      const classExport = unifiedAST.exports.find(
        (e) => e.name === 'User' && e.exportType === 'class'
      );
      expect(classExport).toBeDefined();
      expect(classExport?.isDefault).toBe(false);

      const defaultExport = unifiedAST.exports.find((e) => e.isDefault);
      expect(defaultExport).toBeDefined();
    });

    it('should handle complex types', () => {
      const code = `
        class Container<T> {
          value: T;
          getValue(): T {
            return this.value;
          }
        }

        class User {
          items: Array<string>;
          metadata: Record<string, number>;
          union: string | number;
          intersection: A & B;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'Container.ts');

      expect(unifiedAST.classes).toHaveLength(2);
      const userClass = unifiedAST.classes.find((c) => c.name === 'User');
      expect(userClass).toBeDefined();
    });

    it('should preserve line numbers', () => {
      const code = `
        class User {
          name: string;
          age: number;
        }
      `;

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'User.ts');

      expect(unifiedAST.classes[0].lineNumber).toBeDefined();
      expect(unifiedAST.classes[0].lineNumber).toBeGreaterThan(0);
    });

    it('should detect language from file path', () => {
      const code = 'class User {}';

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const tsAST = converter.convert(ast, 'User.ts');
      expect(tsAST.language).toBe('typescript');

      const jsAST = converter.convert(ast, 'User.js');
      expect(jsAST.language).toBe('javascript');
    });

    it('should handle empty file', () => {
      const code = '';

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript'],
      });

      const unifiedAST = converter.convert(ast, 'Empty.ts');

      expect(unifiedAST.classes).toHaveLength(0);
      expect(unifiedAST.interfaces).toHaveLength(0);
      expect(unifiedAST.functions).toHaveLength(0);
      expect(unifiedAST.imports).toHaveLength(0);
      expect(unifiedAST.exports).toHaveLength(0);
    });
  });
});
