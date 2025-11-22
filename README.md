# Goose Code Review

A VS Code extension for AI-assisted code review and analysis with UML diagram generation and Git change analysis.

## Features

- **UML Visualization**: Generate class diagrams, sequence diagrams, and flowcharts from code
- **Git Analysis**: Analyze working directory changes, branch comparisons, and Pull Requests
- **SonarQube Integration**: Fetch and display SonarQube analysis results directly in VS Code
- **AI-Powered Analysis**: Automated code quality, security, and performance analysis with OpenAI and Gemini
- **Multi-Language Support**: TypeScript, JavaScript, Java, and Python
- **Native VS Code Integration**: Seamless integration with VS Code's UI and workflows

## Installation

### Install from VS Code Marketplace (Recommended)

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Goose Code Review"
4. Click Install

Or install from command line:
```bash
code --install-extension kuochunchang.goose-code-review-vscode
```

### Install from Source (For Development)

```bash
# Clone the repository
git clone https://github.com/kuochunchang/code-review-goose.git
cd code-review-goose

# Install dependencies
npm install

# Build all packages
npm run build

# Package the extension
cd packages/vscode-extension
npm run package

# Install the .vsix file in VS Code
code --install-extension goose-code-review-vscode-*.vsix
```

## Quick Start

After installation:

1. Open a TypeScript, JavaScript, Java, or Python file in VS Code
2. Use keyboard shortcuts or command palette:
   - **Cmd+Shift+A** (Mac) / **Ctrl+Shift+A** (Windows/Linux): Open Analysis Panel
   - **Cmd+Shift+U** (Mac) / **Ctrl+Shift+U** (Windows/Linux): Open UML Panel
   - **Cmd+Shift+G** (Mac) / **Ctrl+Shift+G** (Windows/Linux): Open Git Change Analysis

Or use the command palette (Cmd+Shift+P / Ctrl+Shift+P):
- Search for "Goose Code Review"
- Select the desired command

## Usage

### UML Diagram Generation

1. Open a source code file
2. Press **Cmd+Shift+U** (Mac) or **Ctrl+Shift+U** (Windows/Linux)
3. Select diagram type (Class, Sequence, or Flowchart)
4. Configure analysis depth and mode
5. View the generated diagram in the panel

### Git Change Analysis

1. Press **Cmd+Shift+G** (Mac) or **Ctrl+Shift+G** (Windows/Linux)
2. Or click the Goose icon in the Source Control view
3. Select analysis type:
   - **Working Directory**: Analyze uncommitted changes
   - **Branch Comparison**: Compare two branches
   - **Pull Request**: Analyze a GitHub PR
4. View analysis results with SonarQube integration (if configured)

### SonarQube Integration

1. Open Settings (Cmd+, / Ctrl+,)
2. Search for "Goose Code Review"
3. Configure SonarQube connection:
   - Add connection ID and server URL
   - Bind your project to a SonarQube project
4. SonarQube issues will automatically appear in Git analysis results

## Supported Languages

Goose Code Review supports multiple programming languages:

- **TypeScript** (`.ts`, `.tsx`, `.mts`, `.cts`) - Full support with class diagrams, sequence diagrams, and flowcharts
- **JavaScript** (`.js`, `.jsx`, `.mjs`, `.cjs`) - Full support with class diagrams, sequence diagrams, and flowcharts
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

## Configuration

### AI Provider Setup

Configure AI providers through VS Code settings:

1. Open Settings (Cmd+, / Ctrl+,)
2. Search for "Goose Code Review"
3. Configure your preferred AI provider:

**OpenAI Configuration**:
- Set `AI Provider` to "openai"
- Enter your OpenAI API Key (stored securely in VS Code Secret Storage)
- Select model (default: gpt-4o)

**Gemini Configuration**:
- Set `AI Provider` to "gemini"
- Enter your Gemini API Key (stored securely in VS Code Secret Storage)
- Select model (default: gemini-2.5-flash)

**Custom OpenAI-Compatible API**:
- Enable `Use Custom API`
- Set `Custom API URL` (e.g., https://your-api.com/v1)
- Set `Custom Model Name`

**Get API Keys**:
- OpenAI: Visit [OpenAI Platform](https://platform.openai.com/api-keys)
- Gemini: Visit [Google AI Studio](https://aistudio.google.com/app/apikey)

### Advanced Configuration

Additional settings available in VS Code:

- **Analysis Depth**: Depth of relationship analysis (1-5, default: 2)
- **Analysis Mode**: Focused or comprehensive analysis
- **Show Private Members**: Include private members in class diagrams
- **Auto Refresh**: Automatically refresh diagrams when file changes
- **SonarQube Settings**: Configure SonarQube connections and project bindings

## Development

For development setup and contribution guidelines, see:

- [Development Guide](./docs/DEVELOPMENT.md)

## License

MIT License
