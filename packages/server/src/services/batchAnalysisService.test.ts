import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { BatchAnalysisService } from './batchAnalysisService.js';
import type { BatchProgress } from '../types/batch.js';

describe('BatchAnalysisService', () => {
  let testProjectPath: string;
  let batchService: BatchAnalysisService;

  beforeEach(async () => {
    // Create temporary test directory
    testProjectPath = path.join(os.tmpdir(), `goose-test-${Date.now()}`);
    await fs.ensureDir(testProjectPath);

    // Create test project structure
    await fs.ensureDir(path.join(testProjectPath, 'src'));
    await fs.ensureDir(path.join(testProjectPath, 'tests'));
    await fs.ensureDir(path.join(testProjectPath, '.code-review'));

    // Create config file with mock API key
    const configPath = path.join(testProjectPath, '.code-review', 'config.json');
    await fs.writeJson(configPath, {
      aiProvider: 'openai',
      openai: {
        apiKey: 'test-api-key-12345',
        model: 'gpt-4',
      },
      analyzableFileExtensions: ['.js', '.ts', '.py'],
    });

    // Create test files
    await fs.writeFile(
      path.join(testProjectPath, 'src', 'index.ts'),
      'console.log("hello world");',
      'utf-8'
    );

    await fs.writeFile(
      path.join(testProjectPath, 'src', 'utils.js'),
      'function add(a, b) { return a + b; }',
      'utf-8'
    );

    await fs.writeFile(
      path.join(testProjectPath, 'README.md'),
      '# Test Project',
      'utf-8'
    );

    batchService = new BatchAnalysisService(testProjectPath);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testProjectPath);
    vi.restoreAllMocks();
  });

  describe('analyzeProject', () => {
    it('should throw error if AI is not configured', async () => {
      // Remove config file
      await fs.remove(path.join(testProjectPath, '.code-review', 'config.json'));

      await expect(batchService.analyzeProject()).rejects.toThrow(
        'AI provider not configured'
      );
    });

    it('should find all analyzable files', async () => {
      // Mock AI service methods
      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'No issues found',
        timestamp: new Date().toISOString(),
      });

      // Mock the private methods by accessing the service instances
      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      const result = await batchService.analyzeProject({ force: true });

      // Should find 2 analyzable files (.ts and .js) and skip .md
      expect(result.analyzableFiles).toBe(2);
      expect(result.totalFiles).toBeGreaterThanOrEqual(2);
    });

    it('should return list of analyzable files without analyzing', async () => {
      const { totalFiles, analyzableFiles } = await batchService.getAnalyzableFiles();

      // Should find 2 analyzable files (.ts and .js)
      expect(analyzableFiles.length).toBe(2);
      expect(totalFiles).toBeGreaterThanOrEqual(2);
      expect(analyzableFiles).toContain('src/index.ts');
      expect(analyzableFiles).toContain('src/utils.js');
      expect(analyzableFiles).not.toContain('README.md');
    });

    it('should respect directory and exclude filters in getAnalyzableFiles', async () => {
      // Create additional test files
      await fs.ensureDir(path.join(testProjectPath, 'lib'));
      await fs.writeFile(path.join(testProjectPath, 'lib', 'helper.ts'), 'code');
      await fs.writeFile(path.join(testProjectPath, 'src', 'test.spec.ts'), 'test');

      const { analyzableFiles } = await batchService.getAnalyzableFiles({
        directories: ['src'],
        excludePatterns: ['**/*.spec.ts'],
      });

      // Should find only src files, excluding spec files
      expect(analyzableFiles).toContain('src/index.ts');
      expect(analyzableFiles).not.toContain('lib/helper.ts');
      expect(analyzableFiles).not.toContain('src/test.spec.ts');
    });

    it('should skip files that are already cached', async () => {
      const filePath = 'src/index.ts';

      // Mock analyzeFile to check skip behavior based on cache
      const analyzeFileSpy = vi.spyOn(batchService as any, 'analyzeFile');
      analyzeFileSpy.mockImplementation(async (fp: unknown, force: unknown) => {
        const filePathArg = fp as string;
        const forceArg = force as boolean;

        // Simulate cache hit for specific file
        if (!forceArg && filePathArg === filePath) {
          return {
            filePath: filePathArg,
            analyzed: false,
            skipReason: 'Already cached (file not modified)',
            duration: 10,
          };
        }
        return {
          filePath: filePathArg,
          analyzed: true,
          analysis: {
            issues: [],
            summary: 'Test analysis',
            timestamp: new Date().toISOString(),
          },
          duration: 50,
        };
      });

      const result = await batchService.analyzeProject({ force: false });

      // Should skip at least one file (the cached one)
      expect(result.skippedCount).toBeGreaterThan(0);
    });

    it('should force re-analysis when force option is true', async () => {
      // Create review records for all files
      const reviewsDir = path.join(testProjectPath, '.code-review', 'reviews');
      await fs.ensureDir(reviewsDir);

      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'Forced re-analysis',
        timestamp: new Date().toISOString(),
      });

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      const result = await batchService.analyzeProject({ force: true });

      // All files should be analyzed, none skipped
      expect(result.analyzedCount).toBe(result.analyzableFiles);
      expect(result.skippedCount).toBe(0);
    });

    it('should respect concurrency option', async () => {
      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'Test analysis',
        timestamp: new Date().toISOString(),
      });

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      const result = await batchService.analyzeProject({
        force: true,
        concurrency: 3,
      });

      expect(result.analyzedCount).toBeGreaterThan(0);
    });

    it('should call progress callback during analysis', async () => {
      const progressUpdates: BatchProgress[] = [];
      const onProgress = (progress: BatchProgress) => {
        progressUpdates.push({ ...progress });
      };

      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'Test analysis',
        timestamp: new Date().toISOString(),
      });

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      await batchService.analyzeProject({
        force: true,
        onProgress,
      });

      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toHaveProperty('currentFile');
      expect(progressUpdates[0]).toHaveProperty('analyzed');
      expect(progressUpdates[0]).toHaveProperty('total');
    });

    it('should calculate summary statistics correctly', async () => {
      const mockAnalysis = {
        issues: [
          {
            severity: 'critical' as const,
            category: 'security' as const,
            line: 1,
            message: 'Critical issue',
            suggestion: 'Fix it',
          },
          {
            severity: 'high' as const,
            category: 'bug' as const,
            line: 2,
            message: 'High issue',
            suggestion: 'Fix it',
          },
          {
            severity: 'medium' as const,
            category: 'quality' as const,
            line: 3,
            message: 'Medium issue',
            suggestion: 'Fix it',
          },
        ],
        summary: 'Found 3 issues',
        timestamp: new Date().toISOString(),
      };

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: mockAnalysis,
        duration: 100,
      }));

      const result = await batchService.analyzeProject({ force: true });

      // Should calculate issue counts correctly
      // Each file gets 3 issues, 2 files total = 6 issues
      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.summary.criticalIssues).toBeGreaterThan(0);
      expect(result.summary.highIssues).toBeGreaterThan(0);
      expect(result.summary.mediumIssues).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath: unknown) => {
        const fp = filePath as string;
        if (fp.includes('index.ts')) {
          return {
            filePath: fp,
            analyzed: false,
            error: 'Failed to analyze file',
            duration: 50,
          };
        }
        return {
          filePath: fp,
          analyzed: true,
          analysis: {
            issues: [],
            summary: 'Test analysis',
            timestamp: new Date().toISOString(),
          },
          duration: 100,
        };
      });

      const result = await batchService.analyzeProject({ force: true });

      // Should have at least one error
      expect(result.errorCount).toBeGreaterThan(0);

      // Should have error details in results
      const erroredFile = result.results.find((r) => r.error);
      expect(erroredFile).toBeDefined();
      expect(erroredFile?.error).toBe('Failed to analyze file');
    });

    it('should filter by file extensions when provided', async () => {
      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'Test analysis',
        timestamp: new Date().toISOString(),
      });

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      // Only analyze .ts files
      const result = await batchService.analyzeProject({
        force: true,
        extensions: ['.ts'],
      });

      // Should only find .ts files
      const tsFiles = result.results.filter((r) => r.filePath.endsWith('.ts'));
      expect(tsFiles.length).toBe(result.analyzableFiles);
    });

    it('should filter by directories when provided', async () => {
      // Create additional test directory structure
      await fs.ensureDir(path.join(testProjectPath, 'lib'));
      await fs.writeFile(
        path.join(testProjectPath, 'lib', 'helper.js'),
        'module.exports = {};',
        'utf-8'
      );

      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'Test analysis',
        timestamp: new Date().toISOString(),
      });

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      // Only analyze src/ directory
      const result = await batchService.analyzeProject({
        force: true,
        directories: ['src'],
      });

      // Should only find files in src/
      const srcFiles = result.results.filter((r) => r.filePath.startsWith('src/'));
      expect(srcFiles.length).toBe(result.analyzableFiles);
      expect(result.analyzableFiles).toBeGreaterThan(0);
    });

    it('should filter by multiple directories when provided', async () => {
      // Create additional test directories
      await fs.ensureDir(path.join(testProjectPath, 'lib'));
      await fs.ensureDir(path.join(testProjectPath, 'utils'));

      await fs.writeFile(
        path.join(testProjectPath, 'lib', 'helper.js'),
        'module.exports = {};',
        'utf-8'
      );

      await fs.writeFile(
        path.join(testProjectPath, 'utils', 'formatter.ts'),
        'export const format = () => {};',
        'utf-8'
      );

      const mockAnalyzeCode = vi.fn().mockResolvedValue({
        issues: [],
        summary: 'Test analysis',
        timestamp: new Date().toISOString(),
      });

      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath) => ({
        filePath,
        analyzed: true,
        analysis: await mockAnalyzeCode(),
        duration: 100,
      }));

      // Only analyze src/ and lib/ directories
      const result = await batchService.analyzeProject({
        force: true,
        directories: ['src', 'lib'],
      });

      // Should find files in src/ and lib/ but not utils/
      const validFiles = result.results.filter(
        (r) => r.filePath.startsWith('src/') || r.filePath.startsWith('lib/')
      );
      expect(validFiles.length).toBe(result.analyzableFiles);

      const utilsFiles = result.results.filter((r) => r.filePath.startsWith('utils/'));
      expect(utilsFiles.length).toBe(0);
    });

    it('should exclude files matching exclude patterns', async () => {
      // Create test files
      await fs.writeFile(path.join(testProjectPath, 'src', 'app.ts'), 'code');
      await fs.writeFile(path.join(testProjectPath, 'src', 'app.test.ts'), 'test');
      await fs.ensureDir(path.join(testProjectPath, 'src', '__mocks__'));
      await fs.writeFile(path.join(testProjectPath, 'src', '__mocks__', 'mock.ts'), 'mock');

      // Mock analyzeFile to return success
      vi.spyOn(batchService as any, 'analyzeFile').mockImplementation(async (filePath: unknown) => ({
        filePath: filePath as string,
        analyzed: true,
        analysis: { issues: [], summary: 'OK', timestamp: new Date().toISOString() },
        duration: 100,
      }));

      // Exclude test files and __mocks__ directory
      const result = await batchService.analyzeProject({
        force: true,
        excludePatterns: ['**/*.test.ts', '**/__mocks__/**'],
      });

      // Should analyze app.ts but not app.test.ts or mock.ts
      const analyzedFiles = result.results.map(r => r.filePath);
      expect(analyzedFiles).toContain('src/app.ts');
      expect(analyzedFiles).not.toContain('src/app.test.ts');
      expect(analyzedFiles).not.toContain('src/__mocks__/mock.ts');
    });

    it('should save reviews that can be retrieved by ReviewService', async () => {
      const { ReviewService } = await import('./reviewService.js');

      // Create a simple test file
      await fs.writeFile(
        path.join(testProjectPath, 'src', 'test-file.ts'),
        'console.log("test");',
        'utf-8'
      );

      // Mock the AI service to return a simple analysis
      const mockAnalysis = {
        issues: [
          {
            severity: 'high' as const,
            category: 'bug' as const,
            line: 1,
            message: 'Test issue',
            suggestion: 'Fix it',
          },
        ],
        summary: 'Test analysis',
        timestamp: new Date().toISOString(),
      };

      // Mock the AIService.analyzeCode method instead
      vi.spyOn(batchService['aiService'], 'analyzeCode').mockResolvedValue(mockAnalysis);

      // Run batch analysis (without mocking analyzeFile so it actually saves)
      const batchResult = await batchService.analyzeProject({ force: true });

      console.log('Batch result:', JSON.stringify(batchResult, null, 2));
      console.log('Test project path:', testProjectPath);
      console.log('Reviews dir:', path.join(testProjectPath, '.code-review', 'reviews'));

      expect(batchResult.analyzedCount).toBeGreaterThan(0);

      // Check if reviews directory exists
      const reviewsDir = path.join(testProjectPath, '.code-review', 'reviews');
      const reviewsDirExists = await fs.pathExists(reviewsDir);
      console.log('Reviews dir exists:', reviewsDirExists);

      if (reviewsDirExists) {
        const files = await fs.readdir(reviewsDir);
        console.log('Review files:', files);
      }

      // Verify reviews can be retrieved by ReviewService
      const reviewService = new ReviewService(testProjectPath);
      const { reviews, total } = await reviewService.list();

      console.log('Retrieved reviews:', reviews);
      console.log('Total:', total);

      expect(total).toBeGreaterThan(0);
      expect(reviews.length).toBeGreaterThan(0);

      // Check that review has all required fields
      const review = reviews[0];
      expect(review).toHaveProperty('id');
      expect(review).toHaveProperty('timestamp');
      expect(review).toHaveProperty('filePath');
      expect(review).toHaveProperty('fileName');
      expect(review).toHaveProperty('analysis');
      expect(review.analysis).toHaveProperty('issues');
      expect(review.analysis).toHaveProperty('summary');
    });
  });
});
