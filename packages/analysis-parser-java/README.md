# @code-review-goose/analysis-parser-java

> Java parser using tree-sitter

## Overview

This package provides Java parsing capabilities for Goose Code Review. It uses `tree-sitter-java` to parse Java source code and convert it to a unified AST format compatible with the analysis engine.

## Features

- ✅ **Full Java Support**: Classes, interfaces, enums, annotations
- ✅ **Inheritance & Implementation**: `extends` and `implements` relationships
- ✅ **Access Modifiers**: `public`, `private`, `protected`
- ✅ **Generics**: Generic types and type parameters
- ✅ **Imports & Packages**: Package declarations and import statements
- ✅ **High Test Coverage**: 91.77% test coverage with 23 tests
- ✅ **Production Ready**: Uses battle-tested tree-sitter-java

## Installation

```bash
npm install @code-review-goose/analysis-parser-java
```

## Usage

### Basic Example

```typescript
import { JavaParser } from '@code-review-goose/analysis-parser-java';
import { ParserRegistry } from '@code-review-goose/analysis-parser-common';

// Create registry and register parser
const registry = new ParserRegistry();
registry.register(new JavaParser());

// Parse Java code
const parser = new JavaParser();
const code = `
  package com.example;

  public class User {
    private String name;
    public int age;

    public User(String name, int age) {
      this.name = name;
      this.age = age;
    }

    public String getName() {
      return name;
    }
  }
`;
const ast = await parser.parse(code, 'User.java');

console.log('Classes:', ast.classes.length);
console.log('Class name:', ast.classes[0].name);
console.log('Properties:', ast.classes[0].properties.length);
```

### With Parser Registry

```typescript
import { ParserRegistry } from '@code-review-goose/analysis-parser-common';
import { JavaParser } from '@code-review-goose/analysis-parser-java';

const registry = new ParserRegistry();
registry.register(new JavaParser());

// Auto-detect language and parse
const parser = await registry.getParserForFile('src/Main.java');
if (parser) {
  const code = await readFile('src/Main.java');
  const ast = await parser.parse(code, 'src/Main.java');
  console.log('Parsed classes:', ast.classes.length);
}
```

## Supported File Extensions

- `.java` - Java source files

## Supported Features

### Java Features
- ✅ Classes with inheritance (`extends`)
- ✅ Interface implementation (`implements`)
- ✅ Generics (`class Container<T>`)
- ✅ Access modifiers (`public`, `private`, `protected`)
- ✅ Package declarations
- ✅ Import statements (including wildcard imports)
- ✅ Enums
- ✅ Constructors
- ✅ Methods and fields
- ✅ Primitive and reference types
- ✅ Array types

## API Reference

### JavaParser

```typescript
class JavaParser implements ILanguageParser {
  async parse(code: string, filePath: string): Promise<UnifiedAST>;
  getSupportedLanguage(): SupportedLanguage; // Returns 'java'
  canParse(filePath: string): boolean;
}
```

### JavaASTConverter

Internal converter that transforms Tree-sitter Java AST to UnifiedAST. Not typically used directly.

## Examples

### Parse Java Class

```typescript
const parser = new JavaParser();
const code = `
  public class User {
    private String name;
    public int age;

    public User(String name, int age) {
      this.name = name;
      this.age = age;
    }

    public String getName() {
      return name;
    }
  }
`;

const ast = await parser.parse(code, 'User.java');
// ast.classes[0] contains:
// - name: 'User'
// - properties: [{ name: 'name', visibility: 'private' }, ...]
// - methods: [{ name: 'getName', returnType: 'String' }, ...]
// - constructorParams: [{ name: 'name', type: 'String' }, ...]
```

### Parse Interface

```typescript
const parser = new JavaParser();
const code = `
  interface IUser {
    String getName();
    int getAge();
  }
`;

const ast = await parser.parse(code, 'IUser.java');
// ast.interfaces[0] contains:
// - name: 'IUser'
// - methods: [{ name: 'getName', returnType: 'String' }, ...]
```

### Parse Inheritance

```typescript
const parser = new JavaParser();
const code = `
  class Animal {
    String name;
  }

  class Dog extends Animal implements IAnimal {
    String breed;
  }
`;

const ast = await parser.parse(code, 'Animal.java');
// ast.classes[1] (Dog) contains:
// - extends: 'Animal'
// - implements: ['IAnimal']
```

### Parse Imports

```typescript
const parser = new JavaParser();
const code = `
  import java.util.List;
  import java.util.Map;
  import java.util.*;
`;

const ast = await parser.parse(code, 'Imports.java');
// ast.imports contains all import statements
// ast.imports[2].isNamespace === true (wildcard import)
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

**Current Test Coverage**: 91.77% (23 tests)

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
- `tree-sitter-java` - Java grammar for tree-sitter

## Architecture

This package uses tree-sitter-java to parse Java source code. The parser:

1. Parses Java code using tree-sitter
2. Converts Tree-sitter AST to UnifiedAST via `JavaASTConverter`
3. Extracts classes, interfaces, methods, properties, imports, etc.
4. Returns a language-agnostic AST structure

## Limitations

Currently supports:
- ✅ Basic class and interface parsing
- ✅ Inheritance and implementation relationships
- ✅ Method and field extraction
- ✅ Import statements

Future enhancements:
- 🔲 Annotation processing
- 🔲 Inner classes
- 🔲 Lambda expressions
- 🔲 Method references

## Related Packages

- `@code-review-goose/analysis-parser-common` - Parser interfaces
- `@code-review-goose/analysis-parser-typescript` - TypeScript/JavaScript parser
- `@code-review-goose/analysis-parser-python` - Python parser (planned)
- `@code-review-goose/analysis-core` - Core analysis engine

## License

MIT

## Contributing

See the main [DEVELOPMENT.md](../../docs/DEVELOPMENT.md) for contribution guidelines.

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for version history.
