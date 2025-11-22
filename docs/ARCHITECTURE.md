# Goose Code Review Architecture Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Core Architecture Principles](#core-architecture-principles)
4. [Package Details](#package-details)
5. [Dependency Flow](#dependency-flow)
6. [Key Design Patterns](#key-design-patterns)
7. [File Provider Abstraction](#file-provider-abstraction)
8. [UML Analysis Pipeline](#uml-analysis-pipeline)
9. [Testing Strategy](#testing-strategy)
10. [Build and Deployment](#build-and-deployment)

---

## Overview

Goose Code Review is a VS Code extension for AI-assisted code review and analysis, built on a modular, platform-agnostic architecture. The project uses a monorepo structure with independent packages that enable code reuse and extensibility.

### Key Features

- **VS Code Integration**: Native VS Code extension with UML diagram generation and Git change analysis
- **Multi-Language Support**: TypeScript, JavaScript, Java, and Python with dedicated parsers
- **Git Analysis**: Working directory changes, branch comparison, and Pull Request analysis
- **SonarQube Integration**: Fetch and display SonarQube analysis results directly in VS Code
- **AI-Powered Analysis**: Support for OpenAI and Google Gemini models
- **Platform Independence**: Core analysis engine has zero dependencies on platform-specific APIs
- **Extensibility**: Modular architecture makes it easy to add new languages, diagram types, or analysis modes

---

## Monorepo Structure

```
code-review-goose/
├── packages/
│   ├── analysis-types/              # 🔷 Type definitions (zero dependencies)
│   ├── analysis-utils/              # 🔷 Shared utilities
│   ├── analysis-core/               # 🔷 Platform-agnostic analysis engine
│   ├── analysis-adapter-node/       # 🔷 Node.js file system adapter
│   ├── analysis-adapter-vscode/     # 🔷 VS Code file system adapter
│   ├── analysis-parser-common/      # 🔷 Common parser utilities
│   ├── analysis-parser-typescript/  # 🔷 TypeScript/JavaScript parser
│   ├── analysis-parser-java/        # 🔷 Java parser
│   ├── analysis-parser-python/      # 🔷 Python parser
│   ├── git-analyzer/                # 🔷 Git change analysis & SonarQube integration
│   └── vscode-extension/            # ✅ VS Code Extension (main application)
│
├── docs/
│   ├── ARCHITECTURE.md              # This file
│   └── DEVELOPMENT.md               # Development guide
│
├── tsconfig.base.json               # Shared TypeScript config
├── .changeset/                      # Version management
└── package.json                     # Workspace root
```

**Legend:**
- 🔷 = Core library packages
- ✅ = Application package (VS Code Extension)

---

## Core Architecture Principles

### 1. **Dependency Inversion Principle**

The core analysis engine depends on abstractions (`IFileProvider`), not concrete implementations. This allows the same code to run on:
- Node.js (using `fs-extra`)
- VS Code (using `vscode.workspace.fs`)
- Browser (using in-memory file system)

```typescript
// Core engine depends on abstraction
class UMLAnalyzer {
  constructor(private fileProvider: IFileProvider) {}
}

// Different platforms provide implementations
const nodeProvider = new NodeFileProvider('/project/path');
const vscodeProvider = new VSCodeFileProvider();
```

### 2. **Platform-Agnostic Core**

`@code-review-goose/analysis-core` has:
- ✅ **No** `fs`, `path`, or Node.js APIs
- ✅ **No** browser-specific APIs
- ✅ **No** VS Code APIs
- ✅ **Only** pure TypeScript + Babel parser

This enables:
- Fast unit testing with mocked file providers (< 1 second)
- Code reuse across platforms
- Easy debugging and maintenance

### 3. **Layered Architecture**

```
┌─────────────────────────────────────────┐
│   Application Layer (Web, CLI, VSCode) │
├─────────────────────────────────────────┤
│   Adapter Layer (Node, VSCode, Browser)│
├─────────────────────────────────────────┤
│   Core Engine (Platform-Agnostic)      │
├─────────────────────────────────────────┤
│   Utilities & Types (Shared)           │
└─────────────────────────────────────────┘
```

---

## Package Details

### 📦 @code-review-goose/analysis-types

**Purpose**: Shared type definitions

**Key Exports**:
- `IFileProvider` - File system abstraction
- `ClassInfo`, `MethodInfo`, `PropertyInfo` - AST types
- `UMLResult`, `DiagramType` - UML types

**Dependencies**: None (zero runtime dependencies)

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-utils

**Purpose**: Shared utility functions

**Key Exports**:
- `MermaidValidator` - Validate Mermaid syntax
- AST helper functions

**Dependencies**:
- `@code-review-goose/analysis-types`

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-core

**Purpose**: Platform-agnostic UML analysis engine

**Key Components**:
- `UMLAnalyzer` - Main analyzer (class, sequence, flowchart)
- `OOAnalyzer` - Object-oriented relationship analysis
- `SequenceAnalyzer` - Method call sequence analysis
- `CrossFileAnalyzer` - Cross-file dependency analysis

**Dependencies**:
- `@code-review-goose/analysis-types`
- `@code-review-goose/analysis-utils`
- `@babel/parser`, `@babel/traverse`, `@babel/types`

**Published**: Yes (public npm package)

**Platform Independence**: ✅ Complete

---

### 📦 @code-review-goose/analysis-adapter-node

**Purpose**: Node.js file system implementation

**Key Components**:
- `NodeFileProvider` - Implements `IFileProvider` using `fs-extra`
- `PathResolver` - Resolve import paths
- `ImportIndexBuilder` - Build import index for reverse dependencies

**Dependencies**:
- `@code-review-goose/analysis-types`
- `fs-extra`, `glob`

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-adapter-vscode

**Purpose**: VS Code file system implementation

**Key Components**:
- `VSCodeFileProvider` - Implements `IFileProvider` using `vscode.workspace.fs`
- Integrates with VS Code workspace APIs

**Dependencies**:
- `@code-review-goose/analysis-types`
- `vscode` (VS Code Extension API)

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-parser-common

**Purpose**: Common utilities for language parsers

**Key Components**:
- Shared parser interfaces and utilities
- Common AST traversal helpers

**Dependencies**:
- `@code-review-goose/analysis-types`

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-parser-typescript

**Purpose**: TypeScript and JavaScript parser using Tree-sitter

**Key Components**:
- TypeScript/JavaScript AST parsing
- Class, method, and property extraction

**Dependencies**:
- `@code-review-goose/analysis-types`
- `@code-review-goose/analysis-parser-common`
- `tree-sitter`, `tree-sitter-typescript`

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-parser-java

**Purpose**: Java parser using Tree-sitter

**Key Components**:
- Java AST parsing
- Support for inheritance, interfaces, and generics

**Dependencies**:
- `@code-review-goose/analysis-types`
- `@code-review-goose/analysis-parser-common`
- `tree-sitter`, `tree-sitter-java`

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/analysis-parser-python

**Purpose**: Python parser using Tree-sitter

**Key Components**:
- Python AST parsing
- Support for classes, inheritance, and type hints

**Dependencies**:
- `@code-review-goose/analysis-types`
- `@code-review-goose/analysis-parser-common`
- `tree-sitter`, `tree-sitter-python`

**Published**: Yes (public npm package)

---

### 📦 @code-review-goose/git-analyzer

**Purpose**: Git change analysis with SonarQube and AI integration

**Key Components**:
- `GitChangeAnalyzer` - Analyze working directory changes
- `BranchComparisonAnalyzer` - Compare branches
- `PullRequestAnalyzer` - Analyze GitHub Pull Requests
- `SonarQubeService` - Fetch and integrate SonarQube analysis results

**Dependencies**:
- `@code-review-goose/analysis-types`
- `simple-git`, `@octokit/rest`, `sonarqube-scanner`

**Published**: Yes (public npm package)

---

### 📦 goose-code-review-vscode

**Purpose**: VS Code Extension (main application)

**Key Features**:
- UML diagram generation (class, sequence, flowchart)
- Git change analysis (working directory, branch comparison, PR)
- SonarQube integration
- AI-powered code analysis (OpenAI and Gemini)
- Multi-language support (TypeScript, JavaScript, Java, Python)

**Dependencies**:
- `@code-review-goose/analysis-core`
- `@code-review-goose/analysis-adapter-vscode`
- `@code-review-goose/git-analyzer`
- `openai`, `@google/generative-ai`

**Published**: Yes (VS Code Marketplace)

---

## Dependency Flow

### Package Dependency Graph

```
analysis-types (zero deps)
    ↑
    ├─── analysis-utils
    ↑         ↑
    ├─────────┼─── analysis-core
    ↑         ↑         ↑
    ├─────────┴─────────┼─── analysis-adapter-node
    ↑                   ↑
    ├───────────────────┼─── analysis-adapter-vscode
    ↑                   ↑         ↑
    ├─── analysis-parser-common   │
    ↑         ↑                   │
    ├─────────┼─── analysis-parser-typescript
    ↑         ↑                   │
    ├─────────┼─── analysis-parser-java
    ↑         ↑                   │
    ├─────────┼─── analysis-parser-python
    ↑                             │
    └─── git-analyzer             │
              ↑                   ↑
              └───────────────────┼─── vscode-extension
```

### Build Order

1. `analysis-types` (no dependencies)
2. `analysis-utils` (depends on types)
3. `analysis-core` (depends on types + utils)
4. `analysis-adapter-node` (depends on types)
5. `analysis-adapter-vscode` (depends on types)
6. `analysis-parser-common` (depends on types)
7. `analysis-parser-typescript` (depends on types + parser-common)
8. `analysis-parser-java` (depends on types + parser-common)
9. `analysis-parser-python` (depends on types + parser-common)
10. `git-analyzer` (depends on types)
11. `vscode-extension` (depends on core, adapter-vscode, git-analyzer)

**TypeScript Project References** ensure correct build order automatically.

---

## Key Design Patterns

### 1. **Adapter Pattern**

File system operations are abstracted through `IFileProvider`:

```typescript
// Interface (in analysis-types)
export interface IFileProvider {
  readFile(path: string): Promise<string>;
  resolveImport(from: string, to: string): Promise<string | null>;
  listFiles(pattern: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}

// Node.js Implementation (in analysis-adapter-node)
export class NodeFileProvider implements IFileProvider {
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }
  // ...
}

// VS Code Implementation (future)
export class VSCodeFileProvider implements IFileProvider {
  async readFile(path: string): Promise<string> {
    const uri = vscode.Uri.file(path);
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString('utf-8');
  }
  // ...
}
```

### 2. **Dependency Injection**

Analyzers receive file provider through constructor injection:

```typescript
// Core analyzer (platform-agnostic)
export class UMLAnalyzer {
  constructor(private fileProvider: IFileProvider) {}

  async generateDiagram(filePath: string): Promise<UMLResult> {
    const code = await this.fileProvider.readFile(filePath);
    // Analysis logic...
  }
}

// Usage in server (Node.js)
const fileProvider = new NodeFileProvider(projectPath);
const analyzer = new UMLAnalyzer(fileProvider);
const result = await analyzer.generateUnifiedDiagram(filePath, type, options);
```

### 3. **Strategy Pattern**

Different analysis modes (forward, reverse, bidirectional) are implemented as strategies:

```typescript
const result = await analyzer.generateUnifiedDiagram(filePath, 'class', {
  depth: 2,
  mode: 'bidirectional', // or 'forward' or 'reverse'
});
```

---

## File Provider Abstraction

### Why Abstraction?

1. **Platform Independence**: Core logic works in Node.js, Browser, VS Code
2. **Testability**: Easy to mock file system for unit tests
3. **Flexibility**: Swap implementations without changing core code
4. **Security**: Validate file access at adapter layer

### Interface Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `readFile(path)` | Read file content | `await provider.readFile('src/index.ts')` |
| `resolveImport(from, to)` | Resolve import path | `await provider.resolveImport('src/a.ts', './b')` |
| `listFiles(pattern)` | List matching files | `await provider.listFiles('**/*.ts')` |
| `exists(path)` | Check existence | `await provider.exists('package.json')` |

### Implementations

| Provider | Platform | Module Used | Status |
|----------|----------|-------------|--------|
| `NodeFileProvider` | Node.js | `fs-extra` | ✅ Implemented |
| `VSCodeFileProvider` | VS Code | `vscode.workspace.fs` | ✅ Implemented |
| `BrowserFileProvider` | Browser | In-memory FS | 🚧 Future |

---

## UML Analysis Pipeline

### Single-File Analysis (depth = 0)

```
User Request
    ↓
Server Route (/api/uml/generate)
    ↓
Create NodeFileProvider(projectPath)
    ↓
Create UMLAnalyzer(fileProvider)
    ↓
analyzer.generateUnifiedDiagram(filePath, type, { depth: 0 })
    ↓
fileProvider.readFile(filePath)
    ↓
Parse AST (@babel/parser)
    ↓
Extract Classes/Methods/Properties
    ↓
Generate Mermaid Code
    ↓
Validate Mermaid (MermaidValidator)
    ↓
Return UMLResult
```

### Cross-File Analysis (depth > 0)

```
analyzer.generateUnifiedDiagram(filePath, 'class', { depth: 2, mode: 'bidirectional' })
    ↓
CrossFileAnalyzer.analyzeBidirectional(filePath, depth)
    ↓
┌─────────────────────────┬─────────────────────────┐
│   Forward Analysis      │   Reverse Analysis      │
│   (who I import)        │   (who imports me)      │
├─────────────────────────┼─────────────────────────┤
│ BFS traversal           │ Build import index      │
│ Follow imports          │ Reverse dependency      │
│ Respect depth limit     │ Respect depth limit     │
└─────────────────────────┴─────────────────────────┘
    ↓
Merge Results (allClasses, relationships)
    ↓
OOAnalyzer.analyze(classes, imports)
    ↓
Detect OO Relationships:
  - Inheritance (extends)
  - Implementation (implements)
  - Composition (has-a, strong)
  - Aggregation (uses, weak)
  - Association (imports)
    ↓
Generate Mermaid Class Diagram
    ↓
Return UMLResult with metadata
```

---

## Testing Strategy

### Test Levels

| Level | Tool | Coverage Target | Run Time | Focus |
|-------|------|-----------------|----------|-------|
| Unit (Core) | Vitest + Mock | 80%+ | < 1 sec | Core logic with mocked file provider |
| Unit (Adapter) | Vitest + Real Files | 70%+ | < 5 sec | File operations with test fixtures |
| Integration (Server) | Vitest + Supertest | 60%+ | < 10 sec | API endpoints |
| E2E (Web) | Playwright | 80%+ | 30-60 sec | User workflows |

### Testing Core Logic (Fast)

```typescript
// Test with mocked file provider
import { UMLAnalyzer } from '@code-review-goose/analysis-core';

const mockProvider: IFileProvider = {
  readFile: vi.fn(async (path) => {
    if (path === 'test.ts') return 'class Foo {}';
    throw new Error('File not found');
  }),
  resolveImport: vi.fn(),
  listFiles: vi.fn(),
  exists: vi.fn(),
};

const analyzer = new UMLAnalyzer(mockProvider);
const result = await analyzer.generateDiagram('test.ts', 'class');

expect(result.mermaidCode).toContain('class Foo');
```

**Benefits**:
- ✅ No real file I/O (fast!)
- ✅ Deterministic (no flaky tests)
- ✅ Easy to test edge cases

---

## Build and Deployment

### Build Process

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build All Packages** (TypeScript Project References)
   ```bash
   npm run build
   # OR
   tsc --build
   ```

   Build order (automatic):
   - analysis-types → analysis-utils → analysis-core
   - analysis-adapter-node
   - server → web → cli

3. **Run Tests**
   ```bash
   npm test                # Unit tests
   npm run test:coverage   # Coverage report
   npm run test:e2e        # E2E tests
   ```

### Version Management (Changesets)

```bash
# 1. Create changeset
npx changeset

# 2. Version packages
npx changeset version

# 3. Publish to npm
npx changeset publish
```

### Published Packages

| Package | Visibility | npm/Marketplace Package Name |
|---------|------------|------------------------------|
| analysis-types | Public | `@code-review-goose/analysis-types` |
| analysis-utils | Public | `@code-review-goose/analysis-utils` |
| analysis-core | Public | `@code-review-goose/analysis-core` |
| analysis-adapter-node | Public | `@code-review-goose/analysis-adapter-node` |
| analysis-adapter-vscode | Public | `@code-review-goose/analysis-adapter-vscode` |
| analysis-parser-common | Public | `@code-review-goose/analysis-parser-common` |
| analysis-parser-typescript | Public | `@code-review-goose/analysis-parser-typescript` |
| analysis-parser-java | Public | `@code-review-goose/analysis-parser-java` |
| analysis-parser-python | Public | `@code-review-goose/analysis-parser-python` |
| git-analyzer | Public | `@code-review-goose/git-analyzer` |
| vscode-extension | Public | VS Code Marketplace: `goose-code-review-vscode` |

---

## Future Enhancements

### Planned Features

**Enhanced Language Support**:
```
packages/
├── analysis-parser-go/         # 🚧 Go language parser
├── analysis-parser-rust/       # 🚧 Rust language parser
└── analysis-parser-csharp/     # 🚧 C# language parser
```

**Additional Tools**:
```
packages/
├── cli/                        # 🚧 Standalone CLI tool (like original)
├── server/                     # 🚧 Web server for browser interface
└── web/                        # 🚧 Browser-based UI
```

**Advanced Analysis**:
```
packages/
├── dependency-analyzer/        # 🚧 Dependency graph analysis
├── code-quality-analyzer/      # 🚧 Code smell detection
└── security-analyzer/          # 🚧 Security vulnerability scanning
```

**Benefits of Current Architecture**:
- ✅ All future tools can reuse `analysis-core` infrastructure
- ✅ Language parsers are modular and independent
- ✅ Easy to add new platforms (browser, CLI, etc.)

---

## Usage Examples

### VS Code Extension

```typescript
// Extension activation (extension.ts)
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { VSCodeFileProvider } from '@code-review-goose/analysis-adapter-vscode';

// Create file provider for current workspace
const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
const fileProvider = new VSCodeFileProvider(workspaceRoot);

// Create analyzer
const analyzer = new UMLAnalyzer(fileProvider);

// Generate UML diagram
const result = await analyzer.generateUnifiedDiagram(
  filePath, 
  'class', 
  { depth: 2, mode: 'bidirectional' }
);
```

### Git Change Analysis

```typescript
// Git analysis service (git-analysis-service.ts)
import { GitChangeAnalyzer } from '@code-review-goose/git-analyzer';

const analyzer = new GitChangeAnalyzer(workspaceRoot);

// Analyze working directory changes
const changes = await analyzer.analyzeWorkingDirectory();

// Analyze branch comparison
const comparison = await analyzer.compareBranches('main', 'feature-branch');

// Analyze Pull Request
const prAnalysis = await analyzer.analyzePullRequest(owner, repo, prNumber);
```

---

## Performance Considerations

### Caching Strategy

1. **AST Cache** (in CrossFileAnalyzer):
   - Cache parsed AST per file
   - Invalidate on file mtime change
   - Reduces parse time by 80%+

2. **Import Index Cache** (in ImportIndexBuilder):
   - Cache reverse dependency index
   - TTL: 30 minutes
   - Used for reverse dependency analysis

3. **Insights Cache** (in InsightService):
   - Cache UML diagrams, analysis results
   - Stored in `.code-review/insights/`
   - Invalidate on code hash change

### Optimization Techniques

- **Parallel Processing**: `p-limit` for concurrent file operations
- **Lazy Loading**: Analyze files on-demand
- **Depth Limiting**: User-configurable max depth (0-3)
- **Early Exit**: Stop traversal at max depth

---

## Security Considerations

### File Access Validation

```typescript
// NodeFileProvider validates paths
private isWithinProject(filePath: string): boolean {
  const normalized = path.resolve(filePath);
  return normalized.startsWith(this.normalizedBasePath);
}
```

Prevents directory traversal attacks (e.g., `../../etc/passwd`).

### API Key Protection

- ✅ API keys stored in `.code-review/config.json` (gitignored)
- ✅ Never logged or exposed in errors
- ✅ Loaded from config service only

---

## Troubleshooting

### Build Fails

**Symptom**: `tsc --build` errors

**Solution**:
```bash
npm run clean
npm install
npm run build
```

### Import Errors

**Symptom**: `Cannot find module '@code-review-goose/analysis-core'`

**Solution**: Ensure packages are built in correct order
```bash
tsc --build --force
```

### Tests Fail After Refactoring

**Symptom**: Old service imports fail

**Solution**: Update test imports to use new packages
```typescript
// Old
import { UMLService } from '../services/umlService.js';

// New
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';
```

---

## References

- **Development Guide**: [docs/DEVELOPMENT.md](./DEVELOPMENT.md)
- **Project Instructions**: [AGENT.md](../AGENT.md)
- **Repository**: https://github.com/kuochunchang/code-review-goose
- **VS Code Marketplace**: https://marketplace.visualstudio.com/items?itemName=kuochunchang.goose-code-review-vscode

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 3.0 | 2025-11-23 | VS Code Extension complete - Git analysis, SonarQube integration, multi-language support |
| 2.0 | 2025-11-16 | Core packages refactored - Modular architecture with language parsers |
| 1.0 | 2025-01-16 | Initial monorepo setup - Core analysis packages created |

---

**Author**: KCC  
**License**: MIT  
**Status**: ✅ Production Ready (VS Code Extension)
