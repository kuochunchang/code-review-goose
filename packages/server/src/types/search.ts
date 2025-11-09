/**
 * Search-related type definitions
 */

/**
 * Search options
 */
export interface SearchOptions {
  query: string; // Search keyword or regular expression
  caseSensitive?: boolean; // Case sensitive (default: false)
  useRegex?: boolean; // Use regular expression (default: false)
  filePattern?: string; // File filter pattern (e.g., "*.ts")
  includePatterns?: string[]; // Include file patterns
  excludePatterns?: string[]; // Exclude file patterns
  maxResults?: number; // Maximum number of results (default: 1000)
  contextLines?: number; // Number of context lines (default: 2)
}

/**
 * Search match
 */
export interface SearchMatch {
  line: number; // Line number (starting from 1)
  column: number; // Column number (starting from 0)
  text: string; // Full line text
  matchText: string; // Matched text
  matchStart: number; // Match start position (within the line)
  matchEnd: number; // Match end position (within the line)
}

/**
 * Search result (single file)
 */
export interface SearchFileResult {
  filePath: string; // File path (relative to project root)
  fileName: string; // File name
  matches: SearchMatch[]; // List of matches
  totalMatches: number; // Total number of matches
}

/**
 * Search result (complete)
 */
export interface SearchResult {
  files: SearchFileResult[]; // List of file results
  totalFiles: number; // Total number of files
  totalMatches: number; // Total number of matches
  searchTime: number; // Search time (milliseconds)
  truncated: boolean; // Whether truncated due to reaching max results
}

/**
 * Search result with context
 */
export interface SearchMatchWithContext extends SearchMatch {
  contextBefore: string[]; // Context lines before
  contextAfter: string[]; // Context lines after
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
  id: string; // UUID
  timestamp: string; // ISO timestamp
  query: string; // Search query
  options: SearchOptions; // Search options
  resultCount: number; // Number of results
}

/**
 * Search statistics
 */
export interface SearchStats {
  totalSearches: number; // Total number of searches
  recentSearches: SearchHistoryItem[]; // Recent searches (max 10)
  popularQueries: Array<{ query: string; count: number }>; // Popular queries
}
