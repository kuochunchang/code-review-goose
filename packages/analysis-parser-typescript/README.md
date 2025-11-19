# @code-review-goose/analysis-parser-typescript

> TypeScript and JavaScript parser using Babel

## Overview

This package provides TypeScript and JavaScript parsing capabilities for Goose Code Review. It wraps the mature `@babel/parser` library to provide a unified interface compatible with the multi-language parser architecture.

## Features

- ✅ **TypeScript Support**: Full TypeScript syntax including generics, decorators, type annotations
- ✅ **JavaScript Support**: ES2015+ JavaScript with JSX support
- ✅ **Unified Interface**: Implements `ILanguageParser` for seamless integration
- ✅ **Comprehensive AST Extraction**: Classes, interfaces, functions, imports, exports
- ✅ **High Test Coverage**: 97.73% test coverage with 61 tests
- ✅ **Production Ready**: Wraps battle-tested Babel parser

## Installation

```bash
npm install @code-review-goose/analysis-parser-typescript
```

## Usage

### Basic Example

```typescript
import { TypeScriptParser, JavaScriptParser } from '@code-review-goose/analysis-parser-typescript';
import { ParserRegistry } from '@code-review-goose/analysis-parser-common';

// Create registry and register parsers
const registry = new ParserRegistry();
registry.register(new TypeScriptParser());
registry.register(new JavaScriptParser());

// Parse TypeScript code
const tsParser = new TypeScriptParser();
const tsCode = `
  class User {
    name: string;
    age: number;
  }
`;
const tsAST = await tsParser.parse(tsCode, 'User.ts');

console.log('Classes:', tsAST.classes.length);
console.log('Class name:', tsAST.classes[0].name);
```

### With Parser Registry

```typescript
import { ParserRegistry } from '@code-review-goose/analysis-parser-common';
import { TypeScriptParser, JavaScriptParser } from '@code-review-goose/analysis-parser-typescript';

const registry = new ParserRegistry();
registry.register(new TypeScriptParser());
registry.register(new JavaScriptParser());

// Auto-detect language and parse
const parser = await registry.getParserForFile('src/App.tsx');
if (parser) {
  const code = await readFile('src/App.tsx');
  const ast = await parser.parse(code, 'src/App.tsx');
  console.log('Parsed classes:', ast.classes.length);
}
```

## Supported File Extensions

### TypeScript
- `.ts` - TypeScript files
- `.tsx` - TypeScript with JSX
- `.mts` - TypeScript ES modules
- `.cts` - TypeScript CommonJS modules

### JavaScript
- `.js` - JavaScript files
- `.jsx` - JavaScript with JSX
- `.mjs` - ES modules
- `.cjs` - CommonJS modules

## Supported Features

### TypeScript Features
- ✅ Classes with inheritance (`extends`)
- ✅ Interface implementation (`implements`)
- ✅ Generics (`class Container<T>`)
- ✅ Type annotations
- ✅ Decorators (`@Component()`)
- ✅ Type-only imports (`import type`)
- ✅ Namespace imports (`import * as`)
- ✅ Union and intersection types
- ✅ Array types

### JavaScript Features
- ✅ ES2015+ classes
- ✅ Arrow functions
- ✅ Destructuring
- ✅ JSX/TSX
- ✅ Async/await
- ✅ Import/export statements

## API Reference

### TypeScriptParser

```typescript
class TypeScriptParser implements ILanguageParser {
  async parse(code: string, filePath: string): Promise<UnifiedAST>;
  getSupportedLanguage(): SupportedLanguage; // Returns 'typescript'
  canParse(filePath: string): boolean;
}
```

### JavaScriptParser

```typescript
class JavaScriptParser implements ILanguageParser {
  async parse(code: string, filePath: string): Promise<UnifiedAST>;
  getSupportedLanguage(): SupportedLanguage; // Returns 'javascript'
  canParse(filePath: string): boolean;
}
```

### BabelASTConverter

Internal converter that transforms Babel AST to UnifiedAST. Not typically used directly.

## Examples

### Parse TypeScript Class

```typescript
const parser = new TypeScriptParser();
const code = `
  class User {
    private name: string;
    public age: number;

    constructor(name: string, age: number) {
      this.name = name;
      this.age = age;
    }

    getName(): string {
      return this.name;
    }
  }
`;

const ast = await parser.parse(code, 'User.ts');
// ast.classes[0] contains:
// - name: 'User'
// - properties: [{ name: 'name', visibility: 'private' }, ...]
// - methods: [{ name: 'getName', returnType: 'string' }, ...]
// - constructorParams: [{ name: 'name', type: 'string' }, ...]
```

### Parse Interface

```typescript
const parser = new TypeScriptParser();
const code = `
  interface IUser {
    name: string;
    age: number;
    getName(): string;
  }
`;

const ast = await parser.parse(code, 'IUser.ts');
// ast.interfaces[0] contains:
// - name: 'IUser'
// - properties: [{ name: 'name', type: 'string' }, ...]
// - methods: [{ name: 'getName', returnType: 'string' }]
```

### Parse Imports and Exports

```typescript
const parser = new TypeScriptParser();
const code = `
  import { Component } from 'react';
  import type { Props } from './types';
  import * as utils from './utils';

  export class User {}
  export default class Admin {}
`;

const ast = await parser.parse(code, 'App.tsx');
// ast.imports contains all import statements
// ast.exports contains all export statements
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

**Current Test Coverage**: 97.73% (61 tests)

## Building

```bash
# Build package
npm run build

# Clean build artifacts
npm run clean
```

## Dependencies

- `@code-review-goose/analysis-types` - Shared type definitions
- `@code-review-goose/analysis-parser-common` - Parser interfaces
- `@babel/parser` - Babel parser for TypeScript/JavaScript
- `@babel/traverse` - AST traversal
- `@babel/types` - Babel type definitions

## Architecture

This package wraps the existing Babel parser logic that was previously embedded in `UMLAnalyzer`. By extracting it into a separate package, we:

1. **Maintain Stability**: Continue using the proven Babel parser
2. **Enable Multi-Language**: Provide unified interface for future language parsers
3. **Improve Testability**: Isolated parser logic is easier to test
4. **Reduce Risk**: No need to rewrite 1200+ lines of tested code

## Migration from Internal Babel Parser

If you were using Babel parser directly:

```typescript
// Before
import { parse } from '@babel/parser';
const ast = parse(code, { plugins: ['typescript'] });

// After
import { TypeScriptParser } from '@code-review-goose/analysis-parser-typescript';
const parser = new TypeScriptParser();
const unifiedAST = await parser.parse(code, 'file.ts');
```

## Related Packages

- `@code-review-goose/analysis-parser-common` - Parser interfaces
- `@code-review-goose/analysis-parser-java` - Java parser (planned)
- `@code-review-goose/analysis-parser-python` - Python parser (planned)
- `@code-review-goose/analysis-core` - Core analysis engine

## License

MIT

## Contributing

See the main [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) for contribution guidelines.

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for version history.
