/**
 * Analyze Working Directory Command
 * Analyzes uncommitted changes in the current working directory
 */

import * as vscode from 'vscode';
import { GitAnalysisService } from '../services/git-analysis-service.js';
import type { AnalysisType } from '@code-review-goose/git-analyzer';

/**
 * Execute analyze working directory command
 */
export async function analyzeWorkingDirectory(
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

    // Check if working directory is clean
    const isClean = await gitAnalysisService.isWorkingDirectoryClean(workingDirectory);
    if (isClean) {
      vscode.window.showInformationMessage('No changes found in working directory.');
      return;
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
        title: 'Analyzing Working Directory Changes',
        cancellable: false,
      },
      async (progress) => {
        try {
          // Perform analysis
          const result = await gitAnalysisService.analyzeWorkingDirectory(
            {
              workingDirectory,
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
            changeSource: 'working-directory',
            workingDirectory,
          });

          const totalIssues = result.fileAnalyses.flatMap(f => f.issues).length;
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
    vscode.window.showErrorMessage(`Failed to analyze working directory: ${errorMessage}`);
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

