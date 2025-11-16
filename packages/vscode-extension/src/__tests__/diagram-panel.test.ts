/**
 * DiagramPanel unit tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { DiagramPanel } from '../views/diagram-panel.js';
import type { DiagramType, DiagramOptions } from '../views/diagram-panel.js';

// Mock VS Code API
vi.mock('vscode', () => ({
  window: {
    createWebviewPanel: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    activeTextEditor: undefined,
  },
  workspace: {
    getWorkspaceFolder: vi.fn(),
    asRelativePath: vi.fn((uri: any) => uri.fsPath),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file', path })),
  },
  ViewColumn: {
    Two: 2,
  },
  Disposable: class {
    dispose() {}
  },
}));

// Mock analysis packages
vi.mock('@code-review-goose/analysis-core', () => ({
  UMLAnalyzer: vi.fn().mockImplementation(() => ({
    generateUnifiedDiagram: vi.fn().mockResolvedValue({
      mermaidCode: 'classDiagram\n  class TestClass',
    }),
  })),
}));

vi.mock('@code-review-goose/analysis-adapter-vscode', () => ({
  VSCodeFileProvider: vi.fn(),
}));

describe('DiagramPanel', () => {
  let mockPanel: any;
  let mockExtensionUri: any;
  let mockWebview: any;
  let messageHandler: (message: any) => void;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock webview
    mockWebview = {
      html: '',
      onDidReceiveMessage: vi.fn((handler) => {
        messageHandler = handler;
        return { dispose: vi.fn() };
      }),
      postMessage: vi.fn(),
    };

    // Setup mock panel
    mockPanel = {
      webview: mockWebview,
      reveal: vi.fn(),
      onDidDispose: vi.fn((_handler) => {
        return { dispose: vi.fn() };
      }),
      dispose: vi.fn(),
    };

    // Setup createWebviewPanel mock
    vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(mockPanel);

    // Setup extension URI
    mockExtensionUri = vscode.Uri.file('/test/extension');
  });

  afterEach(() => {
    // Clean up singleton
    if (DiagramPanel.currentPanel) {
      DiagramPanel.currentPanel.dispose();
    }
  });

  describe('createOrShow', () => {
    it('should create a new panel if none exists', () => {
      const panel = DiagramPanel.createOrShow(mockExtensionUri);

      expect(panel).toBeDefined();
      expect(DiagramPanel.currentPanel).toBe(panel);
      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'gooseCodeReviewUML',
        '🦆 UML Diagram',
        vscode.ViewColumn.Two,
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true,
        })
      );
    });

    it('should reuse existing panel if one exists', () => {
      const panel1 = DiagramPanel.createOrShow(mockExtensionUri);
      const panel2 = DiagramPanel.createOrShow(mockExtensionUri);

      expect(panel1).toBe(panel2);
      expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
      expect(mockPanel.reveal).toHaveBeenCalled();
    });

    it('should generate diagram when file is provided', async () => {
      const mockFile = vscode.Uri.file('/test/file.ts');
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test'),
        name: 'test',
        index: 0,
      };

      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder);

      DiagramPanel.createOrShow(mockExtensionUri, mockFile);

      // Wait for async diagram generation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'loading',
          isLoading: true,
        })
      );
    });
  });

  describe('generateDiagram', () => {
    it('should update diagram type and options', async () => {
      const panel = DiagramPanel.createOrShow(mockExtensionUri);
      const mockFile = vscode.Uri.file('/test/file.ts');
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test'),
        name: 'test',
        index: 0,
      };

      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder);

      await panel.generateDiagram(mockFile, 'sequence', { depth: 2 });

      expect(mockWebview.html).toContain('sequence');
    });

    it('should handle cross-file analysis failure with fallback', async () => {
      const { UMLAnalyzer } = await import('@code-review-goose/analysis-core');
      const mockAnalyzer = {
        generateUnifiedDiagram: vi
          .fn()
          .mockRejectedValueOnce(new Error('Cross-file failed'))
          .mockResolvedValueOnce({
            mermaidCode: 'classDiagram\n  class Fallback',
          }),
      };
      vi.mocked(UMLAnalyzer).mockImplementation(() => mockAnalyzer as any);

      const panel = DiagramPanel.createOrShow(mockExtensionUri);
      const mockFile = vscode.Uri.file('/test/file.ts');
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test'),
        name: 'test',
        index: 0,
      };

      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder);

      await panel.generateDiagram(mockFile, 'class', { depth: 2, mode: 'bidirectional' });

      // Should show warning about fallback
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();

      // Should retry with depth=0
      expect(mockAnalyzer.generateUnifiedDiagram).toHaveBeenCalledTimes(2);
      expect(mockAnalyzer.generateUnifiedDiagram).toHaveBeenLastCalledWith(
        '/test/file.ts',
        'class',
        expect.objectContaining({ depth: 0 })
      );
    });

    it('should show error message when diagram generation fails', async () => {
      const { UMLAnalyzer } = await import('@code-review-goose/analysis-core');
      const mockAnalyzer = {
        generateUnifiedDiagram: vi.fn().mockRejectedValue(new Error('File not found')),
      };
      vi.mocked(UMLAnalyzer).mockImplementation(() => mockAnalyzer as any);

      const panel = DiagramPanel.createOrShow(mockExtensionUri);
      const mockFile = vscode.Uri.file('/test/nonexistent.ts');
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test'),
        name: 'test',
        index: 0,
      };

      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder);

      await panel.generateDiagram(mockFile, 'class', { depth: 0, mode: 'bidirectional' });

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'error',
        })
      );
    });
  });

  describe('webview message handling', () => {
    it('should handle regenerate message', async () => {
      const panel = DiagramPanel.createOrShow(mockExtensionUri);
      const mockFile = vscode.Uri.file('/test/file.ts');
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test'),
        name: 'test',
        index: 0,
      };

      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder);

      // First generate with initial file
      await panel.generateDiagram(mockFile, 'class', { depth: 0, mode: 'bidirectional' });

      // Clear previous calls
      vi.clearAllMocks();

      // Simulate regenerate message from webview
      await messageHandler({
        command: 'regenerate',
        type: 'sequence' as DiagramType,
        options: { depth: 1, mode: 'forward' } as DiagramOptions,
      });

      // Should trigger new diagram generation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockWebview.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'loading',
          isLoading: true,
        })
      );
    });

    it('should handle error message', async () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      messageHandler({
        command: 'error',
        text: 'Test error',
      });

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Test error');
    });

    it('should handle info message', async () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      messageHandler({
        command: 'info',
        text: 'Test info',
      });

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Test info');
    });
  });

  describe('webview HTML generation', () => {
    it('should include zoom controls in HTML', () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      expect(mockWebview.html).toContain('zoomInBtn');
      expect(mockWebview.html).toContain('zoomOutBtn');
      expect(mockWebview.html).toContain('resetZoomBtn');
    });

    it('should include diagram type selectors', () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      expect(mockWebview.html).toContain('class');
      expect(mockWebview.html).toContain('sequence');
      expect(mockWebview.html).toContain('flowchart');
    });

    it('should include class diagram options', () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      expect(mockWebview.html).toContain('Depth:');
      expect(mockWebview.html).toContain('Mode:');
      expect(mockWebview.html).toContain('bidirectional');
      expect(mockWebview.html).toContain('forward');
      expect(mockWebview.html).toContain('reverse');
    });

    it('should render mermaid code when available', async () => {
      // Reset the UMLAnalyzer mock to succeed for this test
      const { UMLAnalyzer } = await import('@code-review-goose/analysis-core');
      const mockAnalyzer = {
        generateUnifiedDiagram: vi.fn().mockResolvedValue({
          mermaidCode: 'classDiagram\n  class TestClass',
        }),
      };
      vi.mocked(UMLAnalyzer).mockImplementation(() => mockAnalyzer as any);

      const panel = DiagramPanel.createOrShow(mockExtensionUri);
      const mockFile = vscode.Uri.file('/test/file.ts');
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test'),
        name: 'test',
        index: 0,
      };

      vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(mockWorkspaceFolder);

      await panel.generateDiagram(mockFile, 'class', { depth: 0, mode: 'bidirectional' });

      // Check that diagram was generated
      expect(mockAnalyzer.generateUnifiedDiagram).toHaveBeenCalled();

      // The HTML should be updated by the internal _updateWebview call
      // Check that it contains the mermaid code
      expect(mockWebview.html).toContain('classDiagram');
      expect(mockWebview.html).toContain('TestClass');
    });

    it('should show empty state when no diagram is generated', () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      expect(mockWebview.html).toContain('empty-state');
      expect(mockWebview.html).toContain('Select a TypeScript/JavaScript file');
    });

    it('should include native zoom implementation', () => {
      DiagramPanel.createOrShow(mockExtensionUri);

      // Check that native zoom functions are defined
      expect(mockWebview.html).toContain('function zoomIn()');
      expect(mockWebview.html).toContain('function zoomOut()');
      expect(mockWebview.html).toContain('function resetZoom()');
    });

    it('should configure zoom limits correctly', () => {
      DiagramPanel.createOrShow(mockExtensionUri);
      const html = mockWebview.html;

      // Check zoom limits constants
      expect(html).toContain('MIN_ZOOM = 0.2');
      expect(html).toContain('MAX_ZOOM = 10');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const panel = DiagramPanel.createOrShow(mockExtensionUri);

      panel.dispose();

      expect(mockPanel.dispose).toHaveBeenCalled();
      expect(DiagramPanel.currentPanel).toBeUndefined();
    });
  });

  describe('zoom functionality', () => {
    it('should use native zoom implementation', () => {
      DiagramPanel.createOrShow(mockExtensionUri);
      const html = mockWebview.html;

      // Check that native zoom variables are defined
      expect(html).toContain('let currentZoom = 1');
      expect(html).toContain('let currentX = 0');
      expect(html).toContain('let currentY = 0');
    });

    it('should handle zoom reset correctly', () => {
      DiagramPanel.createOrShow(mockExtensionUri);
      const html = mockWebview.html;

      // Reset should reset all zoom variables
      expect(html).toContain('currentZoom = 1');
      expect(html).toContain('currentX = 0');
      expect(html).toContain('currentY = 0');
    });

    it('should enable mouse wheel zoom', () => {
      DiagramPanel.createOrShow(mockExtensionUri);
      const html = mockWebview.html;

      // Should have wheel event listener
      expect(html).toContain("addEventListener('wheel'");
    });

    it('should support drag to pan', () => {
      DiagramPanel.createOrShow(mockExtensionUri);
      const html = mockWebview.html;

      // Should have mouse event listeners for dragging
      expect(html).toContain("addEventListener('mousedown'");
      expect(html).toContain("addEventListener('mousemove'");
      expect(html).toContain('isDragging');
    });

    it('should configure diagram container with CSS transforms', () => {
      DiagramPanel.createOrShow(mockExtensionUri);
      const html = mockWebview.html;

      // Container should use CSS transform
      expect(html).toContain('transform-origin: center center');
      expect(html).toContain('transition: transform');
      expect(html).toContain('overflow: hidden');
    });
  });
});
