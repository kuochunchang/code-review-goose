/**
 * Tests for PathResolver
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PathResolver } from '../src/path-resolver.js';

describe('PathResolver', () => {
  let testDir: string;
  let resolver: PathResolver;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-resolver-test-'));
    resolver = new PathResolver(testDir);

    // Set up test file structure
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'src/components'));
    await fs.ensureDir(path.join(testDir, 'src/utils'));
    await fs.writeFile(path.join(testDir, 'src/index.ts'), 'main');
    await fs.writeFile(path.join(testDir, 'src/app.tsx'), 'app');
    await fs.writeFile(path.join(testDir, 'src/components/Button.tsx'), 'button');
    await fs.writeFile(path.join(testDir, 'src/components/index.ts'), 'index');
    await fs.writeFile(path.join(testDir, 'src/utils/helper.ts'), 'helper');
    await fs.writeFile(path.join(testDir, 'src/utils/math.js'), 'math');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('resolveImportPath', () => {
    it('should resolve relative import with .ts extension', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './app.tsx'
      );
      expect(resolved).toBe(path.join(testDir, 'src/app.tsx'));
    });

    it('should resolve relative import without extension', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './app'
      );
      expect(resolved).toBe(path.join(testDir, 'src/app.tsx'));
    });

    it('should resolve import to .ts file when multiple extensions possible', async () => {
      // Create files with different extensions
      await fs.writeFile(path.join(testDir, 'src/test.ts'), 'ts');
      await fs.writeFile(path.join(testDir, 'src/test.js'), 'js');

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './test'
      );

      // Should prioritize .ts over .js
      expect(resolved).toBe(path.join(testDir, 'src/test.ts'));
    });

    it('should resolve directory import to index file', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './components'
      );
      expect(resolved).toBe(path.join(testDir, 'src/components/index.ts'));
    });

    it('should resolve parent directory imports', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/components/Button.tsx'),
        '../index'
      );
      expect(resolved).toBe(path.join(testDir, 'src/index.ts'));
    });

    it('should resolve nested relative imports', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './components/Button'
      );
      expect(resolved).toBe(path.join(testDir, 'src/components/Button.tsx'));
    });

    it('should return null for non-relative imports', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        'react'
      );
      expect(resolved).toBeNull();
    });

    it('should return null for absolute imports', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        '/absolute/path'
      );
      expect(resolved).toBeNull();
    });

    it('should return null for empty import path', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        ''
      );
      expect(resolved).toBeNull();
    });

    it('should return null if from file does not exist', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/nonexistent.ts'),
        './app'
      );
      expect(resolved).toBeNull();
    });

    it('should return null if resolved path is outside project', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        '../../../etc/passwd'
      );
      expect(resolved).toBeNull();
    });

    it('should return null if import file does not exist', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './nonexistent'
      );
      expect(resolved).toBeNull();
    });
  });

  describe('isRelativePath', () => {
    it('should return true for ./ imports', () => {
      expect(resolver.isRelativePath('./file')).toBe(true);
      expect(resolver.isRelativePath('./dir/file')).toBe(true);
    });

    it('should return true for ../ imports', () => {
      expect(resolver.isRelativePath('../file')).toBe(true);
      expect(resolver.isRelativePath('../../dir/file')).toBe(true);
    });

    it('should return false for absolute imports', () => {
      expect(resolver.isRelativePath('/absolute/path')).toBe(false);
    });

    it('should return false for node_modules imports', () => {
      expect(resolver.isRelativePath('react')).toBe(false);
      expect(resolver.isRelativePath('@types/node')).toBe(false);
    });

    it('should return false for alias imports', () => {
      expect(resolver.isRelativePath('@/components/Button')).toBe(false);
    });
  });

  describe('isWithinProject', () => {
    it('should return true for files within project', () => {
      const filePath = path.join(testDir, 'src/index.ts');
      expect(resolver.isWithinProject(filePath)).toBe(true);
    });

    it('should return true for nested files within project', () => {
      const filePath = path.join(testDir, 'src/components/Button.tsx');
      expect(resolver.isWithinProject(filePath)).toBe(true);
    });

    it('should return false for files outside project', () => {
      const filePath = path.join(testDir, '..', 'outside.ts');
      expect(resolver.isWithinProject(filePath)).toBe(false);
    });

    it('should return false for path traversal attacks', () => {
      const filePath = path.join(testDir, 'src', '..', '..', '..', 'etc', 'passwd');
      expect(resolver.isWithinProject(filePath)).toBe(false);
    });

    it('should handle non-existent files correctly', () => {
      const filePath = path.join(testDir, 'src/future-file.ts');
      expect(resolver.isWithinProject(filePath)).toBe(true);
    });

    it('should handle non-existent files outside project correctly', () => {
      const filePath = path.join(testDir, '..', 'outside-future.ts');
      expect(resolver.isWithinProject(filePath)).toBe(false);
    });
  });

  describe('extension resolution priority', () => {
    it('should prioritize .ts over other extensions', async () => {
      await fs.writeFile(path.join(testDir, 'src/multi.ts'), 'ts');
      await fs.writeFile(path.join(testDir, 'src/multi.js'), 'js');
      await fs.writeFile(path.join(testDir, 'src/multi.jsx'), 'jsx');

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './multi'
      );
      expect(resolved).toBe(path.join(testDir, 'src/multi.ts'));
    });

    it('should prioritize .tsx over .js and .jsx', async () => {
      await fs.writeFile(path.join(testDir, 'src/component.tsx'), 'tsx');
      await fs.writeFile(path.join(testDir, 'src/component.js'), 'js');
      await fs.writeFile(path.join(testDir, 'src/component.jsx'), 'jsx');

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './component'
      );
      expect(resolved).toBe(path.join(testDir, 'src/component.tsx'));
    });

    it('should fall back to .js if .ts not found', async () => {
      await fs.writeFile(path.join(testDir, 'src/legacy.js'), 'js');

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './legacy'
      );
      expect(resolved).toBe(path.join(testDir, 'src/legacy.js'));
    });
  });

  describe('index file resolution', () => {
    it('should resolve directory to index.ts', async () => {
      await fs.ensureDir(path.join(testDir, 'src/lib'));
      await fs.writeFile(path.join(testDir, 'src/lib/index.ts'), 'index');

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './lib'
      );
      expect(resolved).toBe(path.join(testDir, 'src/lib/index.ts'));
    });

    it('should prioritize index.ts over other index extensions', async () => {
      await fs.ensureDir(path.join(testDir, 'src/mixed'));
      await fs.writeFile(path.join(testDir, 'src/mixed/index.ts'), 'ts');
      await fs.writeFile(path.join(testDir, 'src/mixed/index.js'), 'js');

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './mixed'
      );
      expect(resolved).toBe(path.join(testDir, 'src/mixed/index.ts'));
    });

    it('should return null if directory has no index file', async () => {
      await fs.ensureDir(path.join(testDir, 'src/empty-dir'));

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './empty-dir'
      );
      expect(resolved).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle paths with normalized separators', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        './utils/../components/Button'
      );
      expect(resolved).toBe(path.join(testDir, 'src/components/Button.tsx'));
    });

    it('should handle whitespace in import paths', async () => {
      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/index.ts'),
        '  '
      );
      expect(resolved).toBeNull();
    });

    it('should handle symbolic links within project', async () => {
      const linkPath = path.join(testDir, 'src/link.ts');
      const targetPath = path.join(testDir, 'src/index.ts');

      await fs.symlink(targetPath, linkPath);

      const resolved = await resolver.resolveImportPath(
        path.join(testDir, 'src/components/Button.tsx'),
        '../link'
      );
      expect(resolved).toBe(linkPath);
    });
  });
});
