/**
 * Batch analysis type definitions
 */

import type { AnalysisResult } from './ai.js';

export interface BatchAnalysisOptions {
  /**
   * Force re-analysis of all files, ignoring modification times
   */
  force?: boolean;

  /**
   * Number of concurrent analyses (default: 1 to avoid rate limiting)
   */
  concurrency?: number;

  /**
   * Specific file extensions to analyze (override config)
   */
  extensions?: string[];

  /**
   * Progress callback
   */
  onProgress?: (progress: BatchProgress) => void;
}

export interface BatchProgress {
  /**
   * Current file being analyzed
   */
  currentFile: string;

  /**
   * Number of files analyzed so far
   */
  analyzed: number;

  /**
   * Number of files skipped (not modified)
   */
  skipped: number;

  /**
   * Number of files with errors
   */
  errors: number;

  /**
   * Total number of files to analyze
   */
  total: number;

  /**
   * Current status message
   */
  status: string;
}

export interface FileAnalysisResult {
  /**
   * File path (relative to project root)
   */
  filePath: string;

  /**
   * Whether the file was analyzed or skipped
   */
  analyzed: boolean;

  /**
   * Reason for skipping (if skipped)
   */
  skipReason?: string;

  /**
   * Analysis result (if analyzed)
   */
  analysis?: AnalysisResult;

  /**
   * Error message (if error occurred)
   */
  error?: string;

  /**
   * Time taken to analyze (in milliseconds)
   */
  duration?: number;
}

export interface BatchAnalysisResult {
  /**
   * Total files found in project
   */
  totalFiles: number;

  /**
   * Files that can be analyzed
   */
  analyzableFiles: number;

  /**
   * Files actually analyzed
   */
  analyzedCount: number;

  /**
   * Files skipped (not modified)
   */
  skippedCount: number;

  /**
   * Files with errors
   */
  errorCount: number;

  /**
   * Individual file results
   */
  results: FileAnalysisResult[];

  /**
   * Total time taken (in milliseconds)
   */
  totalDuration: number;

  /**
   * Summary statistics
   */
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  };
}
