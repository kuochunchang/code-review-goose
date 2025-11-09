/**
 * AI analysis related type definitions
 */

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IssueCategory = 'quality' | 'security' | 'performance' | 'best-practice' | 'bug';

export interface CodeExample {
  before: string;
  after: string;
}

export interface Issue {
  severity: IssueSeverity;
  category: IssueCategory;
  line: number;
  column?: number;
  message: string;
  suggestion: string;
  codeExample?: CodeExample;
}

export interface AnalysisResult {
  issues: Issue[];
  summary: string;
  timestamp: string;
  fromCache?: boolean;
}

export interface AnalysisOptions {
  language?: string;
  filePath?: string;
  checkQuality?: boolean;
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  checkBestPractices?: boolean;
  checkBugs?: boolean;
}

export interface AnalysisStatus {
  configured: boolean;
  provider: string;
  model: string;
}

export interface ProjectConfig {
  aiProvider?: 'openai' | 'claude' | 'gemini' | 'ollama';
  openai?: {
    apiKey: string;
    model: string;
    timeout?: number;
  };
  claude?: {
    apiKey: string;
    model: string;
    timeout?: number;
  };
  gemini?: {
    apiKey: string;
    model: string;
    timeout?: number;
  };
  ollama?: {
    baseUrl: string;
    model: string;
    timeout?: number;
  };
  ignorePatterns?: string[];
  maxFileSize?: number;
  analyzableFileExtensions?: string[]; // File extensions that can be analyzed by AI
}

export interface CacheStats {
  count: number;
  totalSize: number;
}
