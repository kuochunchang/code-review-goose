/**
 * Search related type definitions (frontend)
 */

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
  filePattern?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxResults?: number;
  contextLines?: number;
}

/**
 * Search match
 */
export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  matchText: string;
  matchStart: number;
  matchEnd: number;
}

/**
 * Search result (single file)
 */
export interface SearchFileResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
  totalMatches: number;
}

/**
 * Search result (complete)
 */
export interface SearchResult {
  files: SearchFileResult[];
  totalFiles: number;
  totalMatches: number;
  searchTime: number;
  truncated: boolean;
}

/**
 * Search result with context
 */
export interface SearchMatchWithContext extends SearchMatch {
  contextBefore: string[];
  contextAfter: string[];
}

/**
 * Search result (with context)
 */
export interface SearchFileResultWithContext extends SearchFileResult {
  matches: SearchMatchWithContext[];
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  id: string;
  timestamp: string;
  query: string;
  options: SearchOptions;
  resultCount: number;
}

/**
 * Search statistics
 */
export interface SearchStats {
  totalSearches: number;
  recentSearches: SearchHistoryItem[];
  popularQueries: Array<{ query: string; count: number }>;
}
