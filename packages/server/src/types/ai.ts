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

export interface Field {
  name: string;
  type: string; // Data type (e.g., string, number, User, etc.)
  description: string;
  line?: number; // Line number where this field is defined
  visibility?: 'public' | 'private' | 'protected'; // Optional visibility modifier
}

export interface MethodDependency {
  caller: string; // The method that calls another method
  callee: string; // The method being called
  callerLine?: number; // Line number where the caller is defined
  calleeLine?: number; // Line number where the callee is defined
  description?: string; // Optional description of why this dependency exists
}

export interface ExplainResult {
  overview: string; // Brief summary
  fields?: Field[]; // Class/module data fields
  mainComponents: ComponentInfo[]; // Key components (methods, functions, constants, classes, etc.)
  methodDependencies?: MethodDependency[]; // Dependencies between methods in this file
  howItWorks: WorkflowStep[]; // Step-by-step flow
  keyConcepts: KeyConcept[]; // Important concepts
  dependencies: Dependency[]; // External/internal dependencies
  notableFeatures: string[]; // Highlights
  timestamp: string;
}
