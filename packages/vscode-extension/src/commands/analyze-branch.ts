/**
 * Analyze Branch Comparison Command
 * Compares two branches and analyzes the differences
 */

import * as vscode from 'vscode';
import { GitAnalysisService } from '../services/git-analysis-service.js';
import type { AnalysisType, FileAnalysis } from '@code-review-goose/git-analyzer';

/**
 * Execute analyze branch comparison command
 */
export async function analyzeBranchComparison(
  context: vscode.ExtensionContext,
  gitAnalysisService: GitAnalysisService
): Promise<void> {
  try {
    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
      return;
    }

    const workingDirectory = workspaceFolder.uri.fsPath;

    // Get current branch
    const currentBranch = await gitAnalysisService.getCurrentBranch(workingDirectory);

    // Get list of branches
    const branches = await gitAnalysisService.getBranches(workingDirectory);

    // Ask user to select target branch (to compare with current branch)
    const targetBranch = await vscode.window.showQuickPick(
      branches.filter((b) => b !== currentBranch),
      {
        title: 'Select Target Branch',
        placeHolder: `Compare current branch (${currentBranch}) with...`,
      }
    );

    if (!targetBranch) {
      return; // User cancelled
    }

    // Ask user to select analysis types
    const analysisTypes = await selectAnalysisTypes();
    if (!analysisTypes || analysisTypes.length === 0) {
      return; // User cancelled
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Comparing ${currentBranch} with ${targetBranch}`,
        cancellable: false,
      },
      async (progress) => {
        try {
          // Perform analysis
          const result = await gitAnalysisService.analyzeBranchComparison(
            {
              workingDirectory,
              sourceBranch: currentBranch,
              targetBranch,
              analysisTypes,
            },
            (message, increment) => {
              progress.report({ message, increment });
            }
          );

          // Show results in webview
          const { GitChangePanel } = await import('../views/git-change-panel.js');
          GitChangePanel.createOrShow(context.extensionUri, {
            result,
            changeSource: 'branch-comparison',
            workingDirectory,
            sourceBranch: currentBranch,
            targetBranch,
          });

          const totalIssues = result.fileAnalyses.flatMap((f: FileAnalysis) => f.issues).length;
          const totalFiles = result.fileAnalyses.length;
          vscode.window.showInformationMessage(
            `Analysis complete! Found ${totalIssues} issue(s) in ${totalFiles} file(s).`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);
        }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to analyze branch comparison: ${errorMessage}`);
  }
}

/**
 * Select analysis types via quick pick
 */
async function selectAnalysisTypes(): Promise<AnalysisType[] | undefined> {
  const items: vscode.QuickPickItem[] = [
    {
      label: 'Quality',
      description: 'Code quality, complexity, and maintainability',
      picked: true,
    },
    {
      label: 'Security',
      description: 'Security vulnerabilities and hotspots',
      picked: true,
    },
    {
      label: 'Impact',
      description: 'Impact analysis and risk assessment',
      picked: true,
    },
    {
      label: 'Architecture',
      description: 'Architecture review and design patterns',
      picked: false,
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: 'Select Analysis Types',
    placeHolder: 'Choose which types of analysis to perform',
  });

  if (!selected || selected.length === 0) {
    return undefined;
  }

  return selected.map((item) => item.label.toLowerCase() as AnalysisType);
}

