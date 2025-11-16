/**
 * @code-review-goose/analysis-types
 * Shared type definitions for code analysis - zero dependencies
 */

// Export placeholder - types will be added in Phase 2
export interface IFileProvider {
  readFile(path: string): Promise<string>;
  resolveImport(from: string, to: string): Promise<string | null>;
  listFiles(pattern: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Placeholder - full types will be migrated in Phase 2
export type DiagramType = 'class' | 'flowchart' | 'sequence';
export type DiagramGenerationMode = 'native';
