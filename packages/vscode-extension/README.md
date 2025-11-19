# Goose Code Review - VS Code Extension

AI-assisted code review with UML diagram generation directly in Visual Studio Code.

## Features

### 🎨 UML Diagram Generation

Generate professional UML diagrams from your code:

- **Class Diagrams**: Visualize class structures, inheritance, and relationships
- **Sequence Diagrams**: Understand function call flows and interactions (TypeScript/JavaScript only)
- **Flowcharts**: Analyze control flow and logic paths (TypeScript/JavaScript only)

### 🌐 Multi-Language Support

Supports multiple programming languages:

- **TypeScript/JavaScript**: Full support (class, sequence, flowchart diagrams)
- **Java**: Class diagrams with inheritance, interfaces, and generics
- **Python**: Class diagrams with inheritance and type hints

### 🚀 Quick Access

- **Editor Title Bar**: Click the UML icon (graph) in the top-right corner of any supported file
- **Command Palette**: Access all features via `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- **Context Menu**: Right-click in any supported file to generate diagrams
- **Keyboard Shortcuts**: Press `Ctrl+Shift+U` (Windows/Linux) or `Cmd+Shift+U` (Mac) to open UML panel

### ⚙️ Customizable Settings

Fine-tune analysis behavior:

- **Analysis Depth**: Control how deep the analyzer traverses relationships (1-5)
- **Analysis Mode**: Choose between focused (direct relationships) or comprehensive (all dependencies)
- **Private Members**: Toggle visibility of private class members
- **Auto Refresh**: Automatically update diagrams when files change

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac) to open Extensions view
3. Search for "Goose Code Review"
4. Click **Install**

### From VSIX File

1. Download the `.vsix` file from the [Releases page](https://github.com/kuochunchang/code-review-goose/releases)
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded `.vsix` file

## Usage

### Quick Start: Open UML Panel

The fastest way to generate UML diagrams:

1. Open a supported file (TypeScript, JavaScript, Java, or Python)
2. **Click the UML icon (📊) in the editor title bar** (top-right corner)
3. Choose diagram type (Class/Sequence/Flowchart) in the interactive panel
4. Adjust analysis options (depth, mode) as needed

**Alternative methods:**
- **Keyboard**: Press `Ctrl+Shift+U` (Windows/Linux) or `Cmd+Shift+U` (Mac)
- **Context Menu**: Right-click in editor → "Open UML Panel"
- **Command Palette**: `Ctrl+Shift+P` → "Goose Code Review: Open UML Panel"

### Generate Class Diagram

1. Open a supported file (TypeScript, JavaScript, Java, or Python)
2. Use any quick access method above to open the UML panel
3. Click **"Class Diagram"** button
4. View the diagram with interactive controls (zoom, pan, copy, download)

### Generate Sequence Diagram

1. Open a TypeScript or JavaScript file (sequence diagrams currently only support TS/JS)
2. Right-click in the editor
3. Select **"Generate Sequence Diagram"**
4. Enter the function name to analyze
5. View the diagram in the webview panel

### Generate Flowchart

1. Open a TypeScript or JavaScript file (flowcharts currently only support TS/JS)
2. Right-click in the editor
3. Select **"Generate Flowchart"**
4. Enter the function name to analyze
5. View the diagram in the webview panel

## Configuration

Access settings via `File > Preferences > Settings` (Windows/Linux) or `Code > Preferences > Settings` (Mac), then search for "Goose Code Review".

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `gooseCodeReview.analysisDepth` | number | 2 | Depth of relationship analysis (1-5) |
| `gooseCodeReview.analysisMode` | string | "focused" | Analysis mode: "focused" or "comprehensive" |
| `gooseCodeReview.showPrivateMembers` | boolean | false | Include private members in class diagrams |
| `gooseCodeReview.autoRefresh` | boolean | true | Automatically refresh diagrams when file changes |

### Example Configuration

```json
{
  "gooseCodeReview.analysisDepth": 3,
  "gooseCodeReview.analysisMode": "comprehensive",
  "gooseCodeReview.showPrivateMembers": true,
  "gooseCodeReview.autoRefresh": true
}
```

## Supported Languages

### Full Support (All Diagram Types)

- **TypeScript** (`.ts`, `.tsx`, `.mts`, `.cts`) - Class, sequence, and flowchart diagrams
- **JavaScript** (`.js`, `.jsx`, `.mjs`, `.cjs`) - Class, sequence, and flowchart diagrams

### Class Diagrams Only

- **Java** (`.java`) - Class diagrams with inheritance, interfaces, and generics
- **Python** (`.py`, `.pyi`, `.pyw`) - Class diagrams with inheritance and type hints

### Language Features

| Feature | TypeScript | JavaScript | Java | Python |
|---------|-----------|------------|------|--------|
| Class Diagrams | ✅ | ✅ | ✅ | ✅ |
| Sequence Diagrams | ✅ | ✅ | ⏳ | ⏳ |
| Flowcharts | ✅ | ✅ | ⏳ | ⏳ |
| Inheritance | ✅ | ✅ | ✅ | ✅ |
| Interfaces | ✅ | ✅ | ✅ | ⏳ |
| Type Hints | ✅ | ⏳ | ✅ | ✅ |
| Generics | ✅ | ⏳ | ✅ | ✅ |
| Cross-file Analysis | ✅ | ✅ | ✅ | ✅ |

⏳ = Planned for future releases

## Requirements

- Visual Studio Code 1.85.0 or higher
- Active workspace (diagrams cannot be generated for standalone files)

## How It Works

The extension uses the Goose Code Review analysis engine to:

1. **Detect language** from file extension
2. **Parse code** using appropriate parser:
   - TypeScript/JavaScript: Babel parser
   - Java/Python: Tree-sitter parser
3. **Extract structures**: Classes, methods, relationships, imports
4. **Analyze dependencies** and call flows
5. **Generate Mermaid diagram syntax**
6. **Render diagrams** using Mermaid.js in a webview panel

All analysis happens locally on your machine - **no code is sent to external servers**.

## Tips & Tricks

### Export Diagrams

From the diagram webview:
- Click **"Copy Mermaid Code"** to copy the diagram syntax to clipboard
- Click **"Download SVG"** to save the diagram as an SVG file

### Optimize Performance

For large codebases:
- Use **"focused"** analysis mode for faster results
- Reduce analysis depth to 1-2 for quick overviews
- Use sequence diagrams only on specific functions

### Keyboard Shortcuts

You can set custom keyboard shortcuts for the commands:

1. Press `Ctrl+K Ctrl+S` (Windows/Linux) or `Cmd+K Cmd+S` (Mac)
2. Search for "Goose Code Review"
3. Click the `+` icon to add a keybinding

Example:
- `Ctrl+Alt+C`: Generate Class Diagram
- `Ctrl+Alt+S`: Generate Sequence Diagram
- `Ctrl+Alt+F`: Generate Flowchart

## Troubleshooting

### Extension Not Activating

- Ensure you have a workspace open (not just a single file)
- Check the output panel for error messages: `View > Output`, then select "Goose Code Review"

### Diagram Not Rendering

- Verify the file is a supported language (TypeScript, JavaScript, Java, or Python)
- Check for syntax errors in your code
- For sequence/flowchart diagrams, ensure the file is TypeScript or JavaScript
- Try reducing the analysis depth
- Check the browser console in the webview (Developer: Toggle Developer Tools)

### Performance Issues

- Use "focused" mode instead of "comprehensive"
- Reduce analysis depth to 1-2
- Close unused webview panels

## Privacy & Security

- **All analysis is local**: No code is sent to external servers
- **No telemetry**: The extension does not collect any usage data
- **Open source**: View the source code on [GitHub](https://github.com/kuochunchang/code-review-goose)

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](https://github.com/kuochunchang/code-review-goose/blob/main/CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](https://github.com/kuochunchang/code-review-goose/blob/main/LICENSE) for details.

## Support

- **Bug Reports**: [GitHub Issues](https://github.com/kuochunchang/code-review-goose/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/kuochunchang/code-review-goose/discussions)
- **Documentation**: [GitHub Wiki](https://github.com/kuochunchang/code-review-goose/wiki)

## Related Projects

- [Goose Code Review CLI](https://www.npmjs.com/package/@kuochunchang/goose-code-review) - Command-line tool with web interface
- [Analysis Core](https://www.npmjs.com/package/@code-review-goose/analysis-core) - Platform-agnostic analysis engine

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

**Enjoy using Goose Code Review!** 🦆
