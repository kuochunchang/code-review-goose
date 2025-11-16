/**
 * Tests for NodeFileProvider
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { NodeFileProvider } from '../src/node-file-provider.js';

describe('NodeFileProvider', () => {
  let testDir: string;
  let provider: NodeFileProvider;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'node-file-provider-test-'));
    provider = new NodeFileProvider(testDir);

    // Set up test file structure
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'src/utils'));
    await fs.writeFile(path.join(testDir, 'src/index.ts'), 'export const main = () => {}');
    await fs.writeFile(path.join(testDir, 'src/utils/helper.ts'), 'export const helper = () => {}');
    await fs.writeFile(
      path.join(testDir, 'src/utils/index.ts'),
      'export * from "./helper.js"'
    );
    await fs.writeFile(path.join(testDir, 'README.md'), '# Test Project');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('readFile', () => {
    it('should read file content as UTF-8 string', async () => {
      const content = await provider.readFile(path.join(testDir, 'src/index.ts'));
      expect(content).toBe('export const main = () => {}');
    });

    it('should read file with relative path', async () => {
      const content = await provider.readFile('src/index.ts');
      expect(content).toBe('export const main = () => {}');
    });

    it('should throw error if file does not exist', async () => {
      await expect(provider.readFile('nonexistent.ts')).rejects.toThrow();
    });

    it('should throw error if path is a directory', async () => {
      await expect(provider.readFile('src')).rejects.toThrow('not a file');
    });

    it('should throw error if path is outside project boundary', async () => {
      const outsidePath = path.join(testDir, '..', 'outside.ts');
      await fs.writeFile(outsidePath, 'test');

      await expect(provider.readFile(outsidePath)).rejects.toThrow('outside project boundary');

      // Cleanup
      await fs.remove(outsidePath);
    });
  });

  describe('resolveImport', () => {
    it('should resolve relative import with extension', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        './utils/helper.ts'
      );
      expect(resolved).toBe(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should resolve relative import without extension', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        './utils/helper'
      );
      expect(resolved).toBe(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should resolve directory import to index file', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        './utils'
      );
      expect(resolved).toBe(path.join(testDir, 'src/utils/index.ts'));
    });

    it('should resolve parent directory imports', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/utils/helper.ts'),
        '../index'
      );
      expect(resolved).toBe(path.join(testDir, 'src/index.ts'));
    });

    it('should return null for non-relative imports', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        'lodash'
      );
      expect(resolved).toBeNull();
    });

    it('should return null for absolute imports', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        '/absolute/path'
      );
      expect(resolved).toBeNull();
    });

    it('should return null if from file does not exist', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'nonexistent.ts'),
        './utils'
      );
      expect(resolved).toBeNull();
    });

    it('should return null if resolved path is outside project', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        '../../../etc/passwd'
      );
      expect(resolved).toBeNull();
    });

    it('should return null if import cannot be resolved', async () => {
      const resolved = await provider.resolveImport(
        path.join(testDir, 'src/index.ts'),
        './nonexistent'
      );
      expect(resolved).toBeNull();
    });
  });

  describe('listFiles', () => {
    it('should list files matching glob pattern', async () => {
      const files = await provider.listFiles('**/*.ts');

      expect(files).toContain(path.join(testDir, 'src/index.ts'));
      expect(files).toContain(path.join(testDir, 'src/utils/helper.ts'));
      expect(files).toContain(path.join(testDir, 'src/utils/index.ts'));
      expect(files).not.toContain(path.join(testDir, 'README.md'));
    });

    it('should list files with specific pattern', async () => {
      const files = await provider.listFiles('src/**/*.ts');

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.endsWith('.ts'))).toBe(true);
    });

    it('should not include directories', async () => {
      const files = await provider.listFiles('**/*');

      for (const file of files) {
        const stats = await fs.stat(file);
        expect(stats.isFile()).toBe(true);
      }
    });

    it('should return empty array if no files match', async () => {
      const files = await provider.listFiles('**/*.xyz');
      expect(files).toEqual([]);
    });

    it('should ignore node_modules and build directories', async () => {
      // Create ignored directories
      await fs.ensureDir(path.join(testDir, 'node_modules'));
      await fs.ensureDir(path.join(testDir, 'dist'));
      await fs.writeFile(path.join(testDir, 'node_modules/test.ts'), 'test');
      await fs.writeFile(path.join(testDir, 'dist/test.ts'), 'test');

      const files = await provider.listFiles('**/*.ts');

      expect(files).not.toContain(path.join(testDir, 'node_modules/test.ts'));
      expect(files).not.toContain(path.join(testDir, 'dist/test.ts'));
    });
  });

  describe('exists', () => {
    it('should return true if file exists', async () => {
      const exists = await provider.exists(path.join(testDir, 'src/index.ts'));
      expect(exists).toBe(true);
    });

    it('should return true if directory exists', async () => {
      const exists = await provider.exists(path.join(testDir, 'src'));
      expect(exists).toBe(true);
    });

    it('should return false if file does not exist', async () => {
      const exists = await provider.exists(path.join(testDir, 'nonexistent.ts'));
      expect(exists).toBe(false);
    });

    it('should work with relative paths', async () => {
      const exists = await provider.exists('src/index.ts');
      expect(exists).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle files with multiple extensions correctly', async () => {
      await fs.writeFile(path.join(testDir, 'src/test.spec.ts'), 'test');

      const content = await provider.readFile('src/test.spec.ts');
      expect(content).toBe('test');
    });

    it('should handle symbolic links within project', async () => {
      const linkPath = path.join(testDir, 'src/link.ts');
      const targetPath = path.join(testDir, 'src/index.ts');

      await fs.symlink(targetPath, linkPath);

      const content = await provider.readFile(linkPath);
      expect(content).toBe('export const main = () => {}');
    });

    it('should handle empty files', async () => {
      await fs.writeFile(path.join(testDir, 'src/empty.ts'), '');

      const content = await provider.readFile('src/empty.ts');
      expect(content).toBe('');
    });

    it('should handle files with special characters in name', async () => {
      await fs.writeFile(path.join(testDir, 'src/test-file_2.ts'), 'test');

      const content = await provider.readFile('src/test-file_2.ts');
      expect(content).toBe('test');
    });
  });
});
