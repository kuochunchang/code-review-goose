# @code-review-goose/analysis-parser-common

> Common parser interfaces and utilities for multi-language support

## Overview

This package provides the foundation for language-agnostic code parsing in Goose Code Review. It defines the core abstractions that enable unified parsing across multiple programming languages (TypeScript, JavaScript, Java, Python, Go, etc.).

## Features

- ✅ **ILanguageParser Interface**: Abstract interface all language parsers must implement
- ✅ **ParserRegistry**: Manages multiple language parsers with eager and lazy initialization
- ✅ **LanguageDetector**: Auto-detects programming language from file paths
- ✅ **Zero Runtime Dependencies**: Only depends on `@code-review-goose/analysis-types`
- ✅ **TypeScript-First**: Full type safety with comprehensive TypeScript definitions

## Installation

```bash
npm install @code-review-goose/analysis-parser-common
```

## Usage

### Basic Example

```typescript
import { ParserRegistry, LanguageDetector } from '@code-review-goose/analysis-parser-common';
import { TypeScriptParser } from '@code-review-goose/analysis-parser-typescript';
import { JavaParser } from '@code-review-goose/analysis-parser-java';

// Create registry and register parsers
const registry = new ParserRegistry();
registry.register(new TypeScriptParser());
registry.register(new JavaParser());

// Auto-detect language and parse
const filePath = 'src/Example.java';
const parser = await registry.getParserForFile(filePath);

if (parser) {
  const code = await readFile(filePath);
  const ast = await parser.parse(code, filePath);
  console.log('Parsed classes:', ast.classes.length);
}
```

### Lazy Registration

For faster startup, you can register parsers lazily:

```typescript
const registry = new ParserRegistry();

// Parser will be created only when first needed
registry.registerLazy('python', () => new PythonParser());
registry.registerLazy('go', async () => {
  await loadGoGrammar();
  return new GoParser();
});
```

### Language Detection

```typescript
import { LanguageDetector } from '@code-review-goose/analysis-parser-common';

// Detect language from file path
const language = LanguageDetector.detectFromFilePath('App.tsx');
// Returns: 'typescript'

// Check if file is supported
const isSupported = LanguageDetector.isSupported('Main.java');
// Returns: true

// Get all supported languages
const languages = LanguageDetector.getSupportedLanguages();
// Returns: ['typescript', 'javascript', 'java', 'python', 'go']

// Get file extensions for a language
const extensions = LanguageDetector.getExtensions('typescript');
// Returns: ['.ts', '.tsx', '.mts', '.cts']
```

### Implementing a Custom Parser

```typescript
import type { ILanguageParser } from '@code-review-goose/analysis-parser-common';
import type { UnifiedAST, SupportedLanguage } from '@code-review-goose/analysis-types';

class MyLanguageParser implements ILanguageParser {
  async parse(code: string, filePath: string): Promise<UnifiedAST> {
    // 1. Parse the code using your parser (tree-sitter, Babel, etc.)
    const tree = this.parseCode(code);
    
    // 2. Convert to UnifiedAST
    return this.convertToUnifiedAST(tree);
  }

  getSupportedLanguage(): SupportedLanguage {
    return 'typescript'; // or 'java', 'python', etc.
  }

  canParse(filePath: string): boolean {
    return /\.tsx?$/.test(filePath);
  }

  private parseCode(code: string) {
    // Your parsing logic here
  }

  private convertToUnifiedAST(tree: any): UnifiedAST {
    // Your AST conversion logic here
  }
}
```

## API Reference

### ILanguageParser

Abstract interface for language parsers.

**Methods:**

- `parse(code: string, filePath: string): Promise<UnifiedAST>` - Parse source code
- `getSupportedLanguage(): SupportedLanguage` - Get supported language
- `canParse(filePath: string): boolean` - Check if file is supported

### ParserRegistry

Manages multiple language parsers.

**Methods:**

- `register(parser: ILanguageParser): void` - Register parser (eager)
- `registerLazy(language: SupportedLanguage, factory: ParserFactory): void` - Register parser factory (lazy)
- `getParser(language: SupportedLanguage): Promise<ILanguageParser | undefined>` - Get parser by language
- `getParserForFile(filePath: string): Promise<ILanguageParser | undefined>` - Auto-detect and get parser
- `hasParser(language: SupportedLanguage): boolean` - Check if parser is registered
- `getRegisteredLanguages(): SupportedLanguage[]` - Get all registered languages
- `unregister(language: SupportedLanguage): boolean` - Unregister parser
- `clear(): void` - Clear all parsers

### LanguageDetector

Detects programming language from file paths.

**Static Methods:**

- `detectFromFilePath(filePath: string): SupportedLanguage | null` - Detect language
- `isSupported(filePath: string): boolean` - Check if file is supported
- `getSupportedLanguages(): SupportedLanguage[]` - Get all supported languages
- `getExtensions(language: SupportedLanguage): string[]` - Get file extensions
- `getExtensionMap(): Record<string, SupportedLanguage>` - Get extension map

## Supported Languages

| Language | Extensions | Parser Package |
|----------|-----------|----------------|
| TypeScript | `.ts`, `.tsx`, `.mts`, `.cts` | `@code-review-goose/analysis-parser-typescript` |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | `@code-review-goose/analysis-parser-typescript` |
| Java | `.java` | `@code-review-goose/analysis-parser-java` |
| Python | `.py`, `.pyi`, `.pyw` | `@code-review-goose/analysis-parser-python` |
| Go | `.go` | (planned) |

## Architecture

```
UMLAnalyzer (analysis-core)
    ↓
ParserRegistry (analysis-parser-common)
    ↓
┌──────────────────┬──────────────┬───────────────┐
│ TypeScriptParser │ JavaParser   │ PythonParser  │
│ (tree-sitter)    │ (tree-sitter)│ (tree-sitter) │
└──────────────────┴──────────────┴───────────────┘
    ↓
UnifiedAST (language-agnostic representation)
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Building

```bash
# Build package
npm run build

# Clean build artifacts
npm run clean
```

## Dependencies

- `@code-review-goose/analysis-types` - Shared type definitions

## Development Dependencies

- `typescript` - TypeScript compiler
- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting

## License

MIT

## Contributing

See the main [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) for contribution guidelines.

## Related Packages

- `@code-review-goose/analysis-types` - Type definitions
- `@code-review-goose/analysis-parser-typescript` - TypeScript/JavaScript parser
- `@code-review-goose/analysis-parser-java` - Java parser
- `@code-review-goose/analysis-parser-python` - Python parser
- `@code-review-goose/analysis-core` - Core analysis engine

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for version history.
