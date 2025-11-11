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
  explain?(code: string, options: AnalysisOptions): Promise<ExplainResult>;
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

export interface ComponentInfo {
  name: string;
  description: string;
  type: 'class' | 'function' | 'module' | 'interface' | 'constant' | 'type' | 'variable';
  codeSnippet?: string;
  line?: number; // Line number where this component is defined
}

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  line?: number; // Line number related to this step
}

export interface KeyConcept {
  concept: string;
  explanation: string;
}

export interface Dependency {
  name: string;
  purpose: string;
  isExternal: boolean;
}

export interface ExplainResult {
  overview: string; // Brief summary
  mainComponents: ComponentInfo[]; // Key components
  howItWorks: WorkflowStep[]; // Step-by-step flow
  keyConcepts: KeyConcept[]; // Important concepts
  dependencies: Dependency[]; // External/internal dependencies
  notableFeatures: string[]; // Highlights
  timestamp: string;
}
