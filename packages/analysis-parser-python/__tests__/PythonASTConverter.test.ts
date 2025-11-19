/**
 * @code-review-goose/analysis-parser-python
 * Tests for PythonASTConverter
 */

import { describe, it, expect } from 'vitest';
import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import { PythonASTConverter } from '../src/PythonASTConverter.js';

describe('PythonASTConverter', () => {
  const parser = new Parser();
  parser.setLanguage(Python);
  const converter = new PythonASTConverter();

  describe('convert', () => {
    it('should convert simple class to UnifiedAST', () => {
      const code = `
class Animal:
    def speak(self) -> str:
        return "sound"
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.language).toBe('python');
      expect(result.filePath).toBe('test.py');
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('Animal');
      expect(result.classes[0].type).toBe('class');
    });

    it('should extract class inheritance', () => {
      const code = `
class Dog(Animal):
    pass
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.classes[0].extends).toBe('Animal');
    });

    it('should extract methods from class', () => {
      const code = `
class Calculator:
    def add(self, a: int, b: int) -> int:
        return a + b
    
    def subtract(self, x: int, y: int) -> int:
        return x - y
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.classes[0].methods.length).toBeGreaterThanOrEqual(2);
      expect(result.classes[0].methods.some((m) => m.name === 'add')).toBe(true);
      expect(result.classes[0].methods.some((m) => m.name === 'subtract')).toBe(true);
    });

    it('should extract method parameters', () => {
      const code = `
class Test:
    def method(self, param1: str, param2: int) -> bool:
        return True
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      const method = result.classes[0].methods.find((m) => m.name === 'method');
      expect(method).toBeDefined();
      if (method) {
        expect(method.parameters.length).toBeGreaterThan(0);
      }
    });

    it('should extract return types', () => {
      const code = `
class Test:
    def get_string(self) -> str:
        return ""
    
    def get_int(self) -> int:
        return 0
    
    def get_list(self) -> List[str]:
        return []
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      const methods = result.classes[0].methods;
      expect(methods.length).toBeGreaterThanOrEqual(3);
      
      const stringMethod = methods.find((m) => m.name === 'get_string');
      expect(stringMethod?.returnType).toBe('str');
      
      const intMethod = methods.find((m) => m.name === 'get_int');
      expect(intMethod?.returnType).toBe('int');
    });

    it('should extract import statements', () => {
      const code = `
import os
from typing import List, Dict
from collections import defaultdict
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.imports.length).toBeGreaterThan(0);
      expect(result.imports.some((imp) => imp.source === 'os')).toBe(true);
      expect(result.imports.some((imp) => imp.source === 'typing')).toBe(true);
      expect(result.imports.some((imp) => imp.source === 'collections')).toBe(true);
    });

    it('should extract top-level functions', () => {
      const code = `
def function1() -> None:
    pass

def function2(x: int) -> int:
    return x
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.functions.length).toBeGreaterThanOrEqual(2);
      expect(result.functions.some((f) => f.name === 'function1')).toBe(true);
      expect(result.functions.some((f) => f.name === 'function2')).toBe(true);
    });

    it('should not extract nested functions as top-level', () => {
      const code = `
def outer():
    def inner():
        pass
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('outer');
    });

    it('should not extract class methods as top-level functions', () => {
      const code = `
class MyClass:
    def method(self):
        pass

def top_level():
    pass
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.functions.length).toBe(1);
      expect(result.functions[0].name).toBe('top_level');
    });

    it('should handle empty file', () => {
      const code = '';
      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.language).toBe('python');
      expect(result.filePath).toBe('test.py');
      expect(result.classes).toHaveLength(0);
      expect(result.functions).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
    });

    it('should extract complex type annotations', () => {
      const code = `
from typing import List, Dict, Optional

class DataProcessor:
    def process(self, items: List[str], config: Dict[str, int]) -> Optional[bool]:
        return None
`;

      const tree = parser.parse(code);
      const result = converter.convert(tree.rootNode, 'test.py');

      expect(result.classes[0].methods.length).toBeGreaterThan(0);
      const method = result.classes[0].methods[0];
      expect(method.parameters.length).toBeGreaterThan(0);
    });
  });
});
