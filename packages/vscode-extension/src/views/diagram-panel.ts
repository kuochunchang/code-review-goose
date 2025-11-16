/**
 * Diagram Panel
 * Webview panel for displaying Mermaid diagrams
 */

import * as vscode from 'vscode';

export class DiagramPanel {
  public static currentPanel: DiagramPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri
  ) {
    this._panel = panel;

    // Set initial HTML content
    this._panel.webview.html = this.getWebviewContent('', 'class');

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
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
    title: string,
    subtitle?: string
  ): DiagramPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DiagramPanel.currentPanel) {
      DiagramPanel.currentPanel._panel.reveal(column);
      DiagramPanel.currentPanel._panel.title = title + (subtitle ? ` - ${subtitle}` : '');
      return DiagramPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'gooseCodeReviewDiagram',
      title + (subtitle ? ` - ${subtitle}` : ''),
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    DiagramPanel.currentPanel = new DiagramPanel(panel, extensionUri);
    return DiagramPanel.currentPanel;
  }

  /**
   * Update diagram content
   */
  public updateDiagram(mermaidCode: string, diagramType: 'class' | 'sequence' | 'flowchart'): void {
    this._panel.webview.html = this.getWebviewContent(mermaidCode, diagramType);
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
   * Get webview HTML content
   */
  private getWebviewContent(mermaidCode: string, diagramType: string): string {
    // Security: Use nonce for inline scripts
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
    <title>Goose Code Review - ${diagramType} Diagram</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            margin: 0;
            overflow: auto;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
        }

        .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header h1 {
            margin: 0;
            font-size: 1.5em;
            font-weight: 600;
        }

        .diagram-container {
            background-color: var(--vscode-editor-background);
            padding: 20px;
            border-radius: 4px;
            overflow: auto;
            text-align: center;
        }

        .mermaid {
            display: inline-block;
            text-align: left;
        }

        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 4px;
            margin: 20px 0;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .controls {
            margin: 20px 0;
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn:active {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦆 Goose Code Review - ${this.capitalizeFirst(diagramType)} Diagram</h1>
        </div>

        ${
          mermaidCode
            ? `
        <div class="controls">
            <button class="btn" onclick="copyToClipboard()">Copy Mermaid Code</button>
            <button class="btn" onclick="downloadSVG()">Download SVG</button>
        </div>

        <div class="diagram-container">
            <div class="mermaid">
${mermaidCode}
            </div>
        </div>
        `
            : `
        <div class="empty-state">
            <p>No diagram to display. Generate a diagram using the command palette or context menu.</p>
        </div>
        `
        }
    </div>

    <script type="module" nonce="${nonce}">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: document.body.classList.contains('vscode-dark') ||
                   document.body.classList.contains('vscode-high-contrast') ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'var(--vscode-font-family)',
        });

        // Copy to clipboard function
        window.copyToClipboard = () => {
            const mermaidCode = \`${mermaidCode.replace(/`/g, '\\`')}\`;
            navigator.clipboard.writeText(mermaidCode).then(() => {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'info',
                    text: 'Mermaid code copied to clipboard'
                });
            }).catch(err => {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'error',
                    text: 'Failed to copy to clipboard: ' + err.message
                });
            });
        };

        // Download SVG function
        window.downloadSVG = async () => {
            try {
                const svgElement = document.querySelector('.mermaid svg');
                if (!svgElement) {
                    throw new Error('No SVG element found');
                }

                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgElement);
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = 'diagram-${Date.now()}.svg';
                a.click();

                URL.revokeObjectURL(url);

                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'info',
                    text: 'SVG downloaded successfully'
                });
            } catch (err) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'error',
                    text: 'Failed to download SVG: ' + err.message
                });
            }
        };

        // Handle Mermaid errors
        window.addEventListener('error', (event) => {
            if (event.message.includes('mermaid')) {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'error',
                    text: 'Failed to render diagram: ' + event.message
                });
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Capitalize first letter of a string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
