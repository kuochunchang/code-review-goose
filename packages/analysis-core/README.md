# @code-review-goose/analysis-core

Platform-agnostic UML analysis engine.

## Overview

Core analysis engine for generating UML diagrams (class, sequence, flowchart) from source code. Platform-independent - works with any file provider implementation.

## Installation

```bash
npm install @code-review-goose/analysis-core
```

## Usage

```typescript
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';

// Create analyzer with file provider
const fileProvider = new NodeFileProvider('/path/to/project');
const analyzer = new UMLAnalyzer(fileProvider);

// Generate class diagram
const result = await analyzer.analyzeClass('src/MyClass.ts', {
  depth: 2,
  mode: 'native'
});

console.log(result.mermaidCode);
```

## License

MIT
