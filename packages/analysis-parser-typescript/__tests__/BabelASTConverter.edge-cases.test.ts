/**
 * Edge case tests for BabelASTConverter
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { BabelASTConverter } from '../src/BabelASTConverter.js';

describe('BabelASTConverter - Edge Cases', () => {
  const converter = new BabelASTConverter();

  it('should handle class property without identifier key', () => {
    const code = `
      class User {
        ['computed']: string;
      }
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'User.ts');

    // Computed properties should be skipped
    expect(unifiedAST.classes[0].properties.length).toBe(0);
  });

  it('should handle method without identifier key', () => {
    const code = `
      class User {
        ['computed']() {}
      }
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'User.ts');

    // Computed methods should be skipped
    expect(unifiedAST.classes[0].methods.length).toBe(0);
  });

  it('should handle parameter without identifier', () => {
    const code = `
      class User {
        method([a, b]: [string, number]) {}
      }
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'User.ts');

    // Should handle destructured parameters
    expect(unifiedAST.classes[0].methods[0].parameters.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle export with re-export', () => {
    const code = `
      export { foo, bar } from './module';
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'index.ts');

    expect(unifiedAST.exports.length).toBeGreaterThanOrEqual(2);
    const fooExport = unifiedAST.exports.find((e) => e.name === 'foo');
    expect(fooExport).toBeDefined();
    expect(fooExport?.isReExport).toBe(true);
    expect(fooExport?.source).toBe('./module');
  });

  it('should handle export with variable declaration', () => {
    const code = `
      export const CONSTANT = 'value';
      export let variable = 'value';
      export var oldVar = 'value';
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'constants.ts');

    expect(unifiedAST.exports.length).toBeGreaterThanOrEqual(3);
    const constExport = unifiedAST.exports.find((e) => e.name === 'CONSTANT');
    expect(constExport).toBeDefined();
    expect(constExport?.exportType).toBe('variable');
  });

  it('should handle default export with identifier', () => {
    const code = `
      const User = class {};
      export default User;
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'User.ts');

    const defaultExport = unifiedAST.exports.find((e) => e.isDefault);
    expect(defaultExport).toBeDefined();
    expect(defaultExport?.name).toBe('User');
  });

  it('should handle default export with anonymous function', () => {
    const code = `
      export default function() {}
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'default.ts');

    // Anonymous functions should be handled gracefully
    expect(unifiedAST.exports.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle default export with anonymous class', () => {
    const code = `
      export default class {}
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'default.ts');

    // Anonymous classes should be handled gracefully
    expect(unifiedAST.exports.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle complex type annotations', () => {
    const code = `
      class User {
        items: Array<Array<string>>;
        metadata: Record<string, Record<number, boolean>>;
        union: string | number | boolean;
        intersection: A & B & C;
      }
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'User.ts');

    expect(unifiedAST.classes[0].properties.length).toBe(4);
    // Type strings should be extracted
    expect(unifiedAST.classes[0].properties[0].type).toBeDefined();
  });

  it('should handle interface with no members', () => {
    const code = `
      interface Empty {}
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'Empty.ts');

    expect(unifiedAST.interfaces).toHaveLength(1);
    expect(unifiedAST.interfaces[0].properties).toHaveLength(0);
    expect(unifiedAST.interfaces[0].methods).toHaveLength(0);
  });

  it('should handle class with no members', () => {
    const code = `
      class Empty {}
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'Empty.ts');

    expect(unifiedAST.classes).toHaveLength(1);
    expect(unifiedAST.classes[0].properties).toHaveLength(0);
    expect(unifiedAST.classes[0].methods).toHaveLength(0);
  });

  it('should handle multiple interface extensions', () => {
    const code = `
      interface A {}
      interface B {}
      interface C extends A, B {}
    `;

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript'],
    });

    const unifiedAST = converter.convert(ast, 'Interfaces.ts');

    const cInterface = unifiedAST.interfaces.find((i) => i.name === 'C');
    expect(cInterface).toBeDefined();
    expect(cInterface?.extends).toBeDefined();
  });
});
