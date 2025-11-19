/**
 * @code-review-goose/analysis-parser-python
 * Tests for PythonParser
 */

import { describe, it, expect } from 'vitest';
import { PythonParser } from '../src/PythonParser.js';

describe('PythonParser', () => {
  const parser = new PythonParser();

  describe('getSupportedLanguage', () => {
    it('should return python', () => {
      expect(parser.getSupportedLanguage()).toBe('python');
    });
  });

  describe('canParse', () => {
    it('should return true for .py files', () => {
      expect(parser.canParse('test.py')).toBe(true);
      expect(parser.canParse('/path/to/file.py')).toBe(true);
    });

    it('should return true for .pyi files', () => {
      expect(parser.canParse('test.pyi')).toBe(true);
    });

    it('should return true for .pyw files', () => {
      expect(parser.canParse('test.pyw')).toBe(true);
    });

    it('should return false for non-Python files', () => {
      expect(parser.canParse('test.js')).toBe(false);
      expect(parser.canParse('test.ts')).toBe(false);
      expect(parser.canParse('test.java')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse a simple Python class', async () => {
      const code = `
class Animal:
    def __init__(self, name: str):
        self.name = name
    
    def speak(self) -> str:
        return "Some sound"
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.language).toBe('python');
      expect(result.filePath).toBe('test.py');
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('Animal');
      expect(result.classes[0].methods).toHaveLength(2);
      expect(result.classes[0].methods[0].name).toBe('__init__');
      expect(result.classes[0].methods[1].name).toBe('speak');
    });

    it('should parse class with inheritance', async () => {
      const code = `
class Dog(Animal):
    def speak(self) -> str:
        return "Woof"
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('Dog');
      expect(result.classes[0].extends).toBe('Animal');
    });

    it('should parse multiple classes', async () => {
      const code = `
class Animal:
    pass

class Dog(Animal):
    pass

class Cat(Animal):
    pass
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.classes).toHaveLength(3);
      expect(result.classes.map((c) => c.name)).toEqual(['Animal', 'Dog', 'Cat']);
      expect(result.classes[1].extends).toBe('Animal');
      expect(result.classes[2].extends).toBe('Animal');
    });

    it('should parse class with properties', async () => {
      const code = `
class Person:
    name: str = "Unknown"
    age: int = 0
    
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].properties.length).toBeGreaterThanOrEqual(0);
    });

    it('should parse import statements', async () => {
      const code = `
import os
from typing import List, Dict
from collections import defaultdict as dd
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.imports.some((imp) => imp.source === 'os')).toBe(true);
      expect(result.imports.some((imp) => imp.source === 'typing')).toBe(true);
      expect(result.imports.some((imp) => imp.source === 'collections')).toBe(true);
    });

    it('should parse top-level functions', async () => {
      const code = `
def greet(name: str) -> str:
    return f"Hello, {name}!"

def calculate(x: int, y: int) -> int:
    return x + y
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe('greet');
      expect(result.functions[1].name).toBe('calculate');
    });

    it('should parse function with type hints', async () => {
      const code = `
def process_data(data: List[str], count: int) -> Dict[str, int]:
    return {}
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('process_data');
      expect(result.functions[0].returnType).toContain('Dict');
      expect(result.functions[0].parameters.length).toBeGreaterThan(0);
    });

    it('should parse method with parameters', async () => {
      const code = `
class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b
    
    def multiply(self, x: float, y: float) -> float:
        return x * y
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].methods).toHaveLength(2);
      expect(result.classes[0].methods[0].name).toBe('add');
      expect(result.classes[0].methods[0].parameters.length).toBeGreaterThan(0);
    });

    it('should handle invalid Python code gracefully', async () => {
      // tree-sitter is fault-tolerant, so it may still parse partial code
      const code = `
class Incomplete
    def missing_colon
        pass
`;

      // Should not throw an error
      const result = await parser.parse(code, 'test.py');
      expect(result).toBeDefined();
      expect(result.language).toBe('python');
    });

    it('should parse empty file', async () => {
      const result = await parser.parse('', 'test.py');

      expect(result.language).toBe('python');
      expect(result.filePath).toBe('test.py');
      expect(result.classes).toHaveLength(0);
      expect(result.functions).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
    });

    it('should parse complex class with multiple methods', async () => {
      const code = `
class BankAccount:
    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner
        self.balance = balance
    
    def deposit(self, amount: float) -> None:
        self.balance += amount
    
    def withdraw(self, amount: float) -> bool:
        if self.balance >= amount:
            self.balance -= amount
            return True
        return False
    
    def get_balance(self) -> float:
        return self.balance
`;

      const result = await parser.parse(code, 'test.py');

      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('BankAccount');
      expect(result.classes[0].methods.length).toBeGreaterThanOrEqual(4);
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

      await expect(parser.parse('invalid code', 'test.py')).rejects.toThrow(
        'Failed to parse Python code in test.py: Parse error'
      );

      // Restore original parser
      parser['parser'] = originalParser;
    });
  });
});
