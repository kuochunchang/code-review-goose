/**
 * Git Commands Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from '../__mocks__/vscode.js';

// Mock GitChangePanel
vi.mock('../views/git-change-panel.js', () => ({
  GitChangePanel: {
    createOrShow: vi.fn(),
  },
}));

describe('Git Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockGitAnalysisService: any;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      extensionUri: { fsPath: '/mock/path' } as any,
    } as any;

    mockGitAnalysisService = {
      isWorkingDirectoryClean: vi.fn().mockResolvedValue(false),
      getCurrentBranch: vi.fn().mockResolvedValue('main'),
      getBranches: vi.fn().mockResolvedValue(['main', 'develop', 'feature/test']),
      analyzeWorkingDirectory: vi.fn().mockResolvedValue({
        summary: {
          totalFiles: 1,
          totalIssues: 5,
        },
      }),
      analyzeBranchComparison: vi.fn().mockResolvedValue({
        summary: {
          totalFiles: 2,
          totalIssues: 10,
        },
      }),
    };

    // Reset workspace folders
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: { fsPath: '/test/workspace' },
        name: 'test-workspace',
        index: 0,
      },
    ];

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeWorkingDirectory', () => {
    it('should show error if no workspace folder', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const { analyzeWorkingDirectory } = await import('../commands/analyze-working-directory.js');
      await analyzeWorkingDirectory(mockContext, mockGitAnalysisService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder found. Please open a folder first.'
      );
    });

    it('should show info message if working directory is clean', async () => {
      mockGitAnalysisService.isWorkingDirectoryClean.mockResolvedValueOnce(true);

      const { analyzeWorkingDirectory } = await import('../commands/analyze-working-directory.js');
      await analyzeWorkingDirectory(mockContext, mockGitAnalysisService);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'No changes found in working directory.'
      );
    });

    it('should prompt user to select analysis types', async () => {
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce([
        { label: 'Quality', picked: true },
        { label: 'Security', picked: true },
      ] as any);

      vi.mocked(vscode.window.withProgress).mockImplementationOnce(async (options, task) => {
        return task({ report: vi.fn() } as any, {} as any);
      });

      const { analyzeWorkingDirectory } = await import('../commands/analyze-working-directory.js');
      await analyzeWorkingDirectory(mockContext, mockGitAnalysisService);

      expect(vscode.window.showQuickPick).toHaveBeenCalled();
    });

    it('should handle user cancellation', async () => {
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);

      const { analyzeWorkingDirectory } = await import('../commands/analyze-working-directory.js');
      await analyzeWorkingDirectory(mockContext, mockGitAnalysisService);

      expect(mockGitAnalysisService.analyzeWorkingDirectory).not.toHaveBeenCalled();
    });

    it('should perform analysis and show results', async () => {
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce([
        { label: 'Quality', picked: true },
      ] as any);

      vi.mocked(vscode.window.withProgress).mockImplementationOnce(async (options, task) => {
        return task({ report: vi.fn() } as any, {} as any);
      });

      const { analyzeWorkingDirectory } = await import('../commands/analyze-working-directory.js');
      const { GitChangePanel } = await import('../views/git-change-panel.js');

      await analyzeWorkingDirectory(mockContext, mockGitAnalysisService);

      expect(mockGitAnalysisService.analyzeWorkingDirectory).toHaveBeenCalled();
      expect(GitChangePanel.createOrShow).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Analysis complete!')
      );
    });

    it('should handle analysis errors', async () => {
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce([
        { label: 'Quality', picked: true },
      ] as any);

      mockGitAnalysisService.analyzeWorkingDirectory.mockRejectedValueOnce(
        new Error('Analysis failed')
      );

      vi.mocked(vscode.window.withProgress).mockImplementationOnce(async (options, task) => {
        return task({ report: vi.fn() } as any, {} as any);
      });

      const { analyzeWorkingDirectory } = await import('../commands/analyze-working-directory.js');
      await analyzeWorkingDirectory(mockContext, mockGitAnalysisService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Analysis failed')
      );
    });
  });

  describe('analyzeBranchComparison', () => {
    it('should show error if no workspace folder', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const { analyzeBranchComparison } = await import('../commands/analyze-branch.js');
      await analyzeBranchComparison(mockContext, mockGitAnalysisService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder found. Please open a folder first.'
      );
    });

    it('should prompt user to select target branch', async () => {
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce('develop') // Target branch
        .mockResolvedValueOnce([{ label: 'Quality', picked: true }] as any); // Analysis types

      vi.mocked(vscode.window.withProgress).mockImplementationOnce(async (options, task) => {
        return task({ report: vi.fn() } as any, {} as any);
      });

      const { analyzeBranchComparison } = await import('../commands/analyze-branch.js');
      await analyzeBranchComparison(mockContext, mockGitAnalysisService);

      expect(mockGitAnalysisService.getCurrentBranch).toHaveBeenCalled();
      expect(mockGitAnalysisService.getBranches).toHaveBeenCalled();
      expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(2);
    });

    it('should handle user cancellation at branch selection', async () => {
      vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);

      const { analyzeBranchComparison } = await import('../commands/analyze-branch.js');
      await analyzeBranchComparison(mockContext, mockGitAnalysisService);

      expect(mockGitAnalysisService.analyzeBranchComparison).not.toHaveBeenCalled();
    });

    it('should handle user cancellation at analysis type selection', async () => {
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce('develop')
        .mockResolvedValueOnce(undefined);

      const { analyzeBranchComparison } = await import('../commands/analyze-branch.js');
      await analyzeBranchComparison(mockContext, mockGitAnalysisService);

      expect(mockGitAnalysisService.analyzeBranchComparison).not.toHaveBeenCalled();
    });

    it('should perform analysis and show results', async () => {
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce('develop')
        .mockResolvedValueOnce([{ label: 'Quality', picked: true }] as any);

      vi.mocked(vscode.window.withProgress).mockImplementationOnce(async (options, task) => {
        return task({ report: vi.fn() } as any, {} as any);
      });

      const { analyzeBranchComparison } = await import('../commands/analyze-branch.js');
      const { GitChangePanel } = await import('../views/git-change-panel.js');

      await analyzeBranchComparison(mockContext, mockGitAnalysisService);

      expect(mockGitAnalysisService.analyzeBranchComparison).toHaveBeenCalled();
      expect(GitChangePanel.createOrShow).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Analysis complete!')
      );
    });

    it('should handle analysis errors', async () => {
      vi.mocked(vscode.window.showQuickPick)
        .mockResolvedValueOnce('develop')
        .mockResolvedValueOnce([{ label: 'Quality', picked: true }] as any);

      mockGitAnalysisService.analyzeBranchComparison.mockRejectedValueOnce(
        new Error('Analysis failed')
      );

      vi.mocked(vscode.window.withProgress).mockImplementationOnce(async (options, task) => {
        return task({ report: vi.fn() } as any, {} as any);
      });

      const { analyzeBranchComparison } = await import('../commands/analyze-branch.js');
      await analyzeBranchComparison(mockContext, mockGitAnalysisService);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Analysis failed')
      );
    });
  });

  describe('openGitChangePanel', () => {
    it('should show error if no workspace folder', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const { openGitChangePanel } = await import('../commands/open-git-change-panel.js');
      await openGitChangePanel(mockContext);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder found. Please open a folder first.'
      );
    });

    it('should open panel successfully', async () => {
      const { openGitChangePanel } = await import('../commands/open-git-change-panel.js');
      const { GitChangePanel } = await import('../views/git-change-panel.js');

      await openGitChangePanel(mockContext);

      expect(GitChangePanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        expect.objectContaining({
          changeSource: 'none',
          workingDirectory: '/test/workspace',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const { GitChangePanel } = await import('../views/git-change-panel.js');
      vi.mocked(GitChangePanel.createOrShow).mockImplementationOnce(() => {
        throw new Error('Panel creation failed');
      });

      const { openGitChangePanel } = await import('../commands/open-git-change-panel.js');
      await openGitChangePanel(mockContext);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open Git Change Panel')
      );
    });
  });
});

