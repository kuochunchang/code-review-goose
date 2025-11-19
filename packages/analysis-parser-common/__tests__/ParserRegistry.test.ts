/**
 * Tests for ParserRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParserRegistry } from '../src/ParserRegistry.js';
import type { ILanguageParser } from '../src/ILanguageParser.js';
import type { UnifiedAST, SupportedLanguage } from '@code-review-goose/analysis-types';

// Mock parser for testing
class MockParser implements ILanguageParser {
  constructor(private language: SupportedLanguage) {}

  async parse(_code: string, _filePath: string): Promise<UnifiedAST> {
    return {
      language: this.language,
      classes: [],
      interfaces: [],
      functions: [],
      imports: [],
      exports: [],
    };
  }

  getSupportedLanguage(): SupportedLanguage {
    return this.language;
  }

  canParse(filePath: string): boolean {
    if (this.language === 'typescript') {
      return /\.tsx?$/.test(filePath);
    }
    if (this.language === 'java') {
      return /\.java$/.test(filePath);
    }
    if (this.language === 'python') {
      return /\.py$/.test(filePath);
    }
    return false;
  }
}

describe('ParserRegistry', () => {
  let registry: ParserRegistry;

  beforeEach(() => {
    registry = new ParserRegistry();
  });

  describe('register', () => {
    it('should register a parser', () => {
      const parser = new MockParser('typescript');
      registry.register(parser);

      expect(registry.hasParser('typescript')).toBe(true);
    });

    it('should throw error when registering duplicate parser', () => {
      const parser1 = new MockParser('typescript');
      const parser2 = new MockParser('typescript');

      registry.register(parser1);

      expect(() => registry.register(parser2)).toThrow(
        "Parser for language 'typescript' is already registered"
      );
    });

    it('should register multiple parsers', () => {
      registry.register(new MockParser('typescript'));
      registry.register(new MockParser('java'));
      registry.register(new MockParser('python'));

      expect(registry.hasParser('typescript')).toBe(true);
      expect(registry.hasParser('java')).toBe(true);
      expect(registry.hasParser('python')).toBe(true);
    });
  });

  describe('registerLazy', () => {
    it('should register a parser factory', () => {
      registry.registerLazy('typescript', () => new MockParser('typescript'));

      expect(registry.hasParser('typescript')).toBe(true);
    });

    it('should throw error when registering duplicate lazy parser', () => {
      registry.registerLazy('typescript', () => new MockParser('typescript'));

      expect(() =>
        registry.registerLazy('typescript', () => new MockParser('typescript'))
      ).toThrow("Parser for language 'typescript' is already registered");
    });

    it('should not allow registering lazy parser if eager parser exists', () => {
      registry.register(new MockParser('typescript'));

      expect(() =>
        registry.registerLazy('typescript', () => new MockParser('typescript'))
      ).toThrow("Parser for language 'typescript' is already registered");
    });

    it('should not allow registering eager parser if lazy parser exists', () => {
      registry.registerLazy('typescript', () => new MockParser('typescript'));

      expect(() => registry.register(new MockParser('typescript'))).toThrow(
        "Parser for language 'typescript' is already registered"
      );
    });
  });

  describe('getParser', () => {
    it('should return registered parser', async () => {
      const parser = new MockParser('typescript');
      registry.register(parser);

      const retrieved = await registry.getParser('typescript');
      expect(retrieved).toBe(parser);
    });

    it('should return undefined for unregistered language', async () => {
      const parser = await registry.getParser('typescript');
      expect(parser).toBeUndefined();
    });

    it('should initialize lazy parser on first access', async () => {
      const factory = vi.fn(() => new MockParser('typescript'));
      registry.registerLazy('typescript', factory);

      expect(factory).not.toHaveBeenCalled();

      const parser1 = await registry.getParser('typescript');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(parser1).toBeDefined();

      // Second call should use cached parser
      const parser2 = await registry.getParser('typescript');
      expect(factory).toHaveBeenCalledTimes(1); // Still only called once
      expect(parser2).toBe(parser1); // Same instance
    });

    it('should support async parser factories', async () => {
      const factory = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new MockParser('typescript');
      };

      registry.registerLazy('typescript', factory);

      const parser = await registry.getParser('typescript');
      expect(parser).toBeDefined();
      expect(parser?.getSupportedLanguage()).toBe('typescript');
    });

    it('should throw error if factory returns wrong parser', async () => {
      registry.registerLazy('typescript', () => new MockParser('java'));

      await expect(registry.getParser('typescript')).rejects.toThrow(
        "Parser factory for 'typescript' returned parser for 'java'"
      );
    });
  });

  describe('getParserForFile', () => {
    beforeEach(() => {
      registry.register(new MockParser('typescript'));
      registry.register(new MockParser('java'));
      registry.register(new MockParser('python'));
    });

    it('should return parser for TypeScript files', async () => {
      const parser = await registry.getParserForFile('App.ts');
      expect(parser?.getSupportedLanguage()).toBe('typescript');
    });

    it('should return parser for Java files', async () => {
      const parser = await registry.getParserForFile('Main.java');
      expect(parser?.getSupportedLanguage()).toBe('java');
    });

    it('should return parser for Python files', async () => {
      const parser = await registry.getParserForFile('main.py');
      expect(parser?.getSupportedLanguage()).toBe('python');
    });

    it('should return undefined for unsupported files', async () => {
      const parser = await registry.getParserForFile('README.md');
      expect(parser).toBeUndefined();
    });

    it('should throw error if language detected but parser not registered', async () => {
      registry.clear();

      await expect(registry.getParserForFile('App.ts')).rejects.toThrow(
        "Language 'typescript' detected for file 'App.ts' but no parser is registered"
      );
    });

    it('should handle file paths with directories', async () => {
      const parser = await registry.getParserForFile('/src/components/Button.tsx');
      expect(parser?.getSupportedLanguage()).toBe('typescript');
    });
  });

  describe('hasParser', () => {
    it('should return true for registered eager parser', () => {
      registry.register(new MockParser('typescript'));
      expect(registry.hasParser('typescript')).toBe(true);
    });

    it('should return true for registered lazy parser', () => {
      registry.registerLazy('typescript', () => new MockParser('typescript'));
      expect(registry.hasParser('typescript')).toBe(true);
    });

    it('should return false for unregistered language', () => {
      expect(registry.hasParser('typescript')).toBe(false);
    });
  });

  describe('getRegisteredLanguages', () => {
    it('should return empty array initially', () => {
      expect(registry.getRegisteredLanguages()).toEqual([]);
    });

    it('should return all registered languages', () => {
      registry.register(new MockParser('typescript'));
      registry.register(new MockParser('java'));

      const languages = registry.getRegisteredLanguages();
      expect(languages).toContain('typescript');
      expect(languages).toContain('java');
      expect(languages.length).toBe(2);
    });

    it('should include lazy-registered languages', () => {
      registry.register(new MockParser('typescript'));
      registry.registerLazy('java', () => new MockParser('java'));

      const languages = registry.getRegisteredLanguages();
      expect(languages).toContain('typescript');
      expect(languages).toContain('java');
      expect(languages.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all registered parsers', () => {
      registry.register(new MockParser('typescript'));
      registry.register(new MockParser('java'));
      registry.registerLazy('python', () => new MockParser('python'));

      expect(registry.getRegisteredLanguages().length).toBe(3);

      registry.clear();

      expect(registry.getRegisteredLanguages()).toEqual([]);
      expect(registry.hasParser('typescript')).toBe(false);
      expect(registry.hasParser('java')).toBe(false);
      expect(registry.hasParser('python')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister eager parser', () => {
      registry.register(new MockParser('typescript'));
      expect(registry.hasParser('typescript')).toBe(true);

      const removed = registry.unregister('typescript');
      expect(removed).toBe(true);
      expect(registry.hasParser('typescript')).toBe(false);
    });

    it('should unregister lazy parser', () => {
      registry.registerLazy('typescript', () => new MockParser('typescript'));
      expect(registry.hasParser('typescript')).toBe(true);

      const removed = registry.unregister('typescript');
      expect(removed).toBe(true);
      expect(registry.hasParser('typescript')).toBe(false);
    });

    it('should return false for unregistered language', () => {
      const removed = registry.unregister('typescript');
      expect(removed).toBe(false);
    });

    it('should clear lazy cache when unregistering', async () => {
      const factory = vi.fn(() => new MockParser('typescript'));
      registry.registerLazy('typescript', factory);

      // Initialize parser
      await registry.getParser('typescript');
      expect(factory).toHaveBeenCalledTimes(1);

      // Unregister
      registry.unregister('typescript');

      // Re-register and get - should call factory again
      registry.registerLazy('typescript', factory);
      await registry.getParser('typescript');
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});
