/**
 * Command: Generate Sequence Diagram
 * Generates UML sequence diagram for the current file
 */

import * as vscode from 'vscode';
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { VSCodeFileProvider } from '@code-review-goose/analysis-adapter-vscode';
import { DiagramPanel } from '../views/diagram-panel.js';
import { getConfiguration } from '../utils/config.js';

export class GenerateSequenceDiagramCommand {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async execute(): Promise<void> {
    try {
      // Get active editor
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      // Validate file type
      const document = editor.document;
      if (!this.isValidFileType(document.languageId)) {
        vscode.window.showWarningMessage(
          'Sequence diagram generation is only supported for TypeScript/JavaScript files'
        );
        return;
      }

      // Get workspace folder
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('File is not in a workspace');
        return;
      }

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating sequence diagram...',
          cancellable: false,
        },
        async (progress) => {
          try {
            // Get configuration
            const config = getConfiguration();

            // Create file provider and analyzer
            const fileProvider = new VSCodeFileProvider(workspaceFolder.uri);
            const analyzer = new UMLAnalyzer(fileProvider);

            // Generate sequence diagram
            progress.report({ message: 'Analyzing function calls...' });
            const result = await analyzer.generateUnifiedDiagram(
              document.uri.fsPath,
              'sequence',
              {
                depth: 0, // Single file analysis for sequence diagrams
              }
            );

            // Display diagram in webview
            progress.report({ message: 'Rendering diagram...' });
            const panel = DiagramPanel.createOrShow(
              this.context.extensionUri,
              'Sequence Diagram',
              document.fileName
            );

            panel.updateDiagram(result.mermaidCode, 'sequence');

            vscode.window.showInformationMessage('Sequence diagram generated successfully');
          } catch (error) {
            throw error;
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to generate sequence diagram: ${errorMessage}`);
      console.error('Sequence diagram generation error:', error);
    }
  }

  private isValidFileType(languageId: string): boolean {
    return ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId);
  }
}
