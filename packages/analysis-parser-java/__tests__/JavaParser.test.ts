/**
 * Tests for JavaParser
 */

import { describe, it, expect } from 'vitest';
import { JavaParser } from '../src/JavaParser.js';

describe('JavaParser', () => {
  const parser = new JavaParser();

  describe('getSupportedLanguage', () => {
    it('should return java', () => {
      expect(parser.getSupportedLanguage()).toBe('java');
    });
  });

  describe('canParse', () => {
    it('should return true for .java files', () => {
      expect(parser.canParse('User.java')).toBe(true);
      expect(parser.canParse('/src/com/example/User.java')).toBe(true);
    });

    it('should return false for non-Java files', () => {
      expect(parser.canParse('User.ts')).toBe(false);
      expect(parser.canParse('User.py')).toBe(false);
      expect(parser.canParse('User.js')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse a simple Java class', async () => {
      const code = `
        public class User {
          private String name;
          public int age;

          public User(String name, int age) {
            this.name = name;
            this.age = age;
          }

          public String getName() {
            return name;
          }
        }
      `;

      const ast = await parser.parse(code, 'User.java');

      expect(ast.language).toBe('java');
      expect(ast.filePath).toBe('User.java');
      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('User');
      expect(ast.classes[0].type).toBe('class');
      expect(ast.classes[0].properties.length).toBeGreaterThanOrEqual(2);
      expect(ast.classes[0].methods.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse class with inheritance', async () => {
      const code = `
        class Animal {
          String name;
        }

        class Dog extends Animal {
          String breed;
        }
      `;

      const ast = await parser.parse(code, 'Animal.java');

      expect(ast.classes).toHaveLength(2);
      const dogClass = ast.classes.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      expect(dogClass?.extends).toBe('Animal');
    });

    it('should parse class implementing interface', async () => {
      const code = `
        interface IAnimal {
          String getName();
        }

        class Dog implements IAnimal {
          private String name;

          public String getName() {
            return name;
          }
        }
      `;

      const ast = await parser.parse(code, 'Dog.java');

      const dogClass = ast.classes.find((c) => c.name === 'Dog');
      expect(dogClass).toBeDefined();
      expect(dogClass?.implements).toContain('IAnimal');
    });

    it('should parse interface', async () => {
      const code = `
        interface IUser {
          String getName();
          int getAge();
        }
      `;

      const ast = await parser.parse(code, 'IUser.java');

      expect(ast.interfaces).toHaveLength(1);
      expect(ast.interfaces[0].name).toBe('IUser');
      expect(ast.interfaces[0].type).toBe('interface');
      expect(ast.interfaces[0].methods.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse imports', async () => {
      const code = `
        import java.util.List;
        import java.util.Map;
        import java.util.*;
      `;

      const ast = await parser.parse(code, 'Imports.java');

      expect(ast.imports.length).toBeGreaterThanOrEqual(3);
      expect(ast.imports[0].source).toContain('java.util.List');
      expect(ast.imports[2].isNamespace).toBe(true);
    });

    it('should parse package declaration', async () => {
      const code = `
        package com.example;

        public class User {
        }
      `;

      const ast = await parser.parse(code, 'User.java');

      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('User');
    });

    it('should extract constructor parameters', async () => {
      const code = `
        public class User {
          public User(String name, int age) {
          }
        }
      `;

      const ast = await parser.parse(code, 'User.java');

      expect(ast.classes[0].constructorParams).toBeDefined();
      expect(ast.classes[0].constructorParams?.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle visibility modifiers', async () => {
      const code = `
        public class User {
          private String name;
          protected int age;
          public String email;
        }
      `;

      const ast = await parser.parse(code, 'User.java');

      const properties = ast.classes[0].properties;
      expect(properties.length).toBeGreaterThanOrEqual(3);
      
      const nameProp = properties.find((p) => p.name === 'name');
      expect(nameProp?.visibility).toBe('private');
      
      const ageProp = properties.find((p) => p.name === 'age');
      expect(ageProp?.visibility).toBe('protected');
      
      const emailProp = properties.find((p) => p.name === 'email');
      expect(emailProp?.visibility).toBe('public');
    });

    it('should parse enum', async () => {
      const code = `
        public enum Status {
          ACTIVE,
          INACTIVE,
          PENDING
        }
      `;

      const ast = await parser.parse(code, 'Status.java');

      expect(ast.classes.length).toBeGreaterThanOrEqual(1);
      const statusEnum = ast.classes.find((c) => c.name === 'Status');
      expect(statusEnum).toBeDefined();
      expect(statusEnum?.properties.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle generic types', async () => {
      const code = `
        import java.util.List;

        public class Container<T> {
          private List<T> items;

          public void add(T item) {
            items.add(item);
          }
        }
      `;

      const ast = await parser.parse(code, 'Container.java');

      expect(ast.classes).toHaveLength(1);
      expect(ast.classes[0].name).toBe('Container');
    });

    it('should handle invalid Java code gracefully', async () => {
      // tree-sitter is fault-tolerant and will parse what it can
      const invalidCode = 'class { invalid syntax }';

      // Should not throw, but may return empty or partial results
      const ast = await parser.parse(invalidCode, 'Invalid.java');
      expect(ast).toBeDefined();
      expect(ast.language).toBe('java');
    });

    it('should preserve line numbers', async () => {
      const code = `
        public class User {
          private String name;
        }
      `;

      const ast = await parser.parse(code, 'User.java');

      expect(ast.classes[0].lineNumber).toBeDefined();
      expect(ast.classes[0].lineNumber).toBeGreaterThan(0);
    });

    it('should handle parse errors gracefully', async () => {
      // Mock parser to throw an error
      const originalParser = parser['parser'];
      const mockParser = {
        parse: () => {
          throw new Error('Parse error');
        },
      };
      parser['parser'] = mockParser as any;

      await expect(parser.parse('invalid code', 'test.java')).rejects.toThrow(
        'Failed to parse Java code in test.java: Parse error'
      );

      // Restore original parser
      parser['parser'] = originalParser;
    });

    it('should handle import with wildcard', async () => {
      const code = `
        import java.util.*;
        
        public class Test {
          List<String> items;
        }
      `;

      const ast = await parser.parse(code, 'Test.java');
      expect(ast.imports.length).toBeGreaterThan(0);
      const wildcardImport = ast.imports.find((imp) => imp.isNamespace);
      expect(wildcardImport).toBeDefined();
    });

    it('should handle scoped type identifiers', async () => {
      const code = `
        import java.util.List;
        
        public class Test {
          private java.util.Map<String, Integer> map;
        }
      `;

      const ast = await parser.parse(code, 'Test.java');
      expect(ast.classes).toHaveLength(1);
    });

    it('should handle array types', async () => {
      const code = `
        public class Test {
          private int[] numbers;
          private String[] names;
        }
      `;

      const ast = await parser.parse(code, 'Test.java');
      expect(ast.classes[0].properties.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle generic types with multiple parameters', async () => {
      const code = `
        import java.util.Map;
        
        public class Test {
          private Map<String, Integer> data;
        }
      `;

      const ast = await parser.parse(code, 'Test.java');
      expect(ast.classes).toHaveLength(1);
    });
  });
});
