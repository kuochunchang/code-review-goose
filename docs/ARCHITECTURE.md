# Goose Code Review Architecture Documentation

> Version: 2.0 (Post-Refactoring)
> Last Updated: 2025-11-16
> Status: Phase 5 & 6 Complete

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

Goose Code Review is a local AI-assisted code review tool built on a modular, platform-agnostic architecture. The project uses a monorepo structure with independent packages that enable code reuse across multiple platforms (Web, Node.js CLI, VS Code extension).

### Key Achievements

- **80%+ Code Reuse**: Core analysis logic shared across all platforms
- **Platform Independence**: Core engine has zero dependencies on Node.js/Browser APIs
- **Testability**: Core logic runs in milliseconds with mocked file providers
- **Extensibility**: Easy to add new diagram types, analysis modes, or platform adapters

---

## Monorepo Structure

```
code-review-goose/
├── packages/
│   ├── analysis-types/          # 🔷 Type definitions (zero dependencies)
│   ├── analysis-utils/          # 🔷 Shared utilities
│   ├── analysis-core/           # 🔷 Platform-agnostic analysis engine
│   ├── analysis-adapter-node/   # 🔷 Node.js file system adapter
│   ├── server/                  # ♻️ Express.js backend (refactored)
│   ├── web/                     # ✅ Vue 3 frontend
│   └── cli/                     # ✅ CLI tool
│
├── docs/
│   ├── REFACTORING_PLAN.md      # Refactoring plan
│   ├── ARCHITECTURE.md          # This file
│   └── DEVELOPMENT.md           # Development guide
│
├── tsconfig.base.json           # Shared TypeScript config
├── .changeset/                  # Version management
└── package.json                 # Workspace root
```

**Legend:**
- 🔷 = New packages created during refactoring
- ♻️ = Refactored to use new packages
- ✅ = Unchanged (uses refactored backend)

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

### 📦 @code-review-goose/server

**Purpose**: Express.js REST API server

**Refactoring Changes**:
- ✅ Removed `umlService.ts`, `ooAnalysisService.ts`, `sequenceAnalysisService.ts`, `crossFileAnalysisService.ts`
- ✅ Updated to use `UMLAnalyzer` + `NodeFileProvider`
- ✅ Updated imports to use new packages

**Dependencies**:
- `@code-review-goose/analysis-core`
- `@code-review-goose/analysis-adapter-node`
- `@code-review-goose/analysis-types`
- `express`, `cors`, `openai`, etc.

**Published**: No (private package, bundled in CLI)

---

### 📦 @code-review-goose/web

**Purpose**: Vue 3 frontend application

**Changes**: None (uses refactored backend APIs)

**Published**: No (private package, bundled in CLI)

---

### 📦 @kuochunchang/goose-code-review

**Purpose**: CLI tool (main npm package)

**Changes**: None (uses refactored server package)

**Published**: Yes (public npm package)

**Binary Commands**: `goose`, `goose-code-review`

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
    └─────────┴─────────┼─── analysis-adapter-node
                        ↑         ↑
                        └─────────┼─── server
                                  ↑         ↑
                                  └─────────┼─── cli
                                            ↑
                                            └─── web
```

### Build Order

1. `analysis-types` (no dependencies)
2. `analysis-utils` (depends on types)
3. `analysis-core` (depends on types + utils)
4. `analysis-adapter-node` (depends on types)
5. `server` (depends on core + adapter-node)
6. `web` (standalone build)
7. `cli` (bundles server + web)

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
| `VSCodeFileProvider` | VS Code | `vscode.workspace.fs` | 🚧 Future |
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

| Package | Visibility | npm Package Name |
|---------|------------|------------------|
| analysis-types | Public | `@code-review-goose/analysis-types` |
| analysis-utils | Public | `@code-review-goose/analysis-utils` |
| analysis-core | Public | `@code-review-goose/analysis-core` |
| analysis-adapter-node | Public | `@code-review-goose/analysis-adapter-node` |
| cli | Public | `@kuochunchang/goose-code-review` |
| server | Private | (bundled in CLI) |
| web | Private | (bundled in CLI) |

---

## Future Enhancements

### Phase 7: VS Code Extension (Planned)

```
packages/
├── analysis-adapter-vscode/    # 🚧 VS Code file system adapter
└── vscode-extension/           # 🚧 VS Code extension
```

**Benefits of Refactored Architecture**:
- ✅ Reuse `analysis-core` (no duplication)
- ✅ Same UML generation logic as Web/CLI
- ✅ Just implement `VSCodeFileProvider`

### Other Future Tools

```
future-tools/
├── dependency-analyzer/        # 🚀 Dependency graph tool
└── code-quality-analyzer/      # 🚀 Code smell detection
```

All can reuse `analysis-core` infrastructure!

---

## Migration Guide (for Developers)

### Before Refactoring

```typescript
// Old way (server/src/routes/uml.ts)
import { UMLService } from '../services/umlService.js';

const umlService = new UMLService();
const result = await umlService.generateUnifiedDiagram(
  filePath,
  projectPath,
  type,
  options
);
```

### After Refactoring

```typescript
// New way (server/src/routes/uml.ts)
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';

const fileProvider = new NodeFileProvider(projectPath);
const analyzer = new UMLAnalyzer(fileProvider);
const result = await analyzer.generateUnifiedDiagram(filePath, type, options);
```

**Key Changes**:
1. `UMLService` → `UMLAnalyzer`
2. Pass `projectPath` to `NodeFileProvider` constructor
3. Inject `fileProvider` into `UMLAnalyzer`
4. `projectPath` parameter removed from `generateUnifiedDiagram()`

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

- **Refactoring Plan**: [docs/REFACTORING_PLAN.md](./REFACTORING_PLAN.md)
- **Development Guide**: [docs/DEVELOPMENT.md](./DEVELOPMENT.md)
- **Project Instructions**: [CLAUDE.md](../CLAUDE.md)
- **Repository**: https://github.com/kuochunchang/code-review-goose

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-11-16 | Phase 5 & 6 complete - Server refactored, documentation added |
| 1.0 | 2025-01-16 | Phase 1-4 complete - Monorepo setup, core packages created |
| 0.1 | 2025-01-01 | Original monolithic architecture |

---

**Author**: KCC
**License**: MIT
**Status**: ✅ Production Ready (Phase 5 & 6 Complete)
