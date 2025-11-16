/**
 * @code-review-goose/analysis-adapter-node
 * Node.js file system adapter for code analysis engine
 *
 * This package provides Node.js-specific implementations of the platform-agnostic
 * analysis interfaces defined in @code-review-goose/analysis-types.
 *
 * @packageDocumentation
 */

// ============================================================================
// File Provider (IFileProvider implementation)
// ============================================================================
export { NodeFileProvider } from './node-file-provider.js';

// ============================================================================
// Path Resolution
// ============================================================================
export { PathResolver } from './path-resolver.js';

// ============================================================================
// Import Index Builder
// ============================================================================
export { ImportIndexBuilder } from './import-index-builder.js';
