# @code-review-goose/analysis-adapter-node

Node.js file system adapter for code analysis engine.

## Overview

Implements IFileProvider interface using Node.js fs module for server-side and CLI applications.

## Installation

```bash
npm install @code-review-goose/analysis-adapter-node
```

## Usage

```typescript
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';

const fileProvider = new NodeFileProvider('/path/to/project');

// Read file
const content = await fileProvider.readFile('src/index.ts');

// Check existence
const exists = await fileProvider.exists('package.json');

// List files
const files = await fileProvider.listFiles('**/*.ts');
```

## License

MIT
