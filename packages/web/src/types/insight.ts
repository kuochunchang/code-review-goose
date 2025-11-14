import type { AnalysisResult } from './analysis';

/**
 * UML diagram type
 */
export type DiagramType = 'class' | 'flowchart' | 'sequence' | 'dependency';

/**
 * UML generation mode
 */
export type DiagramGenerationMode = 'native' | 'ai' | 'hybrid';

/**
 * Cross-file analysis mode
 */
export type CrossFileAnalysisMode = 'forward' | 'reverse' | 'bidirectional';

/**
 * UML generation options
 */
export interface UMLGenerationOptions {
  crossFileAnalysis?: boolean;
  analysisMode?: CrossFileAnalysisMode;
  analysisDepth?: 1 | 2 | 3;
  forceRefresh?: boolean;
}

/**
 * UML result
 */
export interface UMLResult {
  type: DiagramType;
  mermaidCode: string;
  generationMode: DiagramGenerationMode;
  metadata?: {
    classes?: any[];
    functions?: string[];
    dependencies?: any[];
    sequences?: any[];
    fallbackReason?: string;
    autoFixed?: boolean;
    [key: string]: any;
  };
}

/**
 * UML diagrams storage for a file
 */
export interface UMLDiagrams {
  class?: UMLResult;
  flowchart?: UMLResult;
  sequence?: UMLResult;
  dependency?: UMLResult;
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

/**
 * Code explanation result (structured format)
 */
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

/**
 * Insight record for a file
 */
export interface InsightRecord {
  filePath: string;
  codeHash: string;
  analysis?: AnalysisResult;
  explain?: ExplainResult;
  uml?: UMLDiagrams;
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
