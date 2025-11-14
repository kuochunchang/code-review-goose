import { describe, it, expect, beforeEach } from 'vitest';
import { CrossFileAnalysisService } from '../../../services/crossFileAnalysisService';
import { OOAnalysisService } from '../../../services/ooAnalysisService';
import { PathResolver } from '../../../services/pathResolver';
import path from 'path';

describe('Depth Verification - Deep Fixture', () => {
  let service: CrossFileAnalysisService;
  const fixturesDir = path.join(__dirname, '../../fixtures/cross-file/deep');

  beforeEach(() => {
    const projectPath = fixturesDir;
    const ooAnalysisService = new OOAnalysisService();
    const pathResolver = new PathResolver(projectPath);
    service = new CrossFileAnalysisService(projectPath, ooAnalysisService, pathResolver);
  });

  describe('Forward Analysis from Level1', () => {
    const level1Path = path.join(fixturesDir, 'Level1.ts');

    it('Depth 1: should only include Level1 and Level2', async () => {
      const result = await service.analyzeForward(level1Path, 1);

      console.log('\n=== DEPTH 1 FORWARD ===');
      console.log(`Total files: ${result.size}`);
      for (const [filePath, analysis] of result.entries()) {
        const fileName = path.basename(filePath);
        console.log(`  ${fileName} (depth: ${analysis.depth})`);
      }

      expect(result.size).toBe(2); // Level1 + Level2
      expect(Array.from(result.keys()).some(p => p.includes('Level1.ts'))).toBe(true);
      expect(Array.from(result.keys()).some(p => p.includes('Level2.ts'))).toBe(true);
      expect(Array.from(result.keys()).some(p => p.includes('Level3.ts'))).toBe(false);
    });

    it('Depth 2: should include Level1, Level2, and Level3', async () => {
      const result = await service.analyzeForward(level1Path, 2);

      console.log('\n=== DEPTH 2 FORWARD ===');
      console.log(`Total files: ${result.size}`);
      for (const [filePath, analysis] of result.entries()) {
        const fileName = path.basename(filePath);
        console.log(`  ${fileName} (depth: ${analysis.depth})`);
      }

      expect(result.size).toBe(3); // Level1 + Level2 + Level3
      expect(Array.from(result.keys()).some(p => p.includes('Level1.ts'))).toBe(true);
      expect(Array.from(result.keys()).some(p => p.includes('Level2.ts'))).toBe(true);
      expect(Array.from(result.keys()).some(p => p.includes('Level3.ts'))).toBe(true);
    });

    it('Depth 3: should include all three levels (same as depth 2)', async () => {
      const result = await service.analyzeForward(level1Path, 3);

      console.log('\n=== DEPTH 3 FORWARD ===');
      console.log(`Total files: ${result.size}`);
      for (const [filePath, analysis] of result.entries()) {
        const fileName = path.basename(filePath);
        console.log(`  ${fileName} (depth: ${analysis.depth})`);
      }

      expect(result.size).toBe(3); // Level1 + Level2 + Level3 (no more deps)
      expect(Array.from(result.keys()).some(p => p.includes('Level1.ts'))).toBe(true);
      expect(Array.from(result.keys()).some(p => p.includes('Level2.ts'))).toBe(true);
      expect(Array.from(result.keys()).some(p => p.includes('Level3.ts'))).toBe(true);
    });
  });

  describe('Bidirectional Analysis from Level1', () => {
    const level1Path = path.join(fixturesDir, 'Level1.ts');

    it('Depth 1: should only include Level1 and Level2 in forwardDeps', async () => {
      const result = await service.analyzeBidirectional(level1Path, 1);

      console.log('\n=== DEPTH 1 BIDIRECTIONAL ===');
      console.log(`Total files: ${result.stats.totalFiles}`);
      console.log(`Total classes: ${result.stats.totalClasses}`);
      console.log(`Forward deps: ${result.forwardDeps.length}`);
      console.log(`Reverse deps: ${result.reverseDeps.length}`);

      console.log('\nForward dependencies:');
      result.forwardDeps.forEach(dep => {
        const fileName = path.basename(dep.filePath);
        console.log(`  ${fileName} (depth: ${dep.depth})`);
      });

      console.log('\nAll classes:');
      result.allClasses.forEach(cls => {
        console.log(`  - ${cls.name}`);
      });

      // Should have Level2 only (Level1 is target, excluded from forwardDeps)
      expect(result.forwardDeps.length).toBe(1);
      expect(result.forwardDeps.some(dep => dep.filePath.includes('Level2.ts'))).toBe(true);
      expect(result.forwardDeps.some(dep => dep.filePath.includes('Level3.ts'))).toBe(false);

      // Should have 2 classes total (Level1 + Level2)
      expect(result.stats.totalClasses).toBe(2);
      expect(result.allClasses.some(cls => cls.name === 'Level1')).toBe(true);
      expect(result.allClasses.some(cls => cls.name === 'Level2')).toBe(true);
      expect(result.allClasses.some(cls => cls.name === 'Level3')).toBe(false);
    });

    it('Depth 2: should include all three levels', async () => {
      const result = await service.analyzeBidirectional(level1Path, 2);

      console.log('\n=== DEPTH 2 BIDIRECTIONAL ===');
      console.log(`Total files: ${result.stats.totalFiles}`);
      console.log(`Total classes: ${result.stats.totalClasses}`);
      console.log(`Forward deps: ${result.forwardDeps.length}`);

      console.log('\nForward dependencies:');
      result.forwardDeps.forEach(dep => {
        const fileName = path.basename(dep.filePath);
        console.log(`  ${fileName} (depth: ${dep.depth})`);
      });

      console.log('\nAll classes:');
      result.allClasses.forEach(cls => {
        console.log(`  - ${cls.name}`);
      });

      // Should have Level2 and Level3 (Level1 is target)
      expect(result.forwardDeps.length).toBe(2);
      expect(result.forwardDeps.some(dep => dep.filePath.includes('Level2.ts'))).toBe(true);
      expect(result.forwardDeps.some(dep => dep.filePath.includes('Level3.ts'))).toBe(true);

      // Should have 3 classes total
      expect(result.stats.totalClasses).toBe(3);
      expect(result.allClasses.some(cls => cls.name === 'Level1')).toBe(true);
      expect(result.allClasses.some(cls => cls.name === 'Level2')).toBe(true);
      expect(result.allClasses.some(cls => cls.name === 'Level3')).toBe(true);
    });

    it('Depth 3: should include all three levels (same as depth 2)', async () => {
      const result = await service.analyzeBidirectional(level1Path, 3);

      console.log('\n=== DEPTH 3 BIDIRECTIONAL ===');
      console.log(`Total files: ${result.stats.totalFiles}`);
      console.log(`Total classes: ${result.stats.totalClasses}`);

      console.log('\nAll classes:');
      result.allClasses.forEach(cls => {
        console.log(`  - ${cls.name}`);
      });

      // Same as depth 2 since there are only 3 levels
      expect(result.stats.totalClasses).toBe(3);
      expect(result.allClasses.some(cls => cls.name === 'Level1')).toBe(true);
      expect(result.allClasses.some(cls => cls.name === 'Level2')).toBe(true);
      expect(result.allClasses.some(cls => cls.name === 'Level3')).toBe(true);
    });
  });
});
