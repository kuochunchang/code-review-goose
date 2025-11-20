import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { AnalysisPanel } from '../views/analysis-panel.js';
import { AnalysisService } from '../services/analysis-service.js';

// Mock services
vi.mock('../services/analysis-service.js', () => ({
  AnalysisService: vi.fn().mockImplementation(() => ({
    analyzeCode: vi.fn(async () => ({
      issues: [],
      summary: 'Test summary',
      timestamp: new Date().toISOString(),
    })),
    explainCode: vi.fn(async () => ({
      overview: 'Test overview',
      fields: [],
      mainComponents: [],
      methodDependencies: [],
      howItWorks: [],
      keyConcepts: [],
      dependencies: [],
      notableFeatures: [],
      timestamp: new Date().toISOString(),
    })),
  })),
}));

vi.mock('../services/cache-service.js', () => ({
  CacheService: vi.fn().mockImplementation(() => ({
    check: vi.fn(async () => ({
      hasCache: false,
      hashMatched: false,
      insight: null,
    })),
    saveAnalysis: vi.fn(async () => { }),
    saveExplain: vi.fn(async () => { }),
  })),
}));

vi.mock('../utils/hash.js', () => ({
  computeSHA256: vi.fn(() => 'test-hash'),
}));

describe('AnalysisPanel', () => {
  let mockContext: vscode.ExtensionContext;
  let mockPanel: vscode.WebviewPanel;
  let mockExtensionUri: vscode.Uri;
  let mockFileUri: vscode.Uri;
  let mockDocument: vscode.TextDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    AnalysisPanel.currentPanel = undefined;

    mockExtensionUri = vscode.Uri.file('/extension');
    mockFileUri = vscode.Uri.file('/workspace/src/test.ts');

    mockDocument = {
      uri: mockFileUri,
      languageId: 'typescript',
      fileName: 'test.ts',
      getText: vi.fn(() => 'const x = 1;'),
    } as any;

    mockPanel = {
      webview: {
        html: '',
        postMessage: vi.fn(async () => { }),
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      reveal: vi.fn(),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    } as any;

    mockContext = {
      extensionUri: mockExtensionUri,
      secrets: {
        get: vi.fn(async () => null),
        store: vi.fn(async () => { }),
        delete: vi.fn(async () => { }),
      },
    } as any;

    // Mock window.createWebviewPanel
    (vscode.window.createWebviewPanel as any).mockReturnValue(mockPanel);
    (vscode.window.showWarningMessage as any).mockResolvedValue(undefined);
    (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDocument);
    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key: string, defaultValue: any) => {
        const config: Record<string, any> = {
          openaiApiKey: 'test-key',
          analysisModel: 'gpt-4',
          useCustomApi: false,
          customApiUrl: '',
          customModelName: '',
        };
        return config[key] ?? defaultValue;
      }),
    });
  });

  describe('createOrShow', () => {
    it('should create new panel when none exists', () => {
      AnalysisPanel.currentPanel = undefined;

      const panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
      expect(panel).toBeDefined();
      expect(AnalysisPanel.currentPanel).toBe(panel);
    });

    it('should reveal existing panel when it exists', () => {
      const existingPanel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext);
      AnalysisPanel.currentPanel = existingPanel;

      const panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext, mockFileUri);

      expect(panel).toBe(existingPanel);
      expect(mockPanel.reveal).toHaveBeenCalled();
    });

    it('should load file when provided', () => {
      AnalysisPanel.currentPanel = undefined;
      const panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext, mockFileUri);

      expect(panel).toBeDefined();
    });
  });

  describe('loadFile', () => {
    it('should load file content', async () => {
      AnalysisPanel.currentPanel = undefined;
      const panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      await panel.loadFile(mockFileUri);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(mockFileUri);
      expect(mockDocument.getText).toHaveBeenCalled();
    });

    it('should handle errors when loading file', async () => {
      AnalysisPanel.currentPanel = undefined;
      const panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      (vscode.workspace.openTextDocument as any).mockRejectedValueOnce(new Error('File not found'));

      await panel.loadFile(mockFileUri);

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should dispose panel and clear current panel', () => {
      AnalysisPanel.currentPanel = undefined;
      const panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      panel.dispose();

      expect(mockPanel.dispose).toHaveBeenCalled();
      expect(AnalysisPanel.currentPanel).toBeUndefined();
    });
  });

  describe('webview message handling', () => {
    let panel: AnalysisPanel;

    beforeEach(() => {
      AnalysisPanel.currentPanel = undefined;
      panel = AnalysisPanel.createOrShow(mockExtensionUri, mockContext);
    });

    it('should handle runAnalysis message', async () => {
      await panel.loadFile(mockFileUri);

      // Manually trigger message handler
      const onDidReceiveMessageCall = (mockPanel.webview.onDidReceiveMessage as any).mock.calls[0];
      if (onDidReceiveMessageCall) {
        await onDidReceiveMessageCall[0]({ command: 'runAnalysis' });
      }

      expect(mockPanel.webview.postMessage).toHaveBeenCalled();
    });

    it('should handle runExplain message', async () => {
      await panel.loadFile(mockFileUri);

      const onDidReceiveMessageCall = (mockPanel.webview.onDidReceiveMessage as any).mock.calls[0];
      if (onDidReceiveMessageCall) {
        await onDidReceiveMessageCall[0]({ command: 'runExplain' });
      }

      expect(mockPanel.webview.postMessage).toHaveBeenCalled();
    });

    it('should handle switchTab message', async () => {
      const onDidReceiveMessageCall = (mockPanel.webview.onDidReceiveMessage as any).mock.calls[0];
      if (onDidReceiveMessageCall) {
        await onDidReceiveMessageCall[0]({ command: 'switchTab', tab: 'explain' });
      }

      expect(mockPanel.webview.html).toBeDefined();
    });

    it('should handle jumpToLine message', async () => {
      await panel.loadFile(mockFileUri);

      const mockEditor = {
        selection: {} as any,
        revealRange: vi.fn(),
      };
      (vscode.window.showTextDocument as any).mockResolvedValue(mockEditor);

      const onDidReceiveMessageCall = (mockPanel.webview.onDidReceiveMessage as any).mock.calls[0];
      if (onDidReceiveMessageCall) {
        await onDidReceiveMessageCall[0]({ command: 'jumpToLine', line: 10 });
      }

      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });

    it('should handle copyToClipboard message', async () => {
      const onDidReceiveMessageCall = (mockPanel.webview.onDidReceiveMessage as any).mock.calls[0];
      if (onDidReceiveMessageCall) {
        await onDidReceiveMessageCall[0]({ command: 'copyToClipboard', data: { test: 'data' } });
      }

      expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Copied to clipboard');
    });

    it('should handle error message', async () => {
      const onDidReceiveMessageCall = (mockPanel.webview.onDidReceiveMessage as any).mock.calls[0];
      if (onDidReceiveMessageCall) {
        await onDidReceiveMessageCall[0]({ command: 'error', text: 'Test error' });
      }

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Test error');
    });
  });

  describe('_initializeAnalysisService', () => {
    it('should initialize with API key from secrets', async () => {
      (mockContext.secrets.get as any).mockResolvedValue('secret-key');

      AnalysisPanel.currentPanel = undefined;
      AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(AnalysisService).toHaveBeenCalled();
    });

    it('should initialize with custom API when enabled', async () => {
      (vscode.workspace.getConfiguration as any).mockReturnValue({
        get: vi.fn((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            openaiApiKey: '',
            analysisModel: 'gpt-4',
            useCustomApi: true,
            customApiUrl: 'https://custom-api.example.com/v1',
            customModelName: 'custom-model',
          };
          return config[key] ?? defaultValue;
        }),
      });

      AnalysisPanel.currentPanel = undefined;
      AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(AnalysisService).toHaveBeenCalled();
      // Note: showInformationMessage is now shown when analysis/explain runs, not during initialization
    });

    it('should show warning when custom API enabled but no URL', async () => {
      (vscode.workspace.getConfiguration as any).mockReturnValue({
        get: vi.fn((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            openaiApiKey: '',
            analysisModel: 'gpt-4',
            useCustomApi: true,
            customApiUrl: '',
            customModelName: '',
          };
          return config[key] ?? defaultValue;
        }),
      });

      AnalysisPanel.currentPanel = undefined;
      AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should show warning when no API key configured', async () => {
      (mockContext.secrets.get as any).mockResolvedValue(null);
      (vscode.workspace.getConfiguration as any).mockReturnValue({
        get: vi.fn((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            openaiApiKey: '',
            analysisModel: 'gpt-4',
            useCustomApi: false,
            customApiUrl: '',
            customModelName: '',
          };
          return config[key] ?? defaultValue;
        }),
      });

      AnalysisPanel.currentPanel = undefined;
      AnalysisPanel.createOrShow(mockExtensionUri, mockContext);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    if (AnalysisPanel.currentPanel) {
      AnalysisPanel.currentPanel.dispose();
    }
  });
});

