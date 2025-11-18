/**
 * Tests for TypeScriptParser
 */

import { describe, it, expect } from 'vitest';
import { TypeScriptParser } from '../src/TypeScriptParser.js';

describe('TypeScriptParser', () => {
  const parser = new TypeScriptParser();

  describe('getSupportedLanguage', () => {
    it('should return typescript', () => {
      expect(parser.getSupportedLanguage()).toBe('typescript');
    });
  });

  describe('canParse', () => {
    it('should return true for .ts files', () => {
      expect(parser.canParse('App.ts')).toBe(true);
      expect(parser.canParse('/src/components/Button.ts')).toBe(true);
    });

    it('should return true for .tsx files', () => {
      expect(parser.canParse('App.tsx')).toBe(true);
      expect(parser.canParse('/src/components/Button.tsx')).toBe(true);
    });

    it('should return true for .mts files', () => {
      expect(parser.canParse('module.mts')).toBe(true);
    });

    it('should return true for .cts files', () => {
      expect(parser.canParse('config.cts')).toBe(true);
    });

    it('should return false for non-TypeScript files', () => {
      expect(parser.canParse('App.js')).toBe(false);
      expect(parser.canParse('App.jsx')).toBe(false);
      expect(parser.canParse('Main.java')).toBe(false);
      expect(parser.canParse('main.py')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse a simple TypeScript class', async () => {
      const code = `
        class User {
          private name: string;
          public age: number;

          constructor(name: string, age: number) {
            this.name = name;
            this.age = age;
          }

          getName(): string {
            return this.name;
          }
        }
      `;

      const ast = await parser.parse(code, 'User.ts');

      expect(ast.language).toBe('typescript');
      expect(ast.filePath).toBe('User.ts');
      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('User');
      expect(ast.classes[0].type).toBe('class');
      expect(ast.classes[0].properties).toHaveLength(2);
      expect(ast.classes[0].methods).toHaveLength(2);
    });

    it('should parse TypeScript interface', async () => {
      const code = `
        interface IUser {
          name: string;
          age: number;
          getName(): string;
        }
      `;

      const ast = await parser.parse(code, 'IUser.ts');

      expect(ast.interfaces).toHaveLength(1);
      expect(ast.interfaces[0].name).toBe('IUser');
      expect(ast.interfaces[0].type).toBe('interface');
      expect(ast.interfaces[0].properties).toHaveLength(2);
      expect(ast.interfaces[0].methods).toHaveLength(1);
    });

    it('should parse class with inheritance', async () => {
      const code = `
        class Animal {
          name: string;
        }

        class Dog extends Animal {
          breed: string;
        }
      `;

      const ast = await parser.parse(code, 'Animal.ts');

      expect(ast.classes).toHaveLength(2);
      const dogClass = ast.classes.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      expect(dogClass?.extends).toBe('Animal');
    });

    it('should parse class implementing interface', async () => {
      const code = `
        interface IAnimal {
          name: string;
        }

        class Dog implements IAnimal {
          name: string;
        }
      `;

      const ast = await parser.parse(code, 'Dog.ts');

      const dogClass = ast.classes.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      expect(dogClass?.implements).toContain('IAnimal');
    });

    it('should parse imports', async () => {
      const code = `
        import { Component } from 'react';
        import type { Props } from './types';
        import * as utils from './utils';
      `;

      const ast = await parser.parse(code, 'App.tsx');

      expect(ast.imports).toHaveLength(3);
      expect(ast.imports[0].source).toBe('react');
      expect(ast.imports[0].specifiers).toContain('Component');
      expect(ast.imports[1].isTypeOnly).toBe(true);
      expect(ast.imports[2].isNamespace).toBe(true);
    });

    it('should parse exports', async () => {
      const code = `
        export class User {}
        export interface IUser {}
        export function createUser() {}
        export default class Admin {}
      `;

      const ast = await parser.parse(code, 'User.ts');

      expect(ast.exports.length).toBeGreaterThanOrEqual(3);
      const classExport = ast.exports.find((e) => e.name === 'User' && e.exportType === 'class');
      expect(classExport).toBeDefined();
      expect(classExport?.isDefault).toBe(false);
    });

    it('should parse functions', async () => {
      const code = `
        function add(a: number, b: number): number {
          return a + b;
        }

        async function fetchData(): Promise<string> {
          return 'data';
        }
      `;

      const ast = await parser.parse(code, 'utils.ts');

      expect(ast.functions).toHaveLength(2);
      expect(ast.functions[0].name).toBe('add');
      expect(ast.functions[0].parameters).toHaveLength(2);
      expect(ast.functions[0].returnType).toBe('number');
    });

    it('should handle TypeScript generics', async () => {
      const code = `
        class Container<T> {
          value: T;
          getValue(): T {
            return this.value;
          }
        }
      `;

      const ast = await parser.parse(code, 'Container.ts');

      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('Container');
    });

    it('should handle decorators', async () => {
      const code = `
        @Component()
        class MyComponent {
          @Prop() name: string;
        }
      `;

      const ast = await parser.parse(code, 'MyComponent.ts');

      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('MyComponent');
    });

    it('should throw error for invalid TypeScript code', async () => {
      const invalidCode = 'class { invalid syntax }';

      await expect(parser.parse(invalidCode, 'Invalid.ts')).rejects.toThrow();
    });

    it('should preserve line numbers', async () => {
      const code = `
        class User {
          name: string;
          age: number;
        }
      `;

      const ast = await parser.parse(code, 'User.ts');

      expect(ast.classes[0].lineNumber).toBeDefined();
      expect(ast.classes[0].lineNumber).toBeGreaterThan(0);
    });

    it('should handle JSX in TSX files', async () => {
      const code = `
        import React from 'react';

        interface Props {
          name: string;
        }

        const Component: React.FC<Props> = ({ name }) => {
          return <div>{name}</div>;
        };
      `;

      const ast = await parser.parse(code, 'Component.tsx');

      expect(ast.language).toBe('typescript');
      expect(ast.imports.length).toBeGreaterThan(0);
    });
  });
});
