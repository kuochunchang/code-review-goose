/**
 * Review record related type definitions (frontend)
 */

import type { AnalysisResult } from './analysis';

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
  id: string;
  timestamp: string;
  filePath: string;
  fileName: string;
  codeSnippet?: CodeSnippet;
  analysis: AnalysisResult;
  notes?: string;
  bookmarked?: boolean;
  resolved?: boolean;
  tags?: string[];
}

/**
 * Review list filter options
 */
export interface ReviewFilter {
  filePath?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: string[];
  bookmarked?: boolean;
  resolved?: boolean;
  searchText?: string;
}

/**
 * Review list sorting options
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
export type ExportFormat = 'markdown' | 'html' | 'json';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeResolved?: boolean;
  filter?: ReviewFilter;
}

/**
 * Review list response
 */
export interface ReviewListResponse {
  reviews: ReviewRecord[];
  total: number;
}
