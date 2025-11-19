/**
 * Extension unit tests using Vitest
 */

import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';

// Mock VS Code API


describe('Extension', () => {
  describe('activate', () => {
    it('should register all commands', async () => {
      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      // Import after mocking
      const { activate } = await import('../extension.js');

      activate(context);

      // Verify commands are registered
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'gooseCodeReview.generateClassDiagram',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'gooseCodeReview.generateSequenceDiagram',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'gooseCodeReview.generateFlowchart',
        expect.any(Function)
      );
    });

    it('should show activation message', async () => {
      const context = {
        subscriptions: [],
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');

      activate(context);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Goose Code Review is ready! 🦆'
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate without errors', async () => {
      const { deactivate } = await import('../extension.js');

      expect(() => deactivate()).not.toThrow();
    });
  });
});
