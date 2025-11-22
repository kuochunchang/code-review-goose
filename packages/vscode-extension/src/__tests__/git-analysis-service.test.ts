/**
 * Git Analysis Service Tests (SonarQube-only mode)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitAnalysisService } from '../services/git-analysis-service.js';
import type * as vscode from 'vscode';

// Mock git-analyzer
const mockGitServiceInstance = {
  getWorkingDirectoryChanges: vi.fn().mockResolvedValue({
    files: [
      {
        path: 'test.ts',
        status: 'modified',
        linesAdded: 10,
        linesDeleted: 5,
        diff: 'mock diff',
      },
    ],
    summary: {
      filesChanged: 1,
      insertions: 10,
      deletions: 5,
    },
  }),
  compareBranches: vi.fn().mockResolvedValue({
    files: [
      {
        path: 'test.ts',
        status: 'modified',
        linesAdded: 10,
        linesDeleted: 5,
        diff: 'mock diff',
      },
    ],
    summary: {
      filesChanged: 1,
      insertions: 10,
      deletions: 5,
    },
  }),
  getCurrentBranch: vi.fn().mockResolvedValue('main'),
  isClean: vi.fn().mockResolvedValue(false),
  getRepoRoot: vi.fn().mockResolvedValue('/repo'),
  getGitRoot: vi.fn().mockResolvedValue('/repo'),
  getBranches: vi.fn().mockResolvedValue({
    all: ['main', 'develop', 'feature/test'],
    current: 'main',
    local: ['main', 'develop', 'feature/test'],
    remote: [],
  }),
};

const mockSonarQubeServiceInstance = {
  testConnection: vi.fn().mockResolvedValue({ success: true }),
  executeScan: vi.fn().mockResolvedValue({
    success: true,
    taskId: 'mock-task-id',
  }),
  waitForAnalysis: vi.fn().mockResolvedValue(undefined),
};

const mockOrchestratorInstance = {
  detectMode: vi.fn().mockResolvedValue({
    mode: 'sonarqube-only',
    sonarQubeAvailable: true,
    aiProviderAvailable: false,
  }),
  getMode: vi.fn().mockReturnValue('sonarqube-only'),
  isSonarQubeAvailable: vi.fn().mockReturnValue(true),
};

vi.mock('@code-review-goose/git-analyzer', () => ({
  GitService: vi.fn().mockImplementation(() => mockGitServiceInstance),
  MergeService: vi.fn().mockImplementation(() => ({
    merge: vi.fn().mockReturnValue({
      changeType: 'working-directory',
      fileAnalyses: [
        {
          file: 'test.ts',
          changeType: 'unknown',
          issues: [],
          summary: 'File changed',
          linesChanged: 15,
        },
      ],
      summary: {
        filesChanged: 1,
        insertions: 10,
        deletions: 5,
      },
      impactAnalysis: {
        riskLevel: 'low',
        affectedModules: [],
        breakingChanges: [],
        testingRecommendations: [],
        deploymentRisks: [],
        qualityScore: 100,
      },
      timestamp: new Date().toISOString(),
      duration: 0,
    }),
  })),
  ReportExporter: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockReturnValue('# Mock Report'),
  })),
  AnalysisOrchestrator: vi.fn().mockImplementation(() => mockOrchestratorInstance),
  SonarQubeService: vi.fn().mockImplementation(() => mockSonarQubeServiceInstance),
}));

// Mock SonarQubeConfigService
const mockSonarQubeConfigService = {
  getAnalysisMode: vi.fn().mockReturnValue('sonarqube-only'),
  isEnabled: vi.fn().mockReturnValue(true),
  getSonarQubeConfig: vi.fn().mockResolvedValue({
    serverUrl: 'http://localhost:9000',
    token: 'mock-token',
    projectKey: 'test-project',
    projectName: 'Test Project',
    timeout: 3000,
  }),
};

vi.mock('../services/sonarqube-config-service.js', () => ({
  SonarQubeConfigService: vi.fn().mockImplementation(() => mockSonarQubeConfigService),
}));

// Mock fetch for SonarQube API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({
    issues: [],
    component: { measures: [] },
    projectStatus: { status: 'OK', conditions: [] },
  }),
}) as any;

describe('GitAnalysisService (SonarQube-only)', () => {
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
    it('should initialize successfully with SonarQube enabled', async () => {
      const newService = new GitAnalysisService(mockContext);
      await expect(newService.initialize()).resolves.not.toThrow();
    });

    it('should skip SonarQube initialization when disabled', async () => {
      const newService = new GitAnalysisService(mockContext);

      // Override config service to return disabled
      (newService as any).sonarQubeConfigService = {
        getAnalysisMode: vi.fn().mockReturnValue('sonarqube-only'),
        isEnabled: vi.fn().mockReturnValue(false),
        getSonarQubeConfig: vi.fn().mockResolvedValue(null),
      };

      await expect(newService.initialize()).resolves.not.toThrow();
    });
  });

  describe('analyzeWorkingDirectory', () => {
    it('should throw error when SonarQube is not available', async () => {
      const newService = new GitAnalysisService(mockContext);

      // Override orchestrator to return not available
      (newService as any).orchestrator = {
        detectMode: vi.fn().mockResolvedValue({
          mode: 'sonarqube-only',
          sonarQubeAvailable: false,
        }),
        getMode: vi.fn().mockReturnValue('sonarqube-only'),
        isSonarQubeAvailable: vi.fn().mockReturnValue(false),
      };

      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality'] as any[],
      };

      await expect(newService.analyzeWorkingDirectory(config)).rejects.toThrow(
        'SonarQube is not available'
      );
    });

    it('should analyze working directory with SonarQube successfully', async () => {
      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality', 'security'] as any[],
      };

      const progressCallback = vi.fn();
      const result = await service.analyzeWorkingDirectory(config, progressCallback);

      expect(result).toBeDefined();
      expect(result.summary.filesChanged).toBe(1);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should call progress callback with correct messages', async () => {
      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality'] as any[],
      };

      const progressCallback = vi.fn();
      await service.analyzeWorkingDirectory(config, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith('Checking working directory changes...', 10);
      expect(progressCallback).toHaveBeenCalledWith('Analyzing with SonarQube...', 50);
      expect(progressCallback).toHaveBeenCalledWith('Preparing analysis results...', 80);
      expect(progressCallback).toHaveBeenCalledWith('Analysis complete!', 100);
    });

    it('should throw error when SonarQube analysis fails', async () => {
      const newService = new GitAnalysisService(mockContext);
      await newService.initialize();

      // Mock SonarQube to fail
      const { SonarQubeService } = await import('@code-review-goose/git-analyzer');
      vi.mocked(SonarQubeService).mockImplementationOnce(() => ({
        testConnection: vi.fn().mockResolvedValue({ success: false, error: 'Connection failed' }),
        executeScan: vi.fn(),
        waitForAnalysis: vi.fn(),
      }) as any);

      const config = {
        workingDirectory: '/test/repo',
        analysisTypes: ['quality'] as any[],
      };

      await expect(newService.analyzeWorkingDirectory(config)).rejects.toThrow('SonarQube');
    });
  });

  describe('analyzeBranchComparison', () => {
    it('should throw error when SonarQube is not available', async () => {
      const newService = new GitAnalysisService(mockContext);

      // Override orchestrator to return not available
      (newService as any).orchestrator = {
        detectMode: vi.fn().mockResolvedValue({
          mode: 'sonarqube-only',
          sonarQubeAvailable: false,
        }),
        getMode: vi.fn().mockReturnValue('sonarqube-only'),
        isSonarQubeAvailable: vi.fn().mockReturnValue(false),
      };

      const config = {
        workingDirectory: '/test/repo',
        sourceBranch: 'main',
        targetBranch: 'develop',
        analysisTypes: ['quality'] as any[],
      };

      await expect(newService.analyzeBranchComparison(config)).rejects.toThrow(
        'SonarQube is not available'
      );
    });

    it('should analyze branch comparison with SonarQube successfully', async () => {
      const config = {
        workingDirectory: '/test/repo',
        sourceBranch: 'main',
        targetBranch: 'develop',
        analysisTypes: ['quality', 'security'] as any[],
      };

      const progressCallback = vi.fn();
      const result = await service.analyzeBranchComparison(config, progressCallback);

      expect(result).toBeDefined();
      expect(result.summary.filesChanged).toBe(1);
      expect(progressCallback).toHaveBeenCalled();
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
      expect(progressCallback).toHaveBeenCalledWith('Analyzing with SonarQube...', 50);
      expect(progressCallback).toHaveBeenCalledWith('Preparing analysis results...', 80);
      expect(progressCallback).toHaveBeenCalledWith('Analysis complete!', 100);
    });
  });

  describe('exportResult', () => {
    it('should export result successfully', async () => {
      const mockResult = {
        changeType: 'working-directory' as const,
        fileAnalyses: [],
        summary: {
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
        },
        impactAnalysis: {
          riskLevel: 'low' as const,
          affectedModules: [],
          breakingChanges: [],
          testingRecommendations: [],
          deploymentRisks: [],
          qualityScore: 100,
        },
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      await expect(
        service.exportResult(mockResult, 'markdown', '/tmp/test-output.md')
      ).resolves.not.toThrow();
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
