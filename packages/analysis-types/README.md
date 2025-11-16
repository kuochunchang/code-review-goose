# @code-review-goose/analysis-types

Shared type definitions for code analysis - zero dependencies.

## Overview

This package provides language-agnostic TypeScript type definitions used across all analysis packages. It has zero runtime dependencies to ensure maximum portability.

## Installation

```bash
npm install @code-review-goose/analysis-types
```

## Included Types

- **IFileProvider**: File system abstraction interface
- **AST Types**: ClassInfo, MethodInfo, PropertyInfo, etc.
- **UML Types**: DiagramType, UMLResult, etc.
- **Language Types**: SupportedLanguage

## Usage

```typescript
import type { IFileProvider, ClassInfo } from '@code-review-goose/analysis-types';

// Implement file provider
class MyFileProvider implements IFileProvider {
  async readFile(path: string): Promise<string> {
    // Implementation
  }
  // ...
}
```

## License

MIT
