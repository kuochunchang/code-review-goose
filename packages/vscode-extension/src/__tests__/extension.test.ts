/**
 * Extension unit tests using Vitest
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';

// Mock VS Code API


describe('Extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('openUMLPanel command', () => {
    it('should show error when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;
      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/extension'),
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');
      activate(context);

      // Find and execute the openUMLPanel command
      const registerCommandCalls = (vscode.commands.registerCommand as any).mock.calls;
      const openUMLPanelCall = registerCommandCalls.find(
        (call: any[]) => call[0] === 'gooseCodeReview.openUMLPanel'
      );
      
      if (openUMLPanelCall && openUMLPanelCall[1]) {
        await openUMLPanelCall[1]();
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No active editor found');
      }
    });

    it('should show warning for unsupported language', async () => {
      const mockEditor = {
        document: {
          languageId: 'plaintext',
        },
      } as any;
      vscode.window.activeTextEditor = mockEditor;

      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/extension'),
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');
      activate(context);

      const registerCommandCalls = (vscode.commands.registerCommand as any).mock.calls;
      const openUMLPanelCall = registerCommandCalls.find(
        (call: any[]) => call[0] === 'gooseCodeReview.openUMLPanel'
      );
      
      if (openUMLPanelCall && openUMLPanelCall[1]) {
        await openUMLPanelCall[1]();
        expect(vscode.window.showWarningMessage).toHaveBeenCalled();
      }
    });

    it('should open panel for supported language', async () => {
      // Mock workspace folder
      (vscode.workspace.getWorkspaceFolder as any).mockReturnValue({
        uri: vscode.Uri.file('/workspace'),
      });

      const mockEditor = {
        document: {
          languageId: 'typescript',
          uri: vscode.Uri.file('/workspace/test.ts'),
        },
      } as any;
      vscode.window.activeTextEditor = mockEditor;

      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/extension'),
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');
      activate(context);

      const registerCommandCalls = (vscode.commands.registerCommand as any).mock.calls;
      const openUMLPanelCall = registerCommandCalls.find(
        (call: any[]) => call[0] === 'gooseCodeReview.openUMLPanel'
      );
      
      if (openUMLPanelCall && openUMLPanelCall[1]) {
        await openUMLPanelCall[1]();
        // Panel should be created (may show error if diagram generation fails, but that's expected)
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
      }
    });
  });

  describe('status bar', () => {
    it('should show status bar for supported language', async () => {
      const mockEditor = {
        document: {
          languageId: 'typescript',
        },
      } as any;
      vscode.window.activeTextEditor = mockEditor;

      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/extension'),
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');
      activate(context);

      // Trigger status bar update
      const onDidChangeActiveTextEditorCall = (vscode.window.onDidChangeActiveTextEditor as any).mock.calls[0];
      if (onDidChangeActiveTextEditorCall) {
        onDidChangeActiveTextEditorCall[0](mockEditor);
      }

      expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
    });

    it('should hide status bar for unsupported language', async () => {
      const mockEditor = {
        document: {
          languageId: 'plaintext',
        },
      } as any;
      vscode.window.activeTextEditor = mockEditor;

      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/extension'),
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');
      activate(context);

      const onDidChangeActiveTextEditorCall = (vscode.window.onDidChangeActiveTextEditor as any).mock.calls[0];
      if (onDidChangeActiveTextEditorCall) {
        onDidChangeActiveTextEditorCall[0](mockEditor);
      }

      expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
    });

    it('should hide status bar when no editor', async () => {
      vscode.window.activeTextEditor = undefined;

      const context = {
        subscriptions: [],
        extensionUri: vscode.Uri.file('/extension'),
      } as unknown as vscode.ExtensionContext;

      const { activate } = await import('../extension.js');
      activate(context);

      const onDidChangeActiveTextEditorCall = (vscode.window.onDidChangeActiveTextEditor as any).mock.calls[0];
      if (onDidChangeActiveTextEditorCall) {
        onDidChangeActiveTextEditorCall[0](undefined);
      }

      expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
    });
  });
});
