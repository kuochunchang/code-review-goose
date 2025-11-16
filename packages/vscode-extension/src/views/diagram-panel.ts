/**
 * Interactive Diagram Panel
 * Unified webview panel for displaying UML diagrams with interactive controls
 */

import * as vscode from 'vscode';
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { VSCodeFileProvider } from '@code-review-goose/analysis-adapter-vscode';

export type DiagramType = 'class' | 'sequence' | 'flowchart';
export type AnalysisMode = 'forward' | 'reverse' | 'bidirectional';

export interface DiagramOptions {
  depth: 0 | 1 | 2 | 3;
  mode: AnalysisMode;
}

export class DiagramPanel {
  public static currentPanel: DiagramPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  // Current state
  private _currentFile: vscode.Uri | undefined;
  private _currentType: DiagramType = 'class';
  private _currentOptions: DiagramOptions = { depth: 1, mode: 'bidirectional' };
  private _mermaidCode: string = '';

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set initial HTML content
    this._updateWebview();

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'regenerate':
            await this._handleRegenerate(message.type, message.options);
            break;
          case 'error':
            vscode.window.showErrorMessage(message.text);
            break;
          case 'info':
            vscode.window.showInformationMessage(message.text);
            break;
        }
      },
      null,
      this._disposables
    );

    // Clean up when panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  /**
   * Create or show the diagram panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    file?: vscode.Uri
  ): DiagramPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DiagramPanel.currentPanel) {
      DiagramPanel.currentPanel._panel.reveal(column);
      if (file) {
        DiagramPanel.currentPanel._currentFile = file;
        DiagramPanel.currentPanel._generateDiagram();
      }
      return DiagramPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'gooseCodeReviewUML',
      '🦆 UML Diagram',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    DiagramPanel.currentPanel = new DiagramPanel(panel, extensionUri);

    if (file) {
      DiagramPanel.currentPanel._currentFile = file;
      DiagramPanel.currentPanel._generateDiagram();
    }

    return DiagramPanel.currentPanel;
  }

  /**
   * Generate diagram for current file with current settings
   */
  public async generateDiagram(
    file: vscode.Uri,
    type?: DiagramType,
    options?: Partial<DiagramOptions>
  ): Promise<void> {
    this._currentFile = file;

    if (type) {
      this._currentType = type;
    }

    if (options) {
      this._currentOptions = { ...this._currentOptions, ...options };
    }

    await this._generateDiagram();
  }

  /**
   * Handle regenerate request from webview
   */
  private async _handleRegenerate(type: DiagramType, options: DiagramOptions): Promise<void> {
    this._currentType = type;
    this._currentOptions = options;
    await this._generateDiagram();
  }

  /**
   * Generate diagram with current settings
   */
  private async _generateDiagram(): Promise<void> {
    if (!this._currentFile) {
      return;
    }

    try {
      // Show loading state
      this._panel.webview.postMessage({
        command: 'loading',
        isLoading: true,
      });

      // Get workspace folder
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(this._currentFile);
      if (!workspaceFolder) {
        throw new Error('File is not in a workspace');
      }

      // Create file provider and analyzer
      const fileProvider = new VSCodeFileProvider(workspaceFolder.uri);
      const analyzer = new UMLAnalyzer(fileProvider);

      // Determine options based on diagram type
      const generateOptions =
        this._currentType === 'class'
          ? {
              depth: this._currentOptions.depth,
              mode: this._currentOptions.mode,
            }
          : {
              depth: 0, // Sequence and flowchart only support single-file (depth 0)
            };

      // Generate diagram
      const result = await analyzer.generateUnifiedDiagram(
        this._currentFile.fsPath,
        this._currentType,
        generateOptions
      );

      this._mermaidCode = result.mermaidCode;

      // Update webview
      this._updateWebview();

      // Notify webview that loading is complete
      this._panel.webview.postMessage({
        command: 'loaded',
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Notify webview about error
      this._panel.webview.postMessage({
        command: 'error',
        text: errorMessage,
      });

      vscode.window.showErrorMessage(`Failed to generate diagram: ${errorMessage}`);
      console.error('Diagram generation error:', error);
    }
  }

  /**
   * Update webview content
   */
  private _updateWebview(): void {
    this._panel.webview.html = this._getWebviewContent();
  }

  /**
   * Dispose of the panel
   */
  public dispose(): void {
    DiagramPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Get webview HTML content with interactive controls
   */
  private _getWebviewContent(): string {
    const nonce = this._getNonce();
    const fileName = this._currentFile
      ? vscode.workspace.asRelativePath(this._currentFile)
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
    <title>Goose Code Review - UML Diagram</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .toolbar {
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex-shrink: 0;
        }

        .toolbar-row {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        .toolbar-label {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            min-width: 60px;
        }

        .btn-group {
            display: flex;
            gap: 4px;
        }

        .btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid transparent;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-family: var(--vscode-font-family);
            transition: all 0.2s;
            white-space: nowrap;
        }

        .btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .btn.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-focusBorder);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }

        .separator {
            width: 1px;
            height: 24px;
            background-color: var(--vscode-panel-border);
            margin: 0 8px;
        }

        .file-path {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family);
        }

        .diagram-container {
            flex: 1;
            overflow: auto;
            padding: 20px;
            text-align: center;
        }

        .mermaid {
            display: inline-block;
            text-align: left;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--vscode-descriptionForeground);
            gap: 12px;
        }

        .empty-state-icon {
            font-size: 48px;
            opacity: 0.5;
        }

        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--vscode-descriptionForeground);
            gap: 16px;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--vscode-progressBar-background);
            border-top-color: var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .tooltip {
            position: relative;
            display: inline-block;
        }

        .tooltip .tooltiptext {
            visibility: hidden;
            width: 200px;
            background-color: var(--vscode-editorHoverWidget-background);
            color: var(--vscode-editorHoverWidget-foreground);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            text-align: left;
            border-radius: 4px;
            padding: 8px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -100px;
            font-size: 12px;
            line-height: 1.4;
        }

        .tooltip:hover .tooltiptext {
            visibility: visible;
        }
    </style>
