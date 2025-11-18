/**
 * Tests for LanguageDetector
 */

import { describe, it, expect } from 'vitest';
import { LanguageDetector } from '../src/LanguageDetector.js';

describe('LanguageDetector', () => {
  describe('detectFromFilePath', () => {
    it('should detect TypeScript files', () => {
      expect(LanguageDetector.detectFromFilePath('App.ts')).toBe('typescript');
      expect(LanguageDetector.detectFromFilePath('App.tsx')).toBe('typescript');
      expect(LanguageDetector.detectFromFilePath('module.mts')).toBe('typescript');
      expect(LanguageDetector.detectFromFilePath('config.cts')).toBe('typescript');
      expect(LanguageDetector.detectFromFilePath('/src/components/Button.tsx')).toBe('typescript');
    });

    it('should detect JavaScript files', () => {
      expect(LanguageDetector.detectFromFilePath('app.js')).toBe('javascript');
      expect(LanguageDetector.detectFromFilePath('Component.jsx')).toBe('javascript');
      expect(LanguageDetector.detectFromFilePath('module.mjs')).toBe('javascript');
      expect(LanguageDetector.detectFromFilePath('config.cjs')).toBe('javascript');
      expect(LanguageDetector.detectFromFilePath('/src/utils/helper.js')).toBe('javascript');
    });

    it('should detect Java files', () => {
      expect(LanguageDetector.detectFromFilePath('Main.java')).toBe('java');
      expect(LanguageDetector.detectFromFilePath('/src/com/example/User.java')).toBe('java');
    });

    it('should detect Python files', () => {
      expect(LanguageDetector.detectFromFilePath('main.py')).toBe('python');
      expect(LanguageDetector.detectFromFilePath('types.pyi')).toBe('python');
      expect(LanguageDetector.detectFromFilePath('script.pyw')).toBe('python');
      expect(LanguageDetector.detectFromFilePath('/app/models/user.py')).toBe('python');
    });

    it('should detect Go files', () => {
      expect(LanguageDetector.detectFromFilePath('main.go')).toBe('go');
      expect(LanguageDetector.detectFromFilePath('/cmd/server/main.go')).toBe('go');
    });

    it('should return null for unsupported files', () => {
      expect(LanguageDetector.detectFromFilePath('README.md')).toBeNull();
      expect(LanguageDetector.detectFromFilePath('config.json')).toBeNull();
      expect(LanguageDetector.detectFromFilePath('style.css')).toBeNull();
      expect(LanguageDetector.detectFromFilePath('image.png')).toBeNull();
      expect(LanguageDetector.detectFromFilePath('no-extension')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(LanguageDetector.detectFromFilePath('App.TS')).toBe('typescript');
      expect(LanguageDetector.detectFromFilePath('Main.JAVA')).toBe('java');
      expect(LanguageDetector.detectFromFilePath('script.PY')).toBe('python');
    });

    it('should handle paths with multiple dots', () => {
      expect(LanguageDetector.detectFromFilePath('config.test.ts')).toBe('typescript');
      expect(LanguageDetector.detectFromFilePath('utils.spec.js')).toBe('javascript');
      expect(LanguageDetector.detectFromFilePath('model.v1.java')).toBe('java');
    });
  });

  describe('getExtensions', () => {
    it('should return all TypeScript extensions', () => {
      const extensions = LanguageDetector.getExtensions('typescript');
      expect(extensions).toContain('.ts');
      expect(extensions).toContain('.tsx');
      expect(extensions).toContain('.mts');
      expect(extensions).toContain('.cts');
      expect(extensions.length).toBeGreaterThanOrEqual(4);
    });

    it('should return all JavaScript extensions', () => {
      const extensions = LanguageDetector.getExtensions('javascript');
      expect(extensions).toContain('.js');
      expect(extensions).toContain('.jsx');
      expect(extensions).toContain('.mjs');
      expect(extensions).toContain('.cjs');
      expect(extensions.length).toBeGreaterThanOrEqual(4);
    });

    it('should return Java extensions', () => {
      const extensions = LanguageDetector.getExtensions('java');
      expect(extensions).toContain('.java');
      expect(extensions.length).toBeGreaterThanOrEqual(1);
    });

    it('should return Python extensions', () => {
      const extensions = LanguageDetector.getExtensions('python');
      expect(extensions).toContain('.py');
      expect(extensions).toContain('.pyi');
      expect(extensions).toContain('.pyw');
      expect(extensions.length).toBeGreaterThanOrEqual(3);
    });

    it('should return Go extensions', () => {
      const extensions = LanguageDetector.getExtensions('go');
      expect(extensions).toContain('.go');
      expect(extensions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isSupported', () => {
    it('should return true for supported files', () => {
      expect(LanguageDetector.isSupported('App.ts')).toBe(true);
      expect(LanguageDetector.isSupported('app.js')).toBe(true);
      expect(LanguageDetector.isSupported('Main.java')).toBe(true);
      expect(LanguageDetector.isSupported('main.py')).toBe(true);
      expect(LanguageDetector.isSupported('main.go')).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(LanguageDetector.isSupported('README.md')).toBe(false);
      expect(LanguageDetector.isSupported('config.json')).toBe(false);
      expect(LanguageDetector.isSupported('style.css')).toBe(false);
      expect(LanguageDetector.isSupported('unknown.xyz')).toBe(false);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const languages = LanguageDetector.getSupportedLanguages();

      expect(languages).toContain('typescript');
      expect(languages).toContain('javascript');
      expect(languages).toContain('java');
      expect(languages).toContain('python');
      expect(languages).toContain('go');
    });

    it('should return unique languages', () => {
      const languages = LanguageDetector.getSupportedLanguages();
      const uniqueLanguages = new Set(languages);

      expect(languages.length).toBe(uniqueLanguages.size);
    });
  });

  describe('getExtensionMap', () => {
    it('should return a copy of extension map', () => {
      const map1 = LanguageDetector.getExtensionMap();
      const map2 = LanguageDetector.getExtensionMap();

      expect(map1).not.toBe(map2); // Different objects
      expect(map1).toEqual(map2); // Same content
    });

    it('should include all expected extensions', () => {
      const map = LanguageDetector.getExtensionMap();

      expect(map['.ts']).toBe('typescript');
      expect(map['.js']).toBe('javascript');
      expect(map['.java']).toBe('java');
      expect(map['.py']).toBe('python');
      expect(map['.go']).toBe('go');
    });
  });

  describe('detectFromContent', () => {
    it('should return null (not yet implemented)', () => {
      expect(LanguageDetector.detectFromContent('class Foo {}')).toBeNull();
      expect(LanguageDetector.detectFromContent('#!/usr/bin/python')).toBeNull();
      expect(LanguageDetector.detectFromContent('package main')).toBeNull();
    });
  });
});
