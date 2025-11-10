/**
 * AI analysis-related type definitions
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

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  timeout?: number; // Request timeout in milliseconds
  [key: string]: any;
}

export interface AIProvider {
  name: string;
  analyze(code: string, options: AnalysisOptions): Promise<AnalysisResult>;
  generateDiagram?(
    code: string,
    diagramType: string,
    options?: any
  ): Promise<DiagramGenerationResult>;
  validateConfig(config: AIProviderConfig): boolean;
}

export interface DiagramGenerationResult {
  mermaidCode: string;
  success: boolean;
  error?: string;
  metadata?: any;
}
