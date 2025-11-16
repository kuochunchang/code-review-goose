/**
 * @code-review-goose/analysis-core
 * Platform-agnostic UML analysis engine
 *
 * This package provides platform-agnostic code analysis engines for generating
 * UML diagrams, analyzing object-oriented relationships, and tracking dependencies.
 * All analyzers use the IFileProvider interface for file operations, enabling
 * multi-platform support (Node.js, VS Code, Browser).
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Analyzers
// ============================================================================

/**
 * UML Analyzer - Generates class diagrams, sequence diagrams, and flowcharts
 */
export { UMLAnalyzer } from './analyzers/UMLAnalyzer.js';

/**
 * Object-Oriented Analyzer - Analyzes OO relationships (composition, aggregation, etc.)
 */
export { OOAnalyzer } from './analyzers/OOAnalyzer.js';

/**
 * Sequence Analyzer - Analyzes class interactions for sequence diagrams
 */
export { SequenceAnalyzer } from './analyzers/SequenceAnalyzer.js';
export type {
  SequenceParticipant,
  SequenceInteraction,
  SequenceAnalysisResult,
} from './analyzers/SequenceAnalyzer.js';

/**
 * Cross-File Analyzer - Analyzes dependencies across multiple files
 */
export { CrossFileAnalyzer } from './analyzers/CrossFileAnalyzer.js';
