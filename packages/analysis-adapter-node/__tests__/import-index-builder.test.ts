/**
 * Tests for ImportIndexBuilder
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ImportIndexBuilder } from '../src/import-index-builder.js';

describe('ImportIndexBuilder', () => {
  let testDir: string;
  let builder: ImportIndexBuilder;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'import-index-builder-test-'));

    // Set up test project structure
    await fs.ensureDir(path.join(testDir, 'src'));
    await fs.ensureDir(path.join(testDir, 'src/utils'));
    await fs.ensureDir(path.join(testDir, 'src/components'));

    // Create test files with imports
    await fs.writeFile(
      path.join(testDir, 'src/index.ts'),
      `
import { helper } from './utils/helper';
import { Button } from './components/Button';
export const main = () => {};
`
    );

    await fs.writeFile(
      path.join(testDir, 'src/utils/helper.ts'),
      `
export const helper = () => {};
`
    );

    await fs.writeFile(
      path.join(testDir, 'src/components/Button.tsx'),
      `
import { helper } from '../utils/helper';
export const Button = () => {};
`
    );

    await fs.writeFile(
      path.join(testDir, 'src/components/index.ts'),
      `
export { Button } from './Button';
`
    );

    builder = new ImportIndexBuilder(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('buildIndex', () => {
    it('should build import index successfully', async () => {
      const index = await builder.buildIndex();

      expect(index.fileToImports).toBeInstanceOf(Map);
      expect(index.importToFiles).toBeInstanceOf(Map);
      expect(index.timestamp).toBeGreaterThan(0);
      expect(index.fileCount).toBeGreaterThan(0);
    });

    it('should create forward map (file -> imports)', async () => {
      const index = await builder.buildIndex();

      const indexFile = path.join(testDir, 'src/index.ts');
      const imports = index.fileToImports.get(indexFile);

      expect(imports).toBeDefined();
      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
      expect(imports).toContain(path.join(testDir, 'src/components/Button.tsx'));
    });

    it('should create reverse map (import -> files)', async () => {
      const index = await builder.buildIndex();

      const helperFile = path.join(testDir, 'src/utils/helper.ts');
      const importers = index.importToFiles.get(helperFile);

      expect(importers).toBeDefined();
      expect(importers).toContain(path.join(testDir, 'src/index.ts'));
      expect(importers).toContain(path.join(testDir, 'src/components/Button.tsx'));
    });

    it('should handle files with no imports', async () => {
      const index = await builder.buildIndex();

      const helperFile = path.join(testDir, 'src/utils/helper.ts');
      const imports = index.fileToImports.get(helperFile);

      expect(imports).toBeDefined();
      expect(imports).toEqual([]);
    });

    it('should report correct file count', async () => {
      const index = await builder.buildIndex();

      // Should find 4 TypeScript files
      expect(index.fileCount).toBe(4);
    });

    it('should call progress callback with correct values', async () => {
      const progressCalls: Array<{ current: number; total: number; message: string }> = [];

      await builder.buildIndex((current, total, message) => {
        progressCalls.push({ current, total, message });
      });

      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0].current).toBe(0);
      expect(progressCalls[0].total).toBe(100);
      expect(progressCalls[0].message).toBe('Scanning project files...');

      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall.current).toBe(100);
      expect(lastCall.message).toBe('Import index built successfully');
    });
  });

  describe('import extraction', () => {
    it('should extract ES6 named imports', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `import { foo, bar } from './utils/helper';`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should extract ES6 default imports', async () => {
      await fs.writeFile(path.join(testDir, 'src/test.ts'), `import React from './utils/helper';`);

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should extract namespace imports', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `import * as Utils from './utils/helper';`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should extract dynamic imports', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `const helper = await import('./utils/helper');`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should extract CommonJS require', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.js'),
        `const helper = require('./utils/helper');`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.js');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toBeDefined();
    });

    it('should extract type imports', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `import type { Helper } from './utils/helper';`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should extract export from statements', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `export { helper } from './utils/helper';`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
    });

    it('should skip node_modules imports', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `
import React from 'react';
import { helper } from './utils/helper';
`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      expect(imports).toContain(path.join(testDir, 'src/utils/helper.ts'));
      expect(imports).not.toContain('react');
    });

    it('should handle multiple imports from same file', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/test.ts'),
        `
import { foo } from './utils/helper';
import { bar } from './utils/helper';
`
      );

      const index = await builder.buildIndex();
      const testFile = path.join(testDir, 'src/test.ts');
      const imports = index.fileToImports.get(testFile);

      // Should only include the file once
      const helperImports = imports?.filter((imp) => imp.endsWith('helper.ts'));
      expect(helperImports?.length).toBe(1);
    });
  });

  describe('ignore patterns', () => {
    it('should ignore node_modules directory', async () => {
      await fs.ensureDir(path.join(testDir, 'node_modules'));
      await fs.writeFile(path.join(testDir, 'node_modules/package.ts'), 'test');

      const index = await builder.buildIndex();

      expect(index.fileCount).toBe(4); // Only src files
    });

    it('should ignore dist directory', async () => {
      await fs.ensureDir(path.join(testDir, 'dist'));
      await fs.writeFile(path.join(testDir, 'dist/build.ts'), 'test');

      const index = await builder.buildIndex();

      expect(index.fileCount).toBe(4);
    });

    it('should ignore .git directory', async () => {
      await fs.ensureDir(path.join(testDir, '.git'));
      await fs.writeFile(path.join(testDir, '.git/config.ts'), 'test');

      const index = await builder.buildIndex();

      expect(index.fileCount).toBe(4);
    });

    it('should respect custom ignore patterns', async () => {
      await fs.ensureDir(path.join(testDir, 'ignored'));
      await fs.writeFile(path.join(testDir, 'ignored/file.ts'), 'test');

      const customBuilder = new ImportIndexBuilder(testDir, {
        ignorePatterns: ['ignored'],
      });

      const index = await customBuilder.buildIndex();

      expect(index.fileCount).toBe(4);
    });
  });

  describe('options', () => {
    it('should respect custom extensions', async () => {
      await fs.writeFile(path.join(testDir, 'src/test.vue'), 'vue component');

      const customBuilder = new ImportIndexBuilder(testDir, {
        extensions: ['.ts', '.tsx', '.vue'],
      });

      const index = await customBuilder.buildIndex();

      expect(index.fileCount).toBe(5); // 4 original + 1 .vue file
    });

    it('should respect maxFiles limit', async () => {
      const limitedBuilder = new ImportIndexBuilder(testDir, {
        maxFiles: 2,
      });

      const index = await limitedBuilder.buildIndex();

      expect(index.fileCount).toBeLessThanOrEqual(2);
    });

    it('should handle concurrency option', async () => {
      const customBuilder = new ImportIndexBuilder(testDir, {
        concurrency: 5,
      });

      const index = await customBuilder.buildIndex();

      expect(index.fileCount).toBe(4);
    });
  });

  describe('error handling', () => {
    it('should throw error if project path does not exist', async () => {
      const invalidBuilder = new ImportIndexBuilder('/nonexistent/path');

      await expect(invalidBuilder.buildIndex()).rejects.toThrow('does not exist');
    });

    it('should skip files that cannot be read', async () => {
      const unreadableFile = path.join(testDir, 'src/unreadable.ts');
      await fs.writeFile(unreadableFile, 'test');
      await fs.chmod(unreadableFile, 0o000);

      const index = await builder.buildIndex();

      // Should still complete without throwing
      expect(index.fileCount).toBeGreaterThan(0);

      // Restore permissions for cleanup
      await fs.chmod(unreadableFile, 0o644);
    });

    it('should handle circular imports gracefully', async () => {
      await fs.writeFile(
        path.join(testDir, 'src/a.ts'),
        `import { b } from './b'; export const a = 1;`
      );
      await fs.writeFile(
        path.join(testDir, 'src/b.ts'),
        `import { a } from './a'; export const b = 2;`
      );

      const index = await builder.buildIndex();

      const fileA = path.join(testDir, 'src/a.ts');
      const fileB = path.join(testDir, 'src/b.ts');

      expect(index.fileToImports.get(fileA)).toContain(fileB);
      expect(index.fileToImports.get(fileB)).toContain(fileA);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-test-'));
      const emptyBuilder = new ImportIndexBuilder(emptyDir);

      const index = await emptyBuilder.buildIndex();

      expect(index.fileCount).toBe(0);
      expect(index.fileToImports.size).toBe(0);
      expect(index.importToFiles.size).toBe(0);

      await fs.remove(emptyDir);
    });

    it('should handle files with no imports', async () => {
      await fs.writeFile(path.join(testDir, 'src/standalone.ts'), 'export const standalone = 1;');

      const index = await builder.buildIndex();

      const standaloneFile = path.join(testDir, 'src/standalone.ts');
      const imports = index.fileToImports.get(standaloneFile);

      expect(imports).toBeDefined();
      expect(imports).toEqual([]);
    });

    it('should handle very long import chains', async () => {
      // Create a chain of 10 files
      for (let i = 0; i < 10; i++) {
        const nextImport = i < 9 ? `import { file${i + 1} } from './chain${i + 1}';` : '';
        await fs.writeFile(
          path.join(testDir, `src/chain${i}.ts`),
          `${nextImport}\nexport const file${i} = ${i};`
        );
      }

      const index = await builder.buildIndex();

      // Verify chain is correctly indexed
      for (let i = 0; i < 9; i++) {
        const currentFile = path.join(testDir, `src/chain${i}.ts`);
        const nextFile = path.join(testDir, `src/chain${i + 1}.ts`);
        const imports = index.fileToImports.get(currentFile);

        expect(imports).toContain(nextFile);
      }
    });
  });
});
