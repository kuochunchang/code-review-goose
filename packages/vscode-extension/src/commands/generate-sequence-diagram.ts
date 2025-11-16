/**
 * Command: Generate Sequence Diagram
 * Generates UML sequence diagram for the current file
 */

import * as vscode from 'vscode';
import { DiagramPanel } from '../views/diagram-panel.js';

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

      // Open unified panel and generate sequence diagram
      const panel = DiagramPanel.createOrShow(this.context.extensionUri, document.uri);

      // Generate sequence diagram
      await panel.generateDiagram(document.uri, 'sequence');

      vscode.window.showInformationMessage('Sequence diagram panel opened');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to open UML panel: ${errorMessage}`);
      console.error('Sequence diagram generation error:', error);
    }
  }

  private isValidFileType(languageId: string): boolean {
    return ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId);
  }
}
