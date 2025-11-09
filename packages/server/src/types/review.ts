/**
 * Review record-related type definitions
 */

import type { AnalysisResult } from './ai.js';

/**
 * Code snippet information
 */
export interface CodeSnippet {
  startLine: number;
  endLine: number;
  code: string;
}

/**
 * Review record
 */
export interface ReviewRecord {
  id: string; // UUID
  timestamp: string; // ISO timestamp (last review time)
  firstReviewedAt: string; // First review time
  reviewCount: number; // Cumulative review count
  filePath: string; // Reviewed file path (relative to project root)
  fileName: string; // File name (for display and search)
  codeSnippet?: CodeSnippet; // Selected code snippet (optional)
  analysis: AnalysisResult; // AI analysis result
  notes?: string; // User notes
  bookmarked?: boolean; // Whether bookmarked
  resolved?: boolean; // Whether resolved
  tags?: string[]; // Tags (for future expansion)
}

/**
 * Review list filter options
 */
export interface ReviewFilter {
  filePath?: string; // File path filter (supports partial match)
  dateFrom?: string; // Start date
  dateTo?: string; // End date
  severity?: string[]; // Severity filter
  bookmarked?: boolean; // Only show bookmarked
  resolved?: boolean; // Resolved status filter
  searchText?: string; // Full-text search
}

/**
 * Review list sort options
 */
export interface ReviewSort {
  field: 'timestamp' | 'filePath' | 'severity';
  order: 'asc' | 'desc';
}

/**
 * Review list query parameters
 */
export interface ReviewQuery {
  filter?: ReviewFilter;
  sort?: ReviewSort;
  limit?: number;
  offset?: number;
}

/**
 * Review statistics
 */
export interface ReviewStats {
  total: number;
  bookmarked: number;
  resolved: number;
  unresolved: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  byCategory: {
    quality: number;
    security: number;
    performance: number;
    'best-practice': number;
    bug: number;
  };
}

/**
 * Export format
 */
export type ExportFormat = 'markdown' | 'html' | 'json' | 'csv';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeResolved?: boolean;
  filter?: ReviewFilter;
}
