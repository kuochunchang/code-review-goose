/**
 * Goose Code Review VS Code Extension
 * Main entry point for extension activation
 */

import * as vscode from 'vscode';
import { GenerateClassDiagramCommand } from './commands/generate-class-diagram.js';
import { GenerateSequenceDiagramCommand } from './commands/generate-sequence-diagram.js';
import { GenerateFlowchartCommand } from './commands/generate-flowchart.js';

/**
 * Extension activation
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('Goose Code Review extension is now active');

  // Register commands
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
  vscode.window.showInformationMessage('Goose Code Review is ready!');
}

/**
 * Extension deactivation
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  console.log('Goose Code Review extension is now deactivated');
}
