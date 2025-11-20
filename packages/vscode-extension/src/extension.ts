/**
 * Goose Code Review VS Code Extension
 * Main entry point for extension activation
 */

import * as vscode from 'vscode';
import { DiagramPanel } from './views/diagram-panel.js';
import { openAnalysisPanel } from './commands/open-analysis-panel.js';
import { GenerateClassDiagramCommand } from './commands/generate-class-diagram.js';
import { GenerateSequenceDiagramCommand } from './commands/generate-sequence-diagram.js';
import { analyzeWorkingDirectory } from './commands/analyze-working-directory.js';
import { analyzeBranchComparison } from './commands/analyze-branch.js';
import { openGitChangePanel } from './commands/open-git-change-panel.js';
import { addSonarQubeConnection } from './commands/add-sonarqube-connection.js';
import { bindSonarQubeProject } from './commands/bind-sonarqube-project.js';
import { testSonarQubeConnection } from './commands/test-sonarqube-connection.js';
import { testSonarQubeScanner } from './commands/test-sonarqube-scanner.js';
import { diagnoseSonarQube } from './commands/diagnose-sonarqube.js';
import { GitAnalysisService } from './services/git-analysis-service.js';

import { isSupportedLanguage, getSupportedLanguagesList } from './utils/language-support.js';

/**
 * Extension activation
 * Called when the extension is activated
 */
// Create output channel for logging
const outputChannel = vscode.window.createOutputChannel('Goose Code Review');

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel.appendLine('Goose Code Review extension is now active');
  console.log('Goose Code Review extension is now active');

  // Make output channel available globally
  (global as any).gooseOutputChannel = outputChannel;
  context.subscriptions.push(outputChannel);

  // ==========================================
  // Git Analysis Service (NEW)
  // ==========================================

  const gitAnalysisService = new GitAnalysisService(context);

  // Initialize asynchronously
  gitAnalysisService.initialize().catch((error) => {
    console.error('Failed to initialize Git Analysis Service:', error);
    vscode.window.showWarningMessage(
      'Git Analysis features may not work properly. Please check your AI provider configuration.'
    );
  });

  context.subscriptions.push(gitAnalysisService);

  // ==========================================
  // Git Change Analysis Commands (NEW)
  // ==========================================

  /**
   * Analyze Working Directory Changes
   */
  const analyzeWorkingDirectoryCmd = vscode.commands.registerCommand(
    'gooseCodeReview.analyzeWorkingDirectory',
    () => analyzeWorkingDirectory(context, gitAnalysisService)
  );

  /**
   * Analyze Branch Comparison
   */
  const analyzeBranchCmd = vscode.commands.registerCommand(
    'gooseCodeReview.analyzeBranch',
    () => analyzeBranchComparison(context, gitAnalysisService)
  );

  /**
   * Open Git Change Panel
   */
  const openGitChangePanelCmd = vscode.commands.registerCommand(
    'gooseCodeReview.openGitChangePanel',
    () => openGitChangePanel(context)
  );

  /**
   * SonarQube Configuration Commands
   */
  const addSonarQubeConnectionCmd = vscode.commands.registerCommand(
    'gooseCodeReview.sonarqube.addConnection',
    () => addSonarQubeConnection(context)
  );

  const bindSonarQubeProjectCmd = vscode.commands.registerCommand(
    'gooseCodeReview.sonarqube.bindProject',
    () => bindSonarQubeProject(context)
  );

  const testSonarQubeConnectionCmd = vscode.commands.registerCommand(
    'gooseCodeReview.sonarqube.testConnection',
    () => testSonarQubeConnection(context)
  );

  const testSonarQubeScannerCmd = vscode.commands.registerCommand(
    'gooseCodeReview.testSonarQubeScanner',
    () => testSonarQubeScanner(context)
  );

  const diagnoseSonarQubeCmd = vscode.commands.registerCommand(
    'gooseCodeReview.sonarqube.diagnose',
    () => diagnoseSonarQube(context)
  );

  context.subscriptions.push(
    analyzeWorkingDirectoryCmd,
    analyzeBranchCmd,
    openGitChangePanelCmd,
    addSonarQubeConnectionCmd,
    bindSonarQubeProjectCmd,
    testSonarQubeConnectionCmd,
    testSonarQubeScannerCmd,
    diagnoseSonarQubeCmd
  );

  // ==========================================
  // Analysis Panel (EXISTING)
  // ==========================================

  /**
   * Open Analysis Panel for AI-powered code review
   */
  const analysisPanel = vscode.commands.registerCommand(
    'gooseCodeReview.openAnalysisPanel',
    () => openAnalysisPanel(context)
  );

  context.subscriptions.push(analysisPanel);

  // ==========================================
  // Unified UML Panel (NEW)
  // ==========================================

  /**
   * Open unified UML panel
   * Replaces the three separate commands with a single interactive panel
   */
  const openUMLPanel = vscode.commands.registerCommand(
    'gooseCodeReview.openUMLPanel',
    () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      // Validate file type
      const document = editor.document;

      if (!isSupportedLanguage(document.languageId)) {
        vscode.window.showWarningMessage(
          `UML diagram generation is only supported for ${getSupportedLanguagesList()} files`
        );
        return;
      }

      // Open or show panel with current file
      DiagramPanel.createOrShow(context.extensionUri, document.uri);
    }
  );

  context.subscriptions.push(openUMLPanel);

  // ==========================================
  // Status Bar Item (NEW)
  // ==========================================

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.text = '$(graph) UML';
  statusBarItem.command = 'gooseCodeReview.openUMLPanel';
  statusBarItem.tooltip = 'Open UML Diagram Panel (Ctrl+Shift+U)';

  // Show status bar only for supported languages
  function updateStatusBar(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      if (isSupportedLanguage(editor.document.languageId)) {
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    } else {
      statusBarItem.hide();
    }
  }

  // Update status bar on editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
  );

  // Initial update
  updateStatusBar();

  context.subscriptions.push(statusBarItem);

  // ==========================================
  // Legacy Commands (DEPRECATED - Kept for backward compatibility)
  // ==========================================

  // These commands still work but use the new unified panel
  const generateClassDiagram = new GenerateClassDiagramCommand(context);
  const generateSequenceDiagram = new GenerateSequenceDiagramCommand(context);


  context.subscriptions.push(
    vscode.commands.registerCommand(
      'gooseCodeReview.generateClassDiagram',
      () => generateClassDiagram.execute()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'gooseCodeReview.generateSequenceDiagram',
      () => generateSequenceDiagram.execute()
    )
  );



  // Show activation message
  vscode.window.showInformationMessage('Goose Code Review is ready! 🦆');
}

/**
 * Extension deactivation
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('Goose Code Review extension is now deactivated');
}
