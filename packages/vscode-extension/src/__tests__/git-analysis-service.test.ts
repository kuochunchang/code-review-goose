/**
 * Git Analysis Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitAnalysisService } from '../services/git-analysis-service.js';
import type * as vscode from 'vscode';

// Mock git-analyzer
vi.mock('@code-review-goose/git-analyzer', () => ({
  GitService: vi.fn().mockImplementation(() => ({
    getWorkingDirectoryChanges: vi.fn().mockResolvedValue({
      files: [
        {
          path: 'test.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          diff: 'mock diff',
        },
      ],
      summary: {
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 5,
      },
    }),
    compareBranches: vi.fn().mockResolvedValue({
      files: [
        {
          path: 'test.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          diff: 'mock diff',
        },
      ],
      summary: {
        totalFiles: 1,
        totalAdditions: 10,
        totalDeletions: 5,
      },
    }),
    getCurrentBranch: vi.fn().mockResolvedValue('main'),
    isClean: vi.fn().mockResolvedValue(false),
    getRepoRoot: vi.fn().mockResolvedValue('/repo'),
    git: {
      cwd: vi.fn().mockReturnThis(),
      branch: vi.fn().mockResolvedValue({
        all: ['main', 'develop', 'feature/test'],
      }),
    },
  })),
  ChangeAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeWorkingDirectory: vi.fn().mockResolvedValue({
      fileAnalyses: [
        {
          file: 'test.ts',
          changeType: 'feature',
          issues: [
            {
              source: 'ai',
              severity: 'medium',
              type: 'code-smell',
              file: 'test.ts',
              line: 10,
              message: 'Test issue',
              description: 'Test description',
            },
          ],
          summary: 'Test summary',
          linesChanged: 15,
          qualityScore: 85,
        },
      ],
      summary: {
        totalFiles: 1,
        totalIssues: 1,
        bySeverity: { medium: 1 },
        byType: { 'code-smell': 1 },
      },
    }),
    analyzeBranchComparison: vi.fn().mockResolvedValue({
      fileAnalyses: [
        {
          file: 'test.ts',
          changeType: 'feature',
          issues: [
            {
              source: 'ai',
              severity: 'medium',
              type: 'code-smell',
              file: 'test.ts',
              line: 10,
              message: 'Test issue',
              description: 'Test description',
            },
          ],
          summary: 'Test summary',
          linesChanged: 15,
          qualityScore: 85,
        },
      ],
      summary: {
        totalFiles: 1,
        totalIssues: 1,
        bySeverity: { medium: 1 },
        byType: { 'code-smell': 1 },
      },
    }),
  })),
  MergeService: vi.fn().mockImplementation(() => ({
    merge: vi.fn().mockReturnValue({
      fileAnalyses: [
        {
          file: 'test.ts',
          changeType: 'feature',
          issues: [
            {
              source: 'ai',
              severity: 'medium',
              type: 'code-smell',
              file: 'test.ts',
              line: 10,
              message: 'Test issue',
              description: 'Test description',
            },
          ],
          summary: 'Test summary',
          linesChanged: 15,
          qualityScore: 85,
        },
      ],
      summary: {
        totalFiles: 1,
        totalIssues: 1,
        bySeverity: { medium: 1 },
        byType: { 'code-smell': 1 },
        bySource: { ai: 1 },
        qualityScore: 85,
        riskLevel: 'low',
        deduplicationInfo: {
          originalTotal: 1,
          duplicatesRemoved: 0,
          finalTotal: 1,
        },
      },
      impactAnalysis: {
        riskLevel: 'low',
        affectedModules: ['test'],
        breakingChanges: [],
        migrationRequired: false,
      },
      changes: {
        files: [],
        summary: {
          totalFiles: 1,
          totalAdditions: 10,
          totalDeletions: 5,
        },
      },
    }),
  })),
  ReportExporter: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockResolvedValue(undefined),
  })),
  AnalysisOrchestrator: vi.fn().mockImplementation(() => ({})),
  AnalysisMode: {
    HYBRID: 'hybrid',
    AI_ONLY: 'ai-only',
    SONARQUBE_ONLY: 'sonarqube-only',
  },
}));

// Mock provider factory
vi.mock('../services/providers/provider-factory.js', () => ({
  getAIProvider: vi.fn().mockResolvedValue({
    analyze: vi.fn().mockResolvedValue('Mock analysis result'),
  }),
}));

describe('GitAnalysisService', () => {
  let service: GitAnalysisService;
  let mockContext: vscode.ExtensionContext;

  beforeEach(async () => {
    mockContext = {
      subscriptions: [],
      extensionUri: { fsPath: '/mock/path' } as any,
    } as any;

    service = new GitAnalysisService(mockContext);
    await service.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const newService = new GitAnalysisService(mockContext);
      await expect(newService.initialize()).resolves.not.toThrow();
    });

    it('should throw error if AI provider initialization fails', async () => {
      const { getAIProvider } = await import('../services/providers/provider-factory.js');
      vi.mocked(getAIProvider).mockRejectedValueOnce(new Error('Provider init failed'));

      const newService = new GitAnalysisService(mockContext);
      await expect(newService.initialize()).rejects.toThrow(
        'Failed to initialize Git Analysis Service'
      );
    });
  });

  describe('analyzeWorkingDirectory', () => {
    it('should analyze working directory changes successfully', async () => {
      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality', 'security'] as any[],
      };

      const progressCallback = vi.fn();
      const result = await service.analyzeWorkingDirectory(config, progressCallback);

      expect(result).toBeDefined();
      expect(result.summary.totalFiles).toBe(1);
      expect(result.summary.totalIssues).toBe(1);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should throw error if service not initialized', async () => {
      const uninitializedService = new GitAnalysisService(mockContext);
      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality'] as any[],
      };

      await expect(uninitializedService.analyzeWorkingDirectory(config)).rejects.toThrow(
        'Git Analysis Service not initialized'
      );
    });

    it('should throw error if no changes found', async () => {
      // Create a new service instance with a fresh mock
      const newService = new GitAnalysisService(mockContext);
      await newService.initialize();

      // Mock GitService to return empty changes
      const gitServiceMock = (newService as any).gitService;
      gitServiceMock.getWorkingDirectoryChanges = vi.fn().mockResolvedValue({
        files: [],
        summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      });

      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality'] as any[],
      };

      await expect(newService.analyzeWorkingDirectory(config)).rejects.toThrow(
        'No changes found in working directory'
      );
    });

    it('should call progress callback with correct messages', async () => {
      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality'] as any[],
      };

      const progressCallback = vi.fn();
      await service.analyzeWorkingDirectory(config, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith('Checking working directory changes...', 10);
      expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Found'), 20);
      expect(progressCallback).toHaveBeenCalledWith('Analyzing changes with AI...', 30);
      expect(progressCallback).toHaveBeenCalledWith('Merging analysis results...', 80);
      expect(progressCallback).toHaveBeenCalledWith('Analysis complete!', 100);
    });
  });

  describe('analyzeBranchComparison', () => {
    it('should analyze branch comparison successfully', async () => {
      const config = {
        workingDirectory: '/test/repo',
        sourceBranch: 'main',
        targetBranch: 'develop',
        analysisTypes: ['quality', 'security'] as any[],
      };

      const progressCallback = vi.fn();
      const result = await service.analyzeBranchComparison(config, progressCallback);

      expect(result).toBeDefined();
      expect(result.summary.totalFiles).toBe(1);
      expect(result.summary.totalIssues).toBe(1);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should throw error if service not initialized', async () => {
      const uninitializedService = new GitAnalysisService(mockContext);
      const config = {
        workingDirectory: '/test/repo',
        sourceBranch: 'main',
        targetBranch: 'develop',
        analysisTypes: ['quality'] as any[],
      };

      await expect(uninitializedService.analyzeBranchComparison(config)).rejects.toThrow(
        'Git Analysis Service not initialized'
      );
    });

    it('should throw error if no differences found', async () => {
      // Create a new service instance with a fresh mock
      const newService = new GitAnalysisService(mockContext);
      await newService.initialize();

      // Mock GitService to return empty changes
      const gitServiceMock = (newService as any).gitService;
      gitServiceMock.compareBranches = vi.fn().mockResolvedValue({
        files: [],
        summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
      });

      const config = {
        workingDirectory: '/test/repo',
        sourceBranch: 'main',
        targetBranch: 'develop',
        analysisTypes: ['quality'] as any[],
      };

      await expect(newService.analyzeBranchComparison(config)).rejects.toThrow(
        'No differences found between'
      );
    });

    it('should call progress callback with correct messages', async () => {
      const config = {
        workingDirectory: '/test/repo',
        sourceBranch: 'main',
        targetBranch: 'develop',
        analysisTypes: ['quality'] as any[],
      };

      const progressCallback = vi.fn();
      await service.analyzeBranchComparison(config, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith('Comparing branches...', 10);
      expect(progressCallback).toHaveBeenCalledWith(expect.stringContaining('Found'), 20);
      expect(progressCallback).toHaveBeenCalledWith('Analyzing changes with AI...', 30);
      expect(progressCallback).toHaveBeenCalledWith('Merging analysis results...', 80);
      expect(progressCallback).toHaveBeenCalledWith('Analysis complete!', 100);
    });
  });

  describe('exportResult', () => {
    it('should export result successfully', async () => {
      const mockResult = {
        fileAnalyses: [],
        summary: {
          totalFiles: 0,
          totalIssues: 0,
          bySeverity: {},
          byType: {},
          bySource: {},
          qualityScore: 100,
          riskLevel: 'low' as const,
          deduplicationInfo: {
            originalTotal: 0,
            duplicatesRemoved: 0,
            finalTotal: 0,
          },
        },
        impactAnalysis: {
          riskLevel: 'low' as const,
          affectedModules: [],
          breakingChanges: [],
          migrationRequired: false,
        },
        changes: {
          files: [],
          summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
        },
      };

      await expect(
        service.exportResult(mockResult, 'markdown', '/test/output.md')
      ).resolves.not.toThrow();
    });

    it('should handle export errors', async () => {
      // Create a new service instance with a fresh mock
      const newService = new GitAnalysisService(mockContext);
      await newService.initialize();

      // Mock ReportExporter to throw error
      const reportExporterMock = (newService as any).reportExporter;
      reportExporterMock.export = vi.fn().mockRejectedValue(new Error('Export failed'));

      const mockResult = {
        fileAnalyses: [],
        summary: {
          totalFiles: 0,
          totalIssues: 0,
          bySeverity: {},
          byType: {},
          bySource: {},
          qualityScore: 100,
          riskLevel: 'low' as const,
          deduplicationInfo: {
            originalTotal: 0,
            duplicatesRemoved: 0,
            finalTotal: 0,
          },
        },
        impactAnalysis: {
          riskLevel: 'low' as const,
          affectedModules: [],
          breakingChanges: [],
          migrationRequired: false,
        },
        changes: {
          files: [],
          summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
        },
      };

      await expect(newService.exportResult(mockResult, 'markdown', '/test/output.md')).rejects.toThrow(
        'Failed to export report'
      );
    });
  });

  describe('getCurrentBranch', () => {
    it('should get current branch name', async () => {
      const branch = await service.getCurrentBranch('/test/repo');
      expect(branch).toBe('main');
    });
  });

  describe('isWorkingDirectoryClean', () => {
    it('should check if working directory is clean', async () => {
      const isClean = await service.isWorkingDirectoryClean('/test/repo');
      expect(isClean).toBe(false);
    });
  });

  describe('getRepoRoot', () => {
    it('should get repository root path', async () => {
      const root = await service.getRepoRoot('/test/repo');
      expect(root).toBe('/repo');
    });
  });

  describe('getBranches', () => {
    it('should get list of branches', async () => {
      const branches = await service.getBranches('/test/repo');
      expect(branches).toEqual(['main', 'develop', 'feature/test']);
    });
  });

  describe('dispose', () => {
    it('should dispose resources without errors', () => {
      expect(() => service.dispose()).not.toThrow();
    });
  });
});

