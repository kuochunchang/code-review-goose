import type { AnalysisResult } from './analysis';

/**
 * Insight record for a file
 */
export interface InsightRecord {
  filePath: string;
  codeHash: string;
  analysis: AnalysisResult;
  timestamp: string;
}

/**
 * Result of checking insight status
 */
export interface InsightCheckResult {
  hasRecord: boolean;
  hashMatched: boolean;
  insight: InsightRecord | null;
}

/**
 * Insights statistics
 */
export interface InsightStats {
  count: number;
  totalSize: number;
}
