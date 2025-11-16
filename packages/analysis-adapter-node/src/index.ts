/**
 * @code-review-goose/analysis-adapter-node
 * Node.js file system adapter for code analysis engine
 */

import type { IFileProvider } from '@code-review-goose/analysis-types';

// Placeholder - NodeFileProvider will be implemented in Phase 4
export class NodeFileProvider implements IFileProvider {
  constructor(private basePath: string) {}

  async readFile(_path: string): Promise<string> {
    throw new Error('Not implemented yet - Phase 4');
  }

  async resolveImport(_from: string, _to: string): Promise<string | null> {
    throw new Error('Not implemented yet - Phase 4');
  }

  async listFiles(_pattern: string): Promise<string[]> {
    throw new Error('Not implemented yet - Phase 4');
  }

  async exists(_path: string): Promise<boolean> {
    throw new Error('Not implemented yet - Phase 4');
  }
}
