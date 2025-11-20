/**
 * @code-review-goose/git-analyzer
 * Git change analysis with SonarQube and AI integration
 */

// Export types
export * from './types/index.js';

// Export services
export { GitService } from './services/GitService.js';
export { SonarQubeService } from './services/SonarQubeService.js';
export { AnalysisOrchestrator, AnalysisMode } from './services/AnalysisOrchestrator.js';
export { AnalysisCacheService } from './services/AnalysisCacheService.js';
export type { CacheStats } from './services/AnalysisCacheService.js';
export { ChangeAnalyzer } from './services/ChangeAnalyzer.js';
export type { ChangeAnalyzerConfig, IAIProvider, AnalysisType } from './services/ChangeAnalyzer.js';

// Export utilities
export { ConfigLoader } from './utils/ConfigLoader.js';
export type { GooseReviewConfig } from './utils/ConfigLoader.js';
export { TokenCounter } from './utils/TokenCounter.js';
export type { TokenCounterConfig, ContentBatch } from './utils/TokenCounter.js';
export { DiffParser } from './utils/DiffParser.js';
export type { ParsedFileChange, DiffFormatOptions } from './utils/DiffParser.js';

// Export AI prompt builders
export {
  buildQualityAnalysisPrompt,
  buildSecurityAnalysisPrompt,
  buildImpactAnalysisPrompt,
  buildArchitectureReviewPrompt,
} from './services/AIPrompts.js';
