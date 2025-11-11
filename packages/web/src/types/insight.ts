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
}

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
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

/**
 * Code explanation result (structured format)
 */
export interface ExplainResult {
  overview: string; // Brief summary
  mainComponents: ComponentInfo[]; // Key components
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
