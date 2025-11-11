import type { AnalysisResult } from './ai.js';

/**
 * Insight record for a file
 * Stores the analysis result and code hash for comparison
 */
export interface InsightRecord {
  filePath: string; // Primary key
  codeHash: string; // SHA256 hash of the code
  analysis: AnalysisResult; // LLM analysis result
  timestamp: string; // Last analysis timestamp
}

/**
 * Query result for insight check
 */
export interface InsightCheckResult {
  hasRecord: boolean;
  hashMatched: boolean;
  insight: InsightRecord | null;
}
