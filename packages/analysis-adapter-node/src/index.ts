/**
 * @code-review-goose/analysis-adapter-node
 * Node.js file system adapter for code analysis engine
 */

import type { IFileProvider } from '@code-review-goose/analysis-types';

// Placeholder - NodeFileProvider will be implemented in Phase 4
export class NodeFileProvider implements IFileProvider {
  constructor(private basePath: string) {}

  async readFile(path: string): Promise<string> {
    throw new Error('Not implemented yet - Phase 4');
  }

  async resolveImport(from: string, to: string): Promise<string | null> {
    throw new Error('Not implemented yet - Phase 4');
  }

  async listFiles(pattern: string): Promise<string[]> {
    throw new Error('Not implemented yet - Phase 4');
  }

  async exists(path: string): Promise<boolean> {
    throw new Error('Not implemented yet - Phase 4');
  }
}
