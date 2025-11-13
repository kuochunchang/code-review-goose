import { describe, it, expect } from 'vitest';
import { ImportIndexBuilder } from '../../../services/importIndexBuilder';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

// Test fixtures path
const FIXTURES_PATH = path.join(__dirname, '../../fixtures/cross-file');

describe('ImportIndexBuilder', () => {
  describe('Basic Functionality', () => {
    it('should build index for simple fixture with correct forward map', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'simple');
      const builder = new ImportIndexBuilder(projectPath);

      const index = await builder.buildIndex();

      // Verify fileToImports map (forward dependencies)
      const carFile = path.join(projectPath, 'Car.ts');
      const carImports = index.fileToImports.get(carFile);

      expect(carImports).toBeDefined();
      expect(carImports).toHaveLength(2);

      // Car.ts imports Engine.ts and Wheel.ts
      const engineFile = path.join(projectPath, 'Engine.ts');
      const wheelFile = path.join(projectPath, 'Wheel.ts');
      expect(carImports).toContain(engineFile);
      expect(carImports).toContain(wheelFile);

      // Engine.ts and Wheel.ts have no imports
      expect(index.fileToImports.get(engineFile) || []).toHaveLength(0);
      expect(index.fileToImports.get(wheelFile) || []).toHaveLength(0);
    });

    it('should build index with correct reverse map', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'simple');
      const builder = new ImportIndexBuilder(projectPath);

      const index = await builder.buildIndex();

      // Verify importToFiles map (reverse dependencies)
      const engineFile = path.join(projectPath, 'Engine.ts');
      const wheelFile = path.join(projectPath, 'Wheel.ts');
      const carFile = path.join(projectPath, 'Car.ts');

      // Engine.ts is imported by Car.ts
      const engineImporters = index.importToFiles.get(engineFile);
      expect(engineImporters).toBeDefined();
      expect(engineImporters).toContain(carFile);

      // Wheel.ts is imported by Car.ts
      const wheelImporters = index.importToFiles.get(wheelFile);
      expect(wheelImporters).toBeDefined();
      expect(wheelImporters).toContain(carFile);

      // Car.ts is not imported by anyone in this fixture
      const carImporters = index.importToFiles.get(carFile);
      expect(carImporters || []).toHaveLength(0);
    });

    it('should handle empty directory', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-empty-'));
      const builder = new ImportIndexBuilder(tempDir);

      const index = await builder.buildIndex();

      expect(index.fileCount).toBe(0);
      expect(index.fileToImports.size).toBe(0);
      expect(index.importToFiles.size).toBe(0);

      // Cleanup
      await fs.remove(tempDir);
    });

    it('should handle single file with no imports', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'simple');
      const builder = new ImportIndexBuilder(projectPath);

      const index = await builder.buildIndex();

      const engineFile = path.join(projectPath, 'Engine.ts');
      const engineImports = index.fileToImports.get(engineFile);

      expect(engineImports || []).toHaveLength(0);
      expect(index.fileCount).toBeGreaterThan(0);
    });

    it('should include timestamp and file count metadata', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'simple');
      const builder = new ImportIndexBuilder(projectPath);

      const beforeTime = Date.now();
      const index = await builder.buildIndex();
      const afterTime = Date.now();

      expect(index.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(index.timestamp).toBeLessThanOrEqual(afterTime);
      expect(index.fileCount).toBe(3); // Car.ts, Engine.ts, Wheel.ts
    });
  });

  describe('Import Extraction', () => {
    it('should extract named imports', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-named-'));
      const testFile = path.join(tempDir, 'test.ts');
      const engineFile = path.join(tempDir, 'Engine.ts');
      const partsDir = path.join(tempDir, 'parts');
      const wheelFile = path.join(partsDir, 'Wheel.ts');

      // Create referenced files
      await fs.writeFile(engineFile, 'export class Engine {}');
      await fs.mkdir(partsDir);
      await fs.writeFile(wheelFile, 'export class Wheel {} export class Tire {}');

      await fs.writeFile(
        testFile,
        `
        import { Engine } from './Engine';
        import { Wheel, Tire } from './parts/Wheel';
      `
      );

      const builder = new ImportIndexBuilder(tempDir);
      const index = await builder.buildIndex();

      const imports = index.fileToImports.get(testFile);
      expect(imports).toBeDefined();
      expect(imports?.length).toBe(2);
      expect(imports).toContain(engineFile);
      expect(imports).toContain(wheelFile);

      // Cleanup
      await fs.remove(tempDir);
    });

    it('should extract default imports', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-default-'));
      const testFile = path.join(tempDir, 'test.ts');
      const engineFile = path.join(tempDir, 'Engine.ts');

      // Create referenced file
      await fs.writeFile(engineFile, 'export default class Engine {}');

      await fs.writeFile(
        testFile,
        `
        import Engine from './Engine';
        import React from 'react';
      `
      );

      const builder = new ImportIndexBuilder(tempDir);
      const index = await builder.buildIndex();

      const imports = index.fileToImports.get(testFile);
      expect(imports).toBeDefined();
      // Only relative import should be included
      expect(imports?.length).toBe(1);
      expect(imports).toContain(engineFile);

      // Cleanup
      await fs.remove(tempDir);
    });

    it('should extract namespace imports', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-namespace-'));
      const testFile = path.join(tempDir, 'test.ts');
      const utilsFile = path.join(tempDir, 'utils.ts');

      // Create referenced file
      await fs.writeFile(utilsFile, 'export function add() {} export function sub() {}');

      await fs.writeFile(
        testFile,
        `
        import * as Utils from './utils';
        import * as path from 'path';
      `
      );

      const builder = new ImportIndexBuilder(tempDir);
      const index = await builder.buildIndex();

      const imports = index.fileToImports.get(testFile);
      expect(imports).toBeDefined();
      // Only relative import should be included
      expect(imports?.length).toBe(1);
      expect(imports).toContain(utilsFile);

      // Cleanup
      await fs.remove(tempDir);
    });

    it('should extract require statements', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-require-'));
      const testFile = path.join(tempDir, 'test.js');
      const engineFile = path.join(tempDir, 'Engine.js');

      // Create referenced file
      await fs.writeFile(engineFile, 'module.exports = class Engine {}');

      await fs.writeFile(
        testFile,
        `
        const Engine = require('./Engine');
        const path = require('path');
      `
      );

      const builder = new ImportIndexBuilder(tempDir, {
        extensions: ['.js'],
      });
      const index = await builder.buildIndex();

      const imports = index.fileToImports.get(testFile);
      expect(imports).toBeDefined();
      // Only relative require should be included
      expect(imports?.length).toBe(1);
      expect(imports).toContain(engineFile);

      // Cleanup
      await fs.remove(tempDir);
    });
  });

  describe('Filtering & Ignore Patterns', () => {
    it('should respect ignore patterns', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-ignore-'));

      // Create test files
      await fs.writeFile(path.join(tempDir, 'src.ts'), 'export class A {}');
      await fs.mkdir(path.join(tempDir, 'node_modules'));
      await fs.writeFile(path.join(tempDir, 'node_modules/dep.ts'), 'export class B {}');

      const builder = new ImportIndexBuilder(tempDir, {
        ignorePatterns: ['node_modules'],
      });
      const index = await builder.buildIndex();

      // Should only index src.ts, not node_modules
      expect(index.fileCount).toBe(1);
      expect(index.fileToImports.has(path.join(tempDir, 'src.ts'))).toBe(true);
      expect(index.fileToImports.has(path.join(tempDir, 'node_modules/dep.ts'))).toBe(false);

      // Cleanup
      await fs.remove(tempDir);
    });

    it('should filter by extensions', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-ext-'));

      await fs.writeFile(path.join(tempDir, 'file.ts'), 'export class A {}');
      await fs.writeFile(path.join(tempDir, 'file.js'), 'export class B {}');
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'Some text');

      const builder = new ImportIndexBuilder(tempDir, {
        extensions: ['.ts'],
      });
      const index = await builder.buildIndex();

      // Should only index .ts file
      expect(index.fileCount).toBe(1);
      expect(index.fileToImports.has(path.join(tempDir, 'file.ts'))).toBe(true);
      expect(index.fileToImports.has(path.join(tempDir, 'file.js'))).toBe(false);

      // Cleanup
      await fs.remove(tempDir);
    });

    it('should respect maxFiles limit', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-maxfiles-'));

      // Create 5 files
      for (let i = 0; i < 5; i++) {
        await fs.writeFile(path.join(tempDir, `file${i}.ts`), `export class C${i} {}`);
      }

      const builder = new ImportIndexBuilder(tempDir, {
        maxFiles: 3,
      });
      const index = await builder.buildIndex();

      // Should stop at 3 files
      expect(index.fileCount).toBeLessThanOrEqual(3);

      // Cleanup
      await fs.remove(tempDir);
    });
  });

  describe('Performance & Parallel Processing', () => {
    it('should process multiple files efficiently with p-limit', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'simple');
      const builder = new ImportIndexBuilder(projectPath);

      const startTime = Date.now();
      await builder.buildIndex();
      const duration = Date.now() - startTime;

      // Should complete quickly for small fixture (<500ms)
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent file processing', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'complex');
      const builder = new ImportIndexBuilder(projectPath, {
        concurrency: 5,
      });

      const index = await builder.buildIndex();

      // Should successfully process all files
      expect(index.fileCount).toBeGreaterThan(0);
      expect(index.fileToImports.size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent project path gracefully', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent-dir-12345');
      const builder = new ImportIndexBuilder(nonExistentPath);

      await expect(builder.buildIndex()).rejects.toThrow();
    });

    it('should skip unreadable files without throwing', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-unreadable-'));

      await fs.writeFile(path.join(tempDir, 'good.ts'), 'export class A {}');
      await fs.writeFile(path.join(tempDir, 'bad.ts'), 'invalid syntax {{{');

      const builder = new ImportIndexBuilder(tempDir);
      const index = await builder.buildIndex();

      // Should process good file and skip or handle bad file gracefully
      expect(index.fileCount).toBeGreaterThan(0);

      // Cleanup
      await fs.remove(tempDir);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle circular dependencies', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'circular');
      const builder = new ImportIndexBuilder(projectPath);

      const index = await builder.buildIndex();

      const fileA = path.join(projectPath, 'A.ts');
      const fileB = path.join(projectPath, 'B.ts');

      // A imports B
      const aImports = index.fileToImports.get(fileA);
      expect(aImports).toContain(fileB);

      // B imports A
      const bImports = index.fileToImports.get(fileB);
      expect(bImports).toContain(fileA);

      // Reverse: A is imported by B
      const aImporters = index.importToFiles.get(fileA);
      expect(aImporters).toContain(fileB);

      // Reverse: B is imported by A
      const bImporters = index.importToFiles.get(fileB);
      expect(bImporters).toContain(fileA);
    });

    it('should handle deep dependency chains', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'deep');
      const builder = new ImportIndexBuilder(projectPath);

      const index = await builder.buildIndex();

      const level1File = path.join(projectPath, 'Level1.ts');
      const level2File = path.join(projectPath, 'Level2.ts');
      const level3File = path.join(projectPath, 'Level3.ts');

      // Level1 → Level2 → Level3
      const level1Imports = index.fileToImports.get(level1File);
      expect(level1Imports).toContain(level2File);

      const level2Imports = index.fileToImports.get(level2File);
      expect(level2Imports).toContain(level3File);

      // Reverse: Level3 ← Level2 ← Level1
      const level3Importers = index.importToFiles.get(level3File);
      expect(level3Importers).toContain(level2File);

      const level2Importers = index.importToFiles.get(level2File);
      expect(level2Importers).toContain(level1File);
    });

    it('should handle re-exports correctly', async () => {
      const projectPath = path.join(FIXTURES_PATH, 'complex');
      const builder = new ImportIndexBuilder(projectPath);

      const index = await builder.buildIndex();

      const indexFile = path.join(projectPath, 'models/index.ts');
      const userServiceFile = path.join(projectPath, 'services/UserService.ts');

      // UserService imports from models/index
      const userServiceImports = index.fileToImports.get(userServiceFile);
      expect(userServiceImports).toBeDefined();
      expect(userServiceImports).toContain(indexFile);

      // index.ts should be in reverse map (imported by UserService)
      const indexImporters = index.importToFiles.get(indexFile);
      expect(indexImporters).toBeDefined();
      expect(indexImporters).toContain(userServiceFile);

      // Should have all 4 files
      expect(index.fileCount).toBe(4);
    });
  });
});
