/**
 * Command: Generate Flowchart
 * Generates flowchart diagram for the current file
 */

import * as vscode from 'vscode';
import { DiagramPanel } from '../views/diagram-panel.js';

export class GenerateFlowchartCommand {
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
          'Flowchart generation is only supported for TypeScript/JavaScript files'
        );
        return;
      }

      // Get workspace folder
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('File is not in a workspace');
        return;
      }

      // Open unified panel and generate flowchart
      const panel = DiagramPanel.createOrShow(this.context.extensionUri, document.uri);

      // Generate flowchart
      await panel.generateDiagram(document.uri, 'flowchart');

      vscode.window.showInformationMessage('Flowchart panel opened');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to open UML panel: ${errorMessage}`);
      console.error('Flowchart generation error:', error);
    }
  }

  private isValidFileType(languageId: string): boolean {
    return ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'].includes(languageId);
  }
}
