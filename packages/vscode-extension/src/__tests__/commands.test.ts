import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { GenerateClassDiagramCommand } from '../commands/generate-class-diagram.js';

import { GenerateSequenceDiagramCommand } from '../commands/generate-sequence-diagram.js';
import { openAnalysisPanel } from '../commands/open-analysis-panel.js';

// Mock DiagramPanel
vi.mock('../views/diagram-panel.js', () => ({
  DiagramPanel: {
    createOrShow: vi.fn(() => ({
      generateDiagram: vi.fn(async () => { }),
    })),
  },
}));

// Mock AnalysisPanel
vi.mock('../views/analysis-panel.js', () => ({
  AnalysisPanel: {
    createOrShow: vi.fn(),
  },
}));

// Mock language support utils
vi.mock('../utils/language-support.js', () => ({
  isSupportedLanguage: vi.fn((lang: string) => ['typescript', 'javascript', 'java', 'python'].includes(lang)),
  getSupportedLanguagesList: vi.fn(() => 'TypeScript, JavaScript, Java, Python'),
  isDiagramTypeSupported: vi.fn((lang: string, type: string) => {
    if (type === 'sequence') {
      return ['typescript', 'javascript'].includes(lang);
    }
    return ['typescript', 'javascript', 'java', 'python'].includes(lang);
  }),
  getUnsupportedDiagramTypeMessage: vi.fn((lang: string, type: string) =>
    `${type} diagram is not supported for ${lang} files`
  ),
}));

describe('Commands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockEditor: vscode.TextEditor;
  let mockDocument: vscode.TextDocument;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorkspaceFolder = {
      uri: vscode.Uri.file('/workspace'),
      name: 'workspace',
      index: 0,
    } as vscode.WorkspaceFolder;

    mockDocument = {
      uri: vscode.Uri.file('/workspace/src/test.ts'),
      languageId: 'typescript',
      fileName: 'test.ts',
    } as vscode.TextDocument;

    mockEditor = {
      document: mockDocument,
    } as vscode.TextEditor;

    mockContext = {
      extensionUri: vscode.Uri.file('/extension'),
      subscriptions: [],
    } as vscode.ExtensionContext;

    // Reset window mocks
    (vscode.window.showErrorMessage as any).mockClear();
    (vscode.window.showWarningMessage as any).mockClear();
    (vscode.window.showInformationMessage as any).mockClear();
  });

  describe('GenerateClassDiagramCommand', () => {
    it('should show error when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;
      const command = new GenerateClassDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No active editor found');
    });

    it('should show warning for unsupported language', async () => {
      const unsupportedDoc = {
        ...mockDocument,
        languageId: 'plaintext',
      } as vscode.TextDocument;
      vscode.window.activeTextEditor = {
        document: unsupportedDoc,
      } as vscode.TextEditor;

      const command = new GenerateClassDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should show error when file is not in workspace', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(undefined);

      const command = new GenerateClassDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('File is not in a workspace');
    });

    it('should generate class diagram for supported language', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(mockWorkspaceFolder);

      const { DiagramPanel } = await import('../views/diagram-panel.js');
      const mockPanel = {
        generateDiagram: vi.fn(async () => { }),
      };
      (DiagramPanel.createOrShow as any).mockReturnValue(mockPanel);

      const command = new GenerateClassDiagramCommand(mockContext);
      await command.execute();

      expect(DiagramPanel.createOrShow).toHaveBeenCalled();
      expect(mockPanel.generateDiagram).toHaveBeenCalledWith(
        mockDocument.uri,
        'class',
        { depth: 0, mode: 'bidirectional' }
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Class diagram panel opened');
    });

    it('should handle errors gracefully', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(mockWorkspaceFolder);

      const { DiagramPanel } = await import('../views/diagram-panel.js');
      (DiagramPanel.createOrShow as any).mockImplementation(() => {
        throw new Error('Test error');
      });

      const command = new GenerateClassDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open UML panel')
      );
    });
  });



  describe('GenerateSequenceDiagramCommand', () => {
    it('should show error when no active editor', async () => {
      vscode.window.activeTextEditor = undefined;
      const command = new GenerateSequenceDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No active editor found');
    });

    it('should show warning for unsupported diagram type', async () => {
      const unsupportedDoc = {
        ...mockDocument,
        languageId: 'java',
      } as vscode.TextDocument;
      vscode.window.activeTextEditor = {
        document: unsupportedDoc,
      } as vscode.TextEditor;

      const command = new GenerateSequenceDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it('should show error when file is not in workspace', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(undefined);

      const command = new GenerateSequenceDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('File is not in a workspace');
    });

    it('should generate sequence diagram for supported language', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(mockWorkspaceFolder);

      const { DiagramPanel } = await import('../views/diagram-panel.js');
      const mockPanel = {
        generateDiagram: vi.fn(async () => { }),
      };
      (DiagramPanel.createOrShow as any).mockReturnValue(mockPanel);

      const command = new GenerateSequenceDiagramCommand(mockContext);
      await command.execute();

      expect(DiagramPanel.createOrShow).toHaveBeenCalled();
      expect(mockPanel.generateDiagram).toHaveBeenCalledWith(mockDocument.uri, 'sequence');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Sequence diagram panel opened');
    });

    it('should handle errors gracefully', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'getWorkspaceFolder').mockReturnValue(mockWorkspaceFolder);

      const { DiagramPanel } = await import('../views/diagram-panel.js');
      (DiagramPanel.createOrShow as any).mockImplementation(() => {
        throw new Error('Test error');
      });

      const command = new GenerateSequenceDiagramCommand(mockContext);
      await command.execute();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open UML panel')
      );
    });
  });

  describe('openAnalysisPanel', () => {
    it('should show warning when no file is selected', async () => {
      vscode.window.activeTextEditor = undefined;
      await openAnalysisPanel(mockContext);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No file selected. Please open a file to analyze.'
      );
    });

    it('should show warning for unsupported language', async () => {
      const unsupportedDoc = {
        ...mockDocument,
        languageId: 'plaintext',
      } as vscode.TextDocument;
      vscode.window.activeTextEditor = {
        document: unsupportedDoc,
      } as vscode.TextEditor;

      vi.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue(unsupportedDoc);

      await openAnalysisPanel(mockContext);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('is not supported')
      );
    });

    it('should open analysis panel for supported language', async () => {
      vscode.window.activeTextEditor = mockEditor;
      vi.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue(mockDocument);

      const { AnalysisPanel } = await import('../views/analysis-panel.js');

      await openAnalysisPanel(mockContext);

      expect(AnalysisPanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        mockContext,
        mockDocument.uri
      );
    });

    it('should use provided file URI', async () => {
      const providedUri = vscode.Uri.file('/workspace/src/other.ts');
      const providedDoc = {
        ...mockDocument,
        uri: providedUri,
        languageId: 'typescript',
      } as vscode.TextDocument;

      vi.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue(providedDoc);

      const { AnalysisPanel } = await import('../views/analysis-panel.js');

      await openAnalysisPanel(mockContext, providedUri);

      expect(AnalysisPanel.createOrShow).toHaveBeenCalledWith(
        mockContext.extensionUri,
        mockContext,
        providedUri
      );
    });
  });
});