</head>
<body>
    <!-- Toolbar -->
    <div class="toolbar">
        <!-- Row 1: Diagram Type & Actions -->
        <div class="toolbar-row">
            <span class="toolbar-label">Type:</span>
            <div class="btn-group" id="typeSelector">
                <button class="btn ${this._currentType === 'class' ? 'active' : ''}" data-type="class">
                    Class
                </button>
                <button class="btn ${this._currentType === 'sequence' ? 'active' : ''}" data-type="sequence">
                    Sequence
                </button>
                <button class="btn ${this._currentType === 'flowchart' ? 'active' : ''}" data-type="flowchart">
                    Flowchart
                </button>
            </div>

            <div class="separator"></div>

            <button class="btn btn-primary" id="refreshBtn">
                ↻ Refresh
            </button>
            <button class="btn" id="copyBtn">
                Copy Code
            </button>
            <button class="btn" id="downloadBtn">
                Download SVG
            </button>
        </div>

        <!-- Row 2: Class Diagram Options -->
        <div class="toolbar-row" id="classOptions" style="display: ${this._currentType === 'class' ? 'flex' : 'none'}">
            <span class="toolbar-label tooltip">
                Depth:
                <span class="tooltiptext">
                    0: Single file only<br>
                    1-3: Cross-file analysis with increasing depth
                </span>
            </span>
            <div class="btn-group" id="depthSelector">
                <button class="btn ${this._currentOptions.depth === 0 ? 'active' : ''}" data-depth="0">0</button>
                <button class="btn ${this._currentOptions.depth === 1 ? 'active' : ''}" data-depth="1">1</button>
                <button class="btn ${this._currentOptions.depth === 2 ? 'active' : ''}" data-depth="2">2</button>
                <button class="btn ${this._currentOptions.depth === 3 ? 'active' : ''}" data-depth="3">3</button>
            </div>

            <span class="toolbar-label tooltip">
                Mode:
                <span class="tooltiptext">
                    Bidirectional: Both dependencies<br>
                    Forward: What this file imports<br>
                    Reverse: What imports this file
                </span>
            </span>
            <div class="btn-group" id="modeSelector">
                <button class="btn ${this._currentOptions.mode === 'bidirectional' ? 'active' : ''}"
                        data-mode="bidirectional"
                        ${this._currentOptions.depth === 0 ? 'disabled' : ''}>
                    Bidirectional
                </button>
                <button class="btn ${this._currentOptions.mode === 'forward' ? 'active' : ''}"
                        data-mode="forward"
                        ${this._currentOptions.depth === 0 ? 'disabled' : ''}>
                    Forward
                </button>
                <button class="btn ${this._currentOptions.mode === 'reverse' ? 'active' : ''}"
                        data-mode="reverse"
                        ${this._currentOptions.depth === 0 ? 'disabled' : ''}>
                    Reverse
                </button>
            </div>
        </div>

        ${fileName ? `<div class="file-path">📄 ${fileName}</div>` : ''}
    </div>

    <!-- Diagram Display -->
    <div class="diagram-container" id="diagramContainer">
        ${
          this._mermaidCode
            ? `<div class="mermaid">${this._mermaidCode}</div>`
            : `
        <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p>Select a TypeScript/JavaScript file and click Refresh to generate a UML diagram</p>
        </div>
        `
        }
    </div>

    <script type="module" nonce="${nonce}">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

        const vscode = acquireVsCodeApi();

        // State
        let state = {
            type: '${this._currentType}',
            depth: ${this._currentOptions.depth},
            mode: '${this._currentOptions.mode}',
            isLoading: false
        };

        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: document.body.classList.contains('vscode-dark') ||
                   document.body.classList.contains('vscode-high-contrast') ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'var(--vscode-font-family)',
        });

        // Event Listeners
        document.getElementById('typeSelector').addEventListener('click', (e) => {
            if (e.target.matches('.btn')) {
                const type = e.target.dataset.type;
                if (type && type !== state.type) {
                    state.type = type;
                    updateButtons();
                    regenerate();
                }
            }
        });

        document.getElementById('depthSelector').addEventListener('click', (e) => {
            if (e.target.matches('.btn')) {
                const depth = parseInt(e.target.dataset.depth);
                if (!isNaN(depth) && depth !== state.depth) {
                    state.depth = depth;
                    updateButtons();
                    regenerate();
                }
            }
        });

        document.getElementById('modeSelector').addEventListener('click', (e) => {
            if (e.target.matches('.btn:not([disabled])')) {
                const mode = e.target.dataset.mode;
                if (mode && mode !== state.mode) {
                    state.mode = mode;
                    updateButtons();
                    regenerate();
                }
            }
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            regenerate();
        });

        document.getElementById('copyBtn').addEventListener('click', () => {
            const mermaidCode = document.querySelector('.mermaid')?.textContent;
            if (mermaidCode) {
                navigator.clipboard.writeText(mermaidCode.trim()).then(() => {
                    vscode.postMessage({ type: 'info', text: 'Mermaid code copied to clipboard' });
                }).catch(err => {
                    vscode.postMessage({ type: 'error', text: 'Failed to copy: ' + err.message });
                });
            }
        });

        document.getElementById('downloadBtn').addEventListener('click', async () => {
            try {
                const svgElement = document.querySelector('.mermaid svg');
                if (!svgElement) {
                    throw new Error('No diagram to download');
                }

                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgElement);
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = \`diagram-\${state.type}-\${Date.now()}.svg\`;
                a.click();

                URL.revokeObjectURL(url);

                vscode.postMessage({ type: 'info', text: 'SVG downloaded successfully' });
            } catch (err) {
                vscode.postMessage({ type: 'error', text: 'Failed to download: ' + err.message });
            }
        });

        // Functions
        function regenerate() {
            vscode.postMessage({
                command: 'regenerate',
                type: state.type,
                options: {
                    depth: state.depth,
                    mode: state.mode
                }
            });
        }

        function updateButtons() {
            // Update type buttons
            document.querySelectorAll('#typeSelector .btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === state.type);
            });

            // Update depth buttons
            document.querySelectorAll('#depthSelector .btn').forEach(btn => {
                btn.classList.toggle('active', parseInt(btn.dataset.depth) === state.depth);
            });

            // Update mode buttons
            const modeButtons = document.querySelectorAll('#modeSelector .btn');
            modeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === state.mode);
                btn.disabled = state.depth === 0;
            });

            // Show/hide class options
            const classOptions = document.getElementById('classOptions');
            classOptions.style.display = state.type === 'class' ? 'flex' : 'none';
        }

        function showLoading() {
            const container = document.getElementById('diagramContainer');
            container.innerHTML = \`
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Generating \${state.type} diagram...</p>
                </div>
            \`;
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'loading':
                    if (message.isLoading) {
                        showLoading();
                    }
                    break;
                case 'loaded':
                    // Mermaid will auto-render when HTML updates
                    break;
                case 'error':
                    vscode.postMessage({ type: 'error', text: message.text });
                    break;
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate nonce for CSP
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
