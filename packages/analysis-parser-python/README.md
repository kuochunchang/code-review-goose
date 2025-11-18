# @code-review-goose/analysis-parser-python

> Python parser using tree-sitter

## Overview

This package provides Python parsing capabilities for Goose Code Review. It uses `tree-sitter-python` to parse Python source code and convert it to a unified AST format compatible with the analysis engine.

## Features

- ✅ **Full Python Support**: Classes, functions, type hints
- ✅ **Inheritance**: Class inheritance relationships
- ✅ **Type Annotations**: Type hints including generics (List[str], Dict[str, int])
- ✅ **Imports**: `import` and `from ... import` statements
- ✅ **High Test Coverage**: 81.1% test coverage with 27 tests
- ✅ **Production Ready**: Uses battle-tested tree-sitter-python

## Installation

```bash
npm install @code-review-goose/analysis-parser-python
```

## Usage

### Basic Example

```typescript
import { PythonParser } from '@code-review-goose/analysis-parser-python';
import { ParserRegistry } from '@code-review-goose/analysis-parser-common';

// Create registry and register parser
const registry = new ParserRegistry();
registry.register(new PythonParser());

// Parse Python code
const parser = new PythonParser();
const code = `
class User:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def get_name(self) -> str:
        return self.name
`;
const ast = await parser.parse(code, 'user.py');

console.log('Classes:', ast.classes.length);
console.log('Class name:', ast.classes[0].name);
console.log('Methods:', ast.classes[0].methods.length);
```

### With Parser Registry

```typescript
import { ParserRegistry } from '@code-review-goose/analysis-parser-common';
import { PythonParser } from '@code-review-goose/analysis-parser-python';

const registry = new ParserRegistry();
registry.register(new PythonParser());

// Auto-detect language and parse
const parser = await registry.getParserForFile('src/main.py');
if (parser) {
  const code = await readFile('src/main.py');
  const ast = await parser.parse(code, 'src/main.py');
  console.log('Parsed classes:', ast.classes.length);
}
```

## Supported File Extensions

- `.py` - Python source files
- `.pyi` - Python stub files (type hints)
- `.pyw` - Python script files (Windows)

## Supported Features

### Python Features
- ✅ Classes with inheritance
- ✅ Type hints (including generics like `List[str]`, `Dict[str, int]`)
- ✅ Import statements (`import` and `from ... import`)
- ✅ Top-level functions
- ✅ Class methods and constructors (`__init__`)
- ✅ Class variables
- ✅ Return type annotations
- ✅ Parameter type annotations

## API Reference

### PythonParser

```typescript
class PythonParser implements ILanguageParser {
  async parse(code: string, filePath: string): Promise<UnifiedAST>;
  getSupportedLanguage(): SupportedLanguage; // Returns 'python'
  canParse(filePath: string): boolean;
}
```

### PythonASTConverter

Internal converter that transforms Tree-sitter Python AST to UnifiedAST. Not typically used directly.

## Examples

### Parse Python Class

```typescript
const parser = new PythonParser();
const code = `
class User:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def get_name(self) -> str:
        return self.name
`;

const ast = await parser.parse(code, 'user.py');
// ast.classes[0] contains:
// - name: 'User'
// - methods: [{ name: '__init__', parameters: [...] }, { name: 'get_name', returnType: 'str' }, ...]
```

### Parse Class with Inheritance

```typescript
const parser = new PythonParser();
const code = `
class Animal:
    def speak(self) -> str:
        return "Some sound"

class Dog(Animal):
    def speak(self) -> str:
        return "Woof"
`;

const ast = await parser.parse(code, 'animals.py');
// ast.classes[1] (Dog) contains:
// - extends: 'Animal'
```

### Parse Type Hints

```typescript
const parser = new PythonParser();
const code = `
from typing import List, Dict, Optional

def process_data(data: List[str], count: int) -> Dict[str, int]:
    return {}
`;

const ast = await parser.parse(code, 'processor.py');
// ast.functions[0] contains:
// - name: 'process_data'
// - parameters: [{ name: 'data', type: 'List[str]' }, { name: 'count', type: 'int' }]
// - returnType: 'Dict[str, int]'
```

### Parse Imports

```typescript
const parser = new PythonParser();
const code = `
import os
from typing import List, Dict
from collections import defaultdict as dd
`;

const ast = await parser.parse(code, 'imports.py');
// ast.imports contains all import statements
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

**Current Test Coverage**: 81.1% (27 tests)

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
- `tree-sitter` - Tree-sitter parser engine
- `tree-sitter-python` - Python grammar for tree-sitter

## Architecture

This package uses tree-sitter-python to parse Python source code. The parser:

1. Parses Python code using tree-sitter
2. Converts Tree-sitter AST to UnifiedAST via `PythonASTConverter`
3. Extracts classes, functions, methods, properties, imports, etc.
4. Returns a language-agnostic AST structure

## Limitations

Currently supports:
- ✅ Basic class and function parsing
- ✅ Inheritance relationships
- ✅ Type hints and annotations
- ✅ Import statements
- ✅ Method and parameter extraction

Future enhancements:
- 🔲 Decorators (e.g., `@property`, `@staticmethod`)
- 🔲 Dataclasses
- 🔲 Type aliases
- 🔲 Protocol classes
- 🔲 Async functions and generators

## Related Packages

- `@code-review-goose/analysis-parser-common` - Parser interfaces
- `@code-review-goose/analysis-parser-typescript` - TypeScript/JavaScript parser
- `@code-review-goose/analysis-parser-java` - Java parser
- `@code-review-goose/analysis-core` - Core analysis engine

## License

MIT

## Contributing

See the main [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) for contribution guidelines.

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for version history.
