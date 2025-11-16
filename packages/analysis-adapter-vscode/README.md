# @code-review-goose/analysis-adapter-vscode

VS Code file system adapter for the code analysis engine.

## Overview

This package provides a VS Code-specific implementation of the `IFileProvider` interface, enabling the core analysis engine to work seamlessly within VS Code extensions.

## Features

- **VS Code API Integration**: Uses `vscode.workspace.fs` for file operations
- **Workspace-aware**: Respects VS Code workspace settings and multi-root workspaces
- **Security**: Built-in path validation to prevent access outside workspace
- **URI Handling**: Native support for VS Code URI scheme

## Installation

```bash
npm install @code-review-goose/analysis-adapter-vscode
```

## Usage

```typescript
import * as vscode from 'vscode';
import { VSCodeFileProvider } from '@code-review-goose/analysis-adapter-vscode';
import { UMLAnalyzer } from '@code-review-goose/analysis-core';

// In your VS Code extension
export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0];

  if (workspaceRoot) {
    const fileProvider = new VSCodeFileProvider(workspaceRoot.uri);
    const analyzer = new UMLAnalyzer(fileProvider);

    // Use analyzer to generate UML diagrams
    const result = await analyzer.analyzeClass(filePath, { depth: 2 });
  }
}
```

## API

### `VSCodeFileProvider`

Implements `IFileProvider` interface using VS Code APIs.

#### Constructor

```typescript
constructor(workspaceUri: vscode.Uri)
```

**Parameters:**
- `workspaceUri`: The workspace root URI

#### Methods

All methods implement the `IFileProvider` interface:

- `readFile(path: string): Promise<string>` - Read file content
- `resolveImport(from: string, to: string): Promise<string | null>` - Resolve import paths
- `listFiles(pattern: string): Promise<string[]>` - List files matching glob pattern
- `exists(path: string): Promise<boolean>` - Check if file exists

## Dependencies

- `@code-review-goose/analysis-types` - Shared type definitions
- `vscode` - VS Code extension API (peer dependency)

## License

MIT
