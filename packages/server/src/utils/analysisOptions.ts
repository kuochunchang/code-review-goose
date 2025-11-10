import type { AnalysisOptions } from '../types/ai.js';

/**
 * Create standardized analysis options
 * This ensures cache keys match between UI, CLI batch analysis, and tests
 */
export function createAnalysisOptions(filePath: string, language: string): AnalysisOptions {
  return {
    language,
    filePath,
    checkQuality: true,
    checkSecurity: true,
    checkPerformance: true,
    checkBestPractices: true,
    checkBugs: true,
  };
}
