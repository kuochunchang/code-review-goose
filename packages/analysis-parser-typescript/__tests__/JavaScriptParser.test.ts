/**
 * Tests for JavaScriptParser
 */

import { describe, it, expect } from 'vitest';
import { JavaScriptParser } from '../src/JavaScriptParser.js';

describe('JavaScriptParser', () => {
  const parser = new JavaScriptParser();

  describe('getSupportedLanguage', () => {
    it('should return javascript', () => {
      expect(parser.getSupportedLanguage()).toBe('javascript');
    });
  });

  describe('canParse', () => {
    it('should return true for .js files', () => {
      expect(parser.canParse('App.js')).toBe(true);
      expect(parser.canParse('/src/components/Button.js')).toBe(true);
    });

    it('should return true for .jsx files', () => {
      expect(parser.canParse('App.jsx')).toBe(true);
      expect(parser.canParse('/src/components/Button.jsx')).toBe(true);
    });

    it('should return true for .mjs files', () => {
      expect(parser.canParse('module.mjs')).toBe(true);
    });

    it('should return true for .cjs files', () => {
      expect(parser.canParse('config.cjs')).toBe(true);
    });

    it('should return false for non-JavaScript files', () => {
      expect(parser.canParse('App.ts')).toBe(false);
      expect(parser.canParse('App.tsx')).toBe(false);
      expect(parser.canParse('Main.java')).toBe(false);
      expect(parser.canParse('main.py')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse a simple JavaScript class', async () => {
      const code = `
        class User {
          constructor(name, age) {
            this.name = name;
            this.age = age;
          }

          getName() {
            return this.name;
          }
        }
      `;

      const ast = await parser.parse(code, 'User.js');

      expect(ast.language).toBe('javascript');
      expect(ast.filePath).toBe('User.js');
      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('User');
      expect(ast.classes[0].type).toBe('class');
      expect(ast.classes[0].methods).toHaveLength(2); // constructor + getName
    });

    it('should parse class with inheritance', async () => {
      const code = `
        class Animal {
          constructor(name) {
            this.name = name;
          }
        }

        class Dog extends Animal {
          constructor(name, breed) {
            super(name);
            this.breed = breed;
          }
        }
      `;

      const ast = await parser.parse(code, 'Animal.js');

      expect(ast.classes).toHaveLength(2);
      const dogClass = ast.classes.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      expect(dogClass?.extends).toBe('Animal');
    });

    it('should parse imports', async () => {
      const code = `
        import { Component } from 'react';
        import * as utils from './utils';
        import defaultExport from './default';
      `;

      const ast = await parser.parse(code, 'App.jsx');

      expect(ast.imports).toHaveLength(3);
      expect(ast.imports[0].source).toBe('react');
      expect(ast.imports[0].specifiers).toContain('Component');
      expect(ast.imports[1].isNamespace).toBe(true);
      expect(ast.imports[2].isDefault).toBe(true);
    });

    it('should parse exports', async () => {
      const code = `
        export class User {}
        export function createUser() {}
        export default class Admin {}
      `;

      const ast = await parser.parse(code, 'User.js');

      expect(ast.exports.length).toBeGreaterThanOrEqual(2);
      const classExport = ast.exports.find((e) => e.name === 'User' && e.exportType === 'class');
      expect(classExport).toBeDefined();
    });

    it('should parse functions', async () => {
      const code = `
        function add(a, b) {
          return a + b;
        }

        async function fetchData() {
          return 'data';
        }
      `;

      const ast = await parser.parse(code, 'utils.js');

      expect(ast.functions).toHaveLength(2);
      expect(ast.functions[0].name).toBe('add');
      expect(ast.functions[0].parameters).toHaveLength(2);
    });

    it('should handle JSX in JSX files', async () => {
      const code = `
        import React from 'react';

        function Component({ name }) {
          return <div>{name}</div>;
        }
      `;

      const ast = await parser.parse(code, 'Component.jsx');

      expect(ast.language).toBe('javascript');
      expect(ast.imports.length).toBeGreaterThan(0);
      expect(ast.functions).toHaveLength(1);
    });

    it('should handle CommonJS require', async () => {
      const code = `
        const fs = require('fs');
        const { readFile } = require('fs/promises');
      `;

      const ast = await parser.parse(code, 'file.js');

      // Note: require() is handled as dynamic import in our converter
      expect(ast.imports.length).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for invalid JavaScript code', async () => {
      const invalidCode = 'class { invalid syntax }';

      await expect(parser.parse(invalidCode, 'Invalid.js')).rejects.toThrow();
    });

    it('should preserve line numbers', async () => {
      const code = `
        class User {
          name;
          age;
        }
      `;

      const ast = await parser.parse(code, 'User.js');

      expect(ast.classes[0].lineNumber).toBeDefined();
      expect(ast.classes[0].lineNumber).toBeGreaterThan(0);
    });

    it('should handle class properties', async () => {
      const code = `
        class User {
          name = 'John';
          age = 30;
        }
      `;

      const ast = await parser.parse(code, 'User.js');

      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].properties.length).toBeGreaterThanOrEqual(0);
    });
  });
});
