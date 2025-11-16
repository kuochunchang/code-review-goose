/**
 * Goose Code Review VS Code Extension
 * Main entry point for extension activation
 */

import * as vscode from 'vscode';
import { DiagramPanel } from './views/diagram-panel.js';
import { GenerateClassDiagramCommand } from './commands/generate-class-diagram.js';
import { GenerateSequenceDiagramCommand } from './commands/generate-sequence-diagram.js';
import { GenerateFlowchartCommand } from './commands/generate-flowchart.js';

/**
 * Extension activation
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Goose Code Review extension is now active');

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
      const validLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];

      if (!validLanguages.includes(document.languageId)) {
        vscode.window.showWarningMessage(
          'UML diagram generation is only supported for TypeScript/JavaScript files'
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

  // Show status bar only for TypeScript/JavaScript files
  function updateStatusBar(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const validLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
      if (validLanguages.includes(editor.document.languageId)) {
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
  const generateFlowchart = new GenerateFlowchartCommand(context);

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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'gooseCodeReview.generateFlowchart',
      () => generateFlowchart.execute()
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
