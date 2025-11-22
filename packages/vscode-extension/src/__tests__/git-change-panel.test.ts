/**
 * Git Change Panel Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitChangePanel } from '../views/git-change-panel.js';
import * as vscode from '../__mocks__/vscode.js';
import type { MergedAnalysisResult } from '@code-review-goose/git-analyzer';

// Mock ReportExporter
vi.mock('@code-review-goose/git-analyzer', () => ({
  ReportExporter: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockReturnValue('# Mock Report Content'),
  })),
}));

describe('GitChangePanel', () => {
  let mockPanel: any;
  let mockExtensionUri: vscode.Uri;
  let mockData: any;

  beforeEach(() => {
    mockPanel = {
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn((_callback: (message: any) => void) => {
          // Store callback so it can be accessed via mock.calls[0][0]
          return { dispose: vi.fn() };
        }),
        postMessage: vi.fn(),
        asWebviewUri: vi.fn((uri: any) => uri),
      },
      onDidDispose: vi.fn(),
      reveal: vi.fn(),
      dispose: vi.fn(),
      title: '',
    };

    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel);

    mockExtensionUri = { fsPath: '/mock/extension' } as any;

    mockData = {
      changeSource: 'working-directory' as const,
      workingDirectory: '/test/repo',
    };

    // Reset singleton
    (GitChangePanel as any).currentPanel = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrShow', () => {
    it('should create new panel if none exists', () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'gooseCodeReview.gitChangePanel',
        'Git Change Analysis',
        expect.any(Number),
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true,
        })
      );
    });

    it('should reveal existing panel instead of creating new one', () => {
      // Create first panel
      GitChangePanel.createOrShow(mockExtensionUri, mockData);
      const firstCallCount = vi.mocked(vscode.window.createWebviewPanel).mock.calls.length;

      // Try to create second panel
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      // Should not create new panel
      expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(firstCallCount);
      expect(mockPanel.reveal).toHaveBeenCalled();
    });

    it('should update existing panel with new data', () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      const newData = {
        ...mockData,
        result: {
          fileAnalyses: [
            {
              file: 'test.ts',
              changeType: 'feature',
              issues: [],
              summary: 'Test summary',
              linesChanged: 15,
              qualityScore: 85,
            },
          ],
          summary: {
            totalFiles: 1,
            totalIssues: 0,
            bySeverity: {},
            byType: {},
            bySource: {},
            qualityScore: 85,
            riskLevel: 'low',
            deduplicationInfo: {
              originalTotal: 0,
              duplicatesRemoved: 0,
              finalTotal: 0,
            },
          },
          impactAnalysis: {
            riskLevel: 'low',
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
            qualityScore: 85,
          },
          changes: {
            files: [],
            summary: { totalFiles: 1, totalAdditions: 10, totalDeletions: 5 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, newData);

      expect(mockPanel.reveal).toHaveBeenCalled();
    });
  });

  describe('webview content', () => {
    it('should show empty state when no result', () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      expect(mockPanel.webview.html).toContain('No analysis results yet');
      expect(mockPanel.webview.html).toContain('Git Change Analysis');
    });

    it('should show analysis results when available', () => {
      const dataWithResult = {
        ...mockData,
        result: {
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
            summary: { totalFiles: 1, totalAdditions: 10, totalDeletions: 5 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithResult);

      expect(mockPanel.webview.html).toContain('Total Issues');
      expect(mockPanel.webview.html).toContain('Files Changed');
      expect(mockPanel.webview.html).toContain('Quality Score');
      expect(mockPanel.webview.html).toContain('Risk Level');
      expect(mockPanel.webview.html).toContain('test.ts');
      expect(mockPanel.webview.html).toContain('Test issue');
    });

    it('should show branch comparison subtitle', () => {
      const dataWithBranches = {
        ...mockData,
        changeSource: 'branch-comparison' as const,
        sourceBranch: 'main',
        targetBranch: 'develop',
        result: {
          fileAnalyses: [],
          summary: {
            totalFiles: 0,
            totalIssues: 0,
            bySeverity: {},
            byType: {},
            bySource: {},
            qualityScore: 100,
            riskLevel: 'low',
            deduplicationInfo: {
              originalTotal: 0,
              duplicatesRemoved: 0,
              finalTotal: 0,
            },
          },
          impactAnalysis: {
            riskLevel: 'low',
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
          },
          changes: {
            files: [],
            summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithBranches);

      expect(mockPanel.webview.html).toContain('main → develop');
    });
  });

  describe('message handling', () => {
    it('should handle openFile message with absolute path', async () => {
      const dataWithResult = {
        ...mockData,
        result: {
          fileAnalyses: [
            {
              file: 'test.ts',
              changeType: 'feature',
              issues: [
                {
                  source: 'ai',
                  severity: 'medium',
                  type: 'code-smell',
                  file: '/test/file.ts',
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
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
            qualityScore: 85,
          },
          changes: {
            files: [],
            summary: { totalFiles: 1, totalAdditions: 10, totalDeletions: 5 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithResult);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      const mockUri = vscode.Uri.file('/test/file.ts');
      const mockDocument = { uri: mockUri, languageId: 'typescript', fileName: 'file.ts', getText: vi.fn(() => '') };
      const mockEditor = { selection: {} as any, revealRange: vi.fn() };

      vi.mocked(vscode.Uri.file).mockReturnValue(mockUri);
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument as any);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockEditor as any);

      // Call _handleMessage directly to ensure proper this context
      await (panelInstance as any)._handleMessage({
        command: 'openFile',
        file: '/test/file.ts',
        line: 10,
      });

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });

    it('should handle openFile message with relative path (SonarQube case)', async () => {
      const dataWithResult = {
        ...mockData,
        workingDirectory: '/test/repo',
        result: {
          fileAnalyses: [
            {
              file: 'scripts/split_repositories.py',
              changeType: 'feature',
              issues: [
                {
                  source: 'sonarqube',
                  severity: 'medium',
                  type: 'code-smell',
                  file: 'scripts/split_repositories.py',
                  line: 18,
                  message: 'Define a constant instead of duplicating this literal',
                  description: 'SonarQube code smell',
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
            bySource: { sonarqube: 1 },
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
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
            qualityScore: 85,
          },
          changes: {
            files: [],
            summary: { totalFiles: 1, totalAdditions: 10, totalDeletions: 5 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithResult);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      const expectedPath = '/test/repo/scripts/split_repositories.py';
      const mockUri = vscode.Uri.file(expectedPath);
      const mockDocument = { uri: mockUri, languageId: 'python', fileName: 'split_repositories.py', getText: vi.fn(() => '') };
      const mockEditor = { selection: {} as any, revealRange: vi.fn() };

      vi.mocked(vscode.Uri.file).mockReturnValue(mockUri);
      vi.mocked(vscode.workspace.openTextDocument).mockResolvedValueOnce(mockDocument as any);
      vi.mocked(vscode.window.showTextDocument).mockResolvedValueOnce(mockEditor as any);

      // Call _handleMessage directly with relative path (as SonarQube provides)
      await (panelInstance as any)._handleMessage({
        command: 'openFile',
        file: 'scripts/split_repositories.py',
        line: 18,
      });

      // Verify that the file was opened with the absolute path
      expect(vscode.Uri.file).toHaveBeenCalledWith(expectedPath);
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });

    it('should handle exportReport message', async () => {
      const dataWithResult = {
        ...mockData,
        result: {
          fileAnalyses: [],
          summary: {
            totalFiles: 0,
            totalIssues: 0,
            bySeverity: {},
            byType: {},
            bySource: {},
            qualityScore: 100,
            riskLevel: 'low',
            deduplicationInfo: {
              originalTotal: 0,
              duplicatesRemoved: 0,
              finalTotal: 0,
            },
          },
          impactAnalysis: {
            riskLevel: 'low',
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
            qualityScore: 100,
          },
          changes: {
            files: [],
            summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithResult);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      const mockUri = vscode.Uri.file('/test/report.md');
      vi.mocked(vscode.Uri.file).mockReturnValue(mockUri);
      vi.mocked(vscode.window.showSaveDialog).mockResolvedValueOnce(mockUri);
      vi.mocked(vscode.workspace.fs.writeFile).mockResolvedValueOnce();

      // Call _handleMessage directly to ensure proper this context
      await (panelInstance as any)._handleMessage({
        command: 'exportReport',
        format: 'markdown',
      });

      expect(vscode.window.showSaveDialog).toHaveBeenCalled();
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Report exported')
      );
    });

    it('should show warning when exporting without result', async () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      // Call _handleMessage directly to ensure proper this context
      await (panelInstance as any)._handleMessage({
        command: 'exportReport',
        format: 'markdown',
      });

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No analysis result to export'
      );
    });

    it('should handle copyToClipboard message', async () => {
      const dataWithResult = {
        ...mockData,
        result: {
          fileAnalyses: [],
          summary: {
            totalFiles: 0,
            totalIssues: 0,
            bySeverity: {},
            byType: {},
            bySource: {},
            qualityScore: 100,
            riskLevel: 'low',
            deduplicationInfo: {
              originalTotal: 0,
              duplicatesRemoved: 0,
              finalTotal: 0,
            },
          },
          impactAnalysis: {
            riskLevel: 'low',
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
            qualityScore: 100,
          },
          changes: {
            files: [],
            summary: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithResult);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      vi.mocked(vscode.env.clipboard.writeText).mockResolvedValueOnce();

      // Call _handleMessage directly to ensure proper this context
      await (panelInstance as any)._handleMessage({
        command: 'copyToClipboard',
        format: 'markdown',
      });

      expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Copied MARKDOWN to clipboard')
      );
    });

    it('should show warning when copying without result', async () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      // Call _handleMessage directly to ensure proper this context
      await (panelInstance as any)._handleMessage({
        command: 'copyToClipboard',
        format: 'json',
      });

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No analysis result to copy'
      );
    });

    it('should handle refresh message', async () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      // Get the panel instance to call _handleMessage directly
      const panelInstance = (GitChangePanel as any).currentPanel;
      expect(panelInstance).toBeDefined();

      // Call _handleMessage directly to ensure proper this context
      await (panelInstance as any)._handleMessage({
        command: 'refresh',
      });

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Refresh analysis not yet implemented'
      );
    });
  });

  describe('dispose', () => {
    it('should dispose panel and clear singleton', () => {
      GitChangePanel.createOrShow(mockExtensionUri, mockData);

      const disposeHandler = mockPanel.onDidDispose.mock.calls[0][0];
      disposeHandler();

      expect(mockPanel.dispose).toHaveBeenCalled();
      expect((GitChangePanel as any).currentPanel).toBeUndefined();
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML in issue messages', () => {
      const dataWithHtml = {
        ...mockData,
        result: {
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
                  message: '<script>alert("xss")</script>',
                  description: 'Test & description',
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
            affectedModules: [],
            breakingChanges: [],
            migrationRequired: false,
            qualityScore: 85,
          },
          changes: {
            files: [],
            summary: { totalFiles: 1, totalAdditions: 10, totalDeletions: 5 },
          },
        } as MergedAnalysisResult,
      };

      GitChangePanel.createOrShow(mockExtensionUri, dataWithHtml);

      const html = mockPanel.webview.html;
      
      // Check that the issue message is escaped (the template has a script tag, but issue message should be escaped)
      // Find the issue message section and check it's escaped
      const issueMessageMatch = html.match(/<div class="issue-message">(.*?)<\/div>/s);
      expect(issueMessageMatch).toBeTruthy();
      if (issueMessageMatch) {
        const issueMessageContent = issueMessageMatch[1];
        // The issue message should contain escaped HTML
        expect(issueMessageContent).toContain('&lt;script&gt;');
        expect(issueMessageContent).toContain('&quot;xss&quot;');
        expect(issueMessageContent).not.toContain('<script>alert');
      }
      
      // Check description is escaped
      const descriptionMatch = html.match(/<div class="issue-description">(.*?)<\/div>/s);
      expect(descriptionMatch).toBeTruthy();
      if (descriptionMatch) {
        expect(descriptionMatch[1]).toContain('&amp;');
      }
    });
  });
});

