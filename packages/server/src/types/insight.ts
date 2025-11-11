import type { AnalysisResult } from './ai.js';
import type { UMLResult, DiagramType } from '../services/umlService.js';

/**
 * UML diagrams storage for a file
 * Stores different types of UML diagrams
 */
export interface UMLDiagrams {
  class?: UMLResult;
  flowchart?: UMLResult;
  sequence?: UMLResult;
  dependency?: UMLResult;
}

/**
 * Insight record for a file
 * Stores the analysis result, UML diagrams, and code hash for comparison
 */
export interface InsightRecord {
  filePath: string; // Primary key
  codeHash: string; // SHA256 hash of the code
  analysis?: AnalysisResult; // LLM analysis result (optional)
  uml?: UMLDiagrams; // UML diagrams (optional)
  timestamp: string; // Last update timestamp
}

export type { DiagramType };

/**
 * Query result for insight check
 */
export interface InsightCheckResult {
  hasRecord: boolean;
  hashMatched: boolean;
  insight: InsightRecord | null;
}
