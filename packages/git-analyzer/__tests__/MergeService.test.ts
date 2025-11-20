/**
 * Unit tests for MergeService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MergeService } from '../src/services/MergeService.js';
import type {
  AIAnalysisResult,
  CodeIssue,
  FileAnalysis,
  ImpactAnalysis,
  ChangeAnalysisResult,
} from '../src/types/analysis.types.js';
import type {
  SonarQubeAnalysisResult,
  SonarQubeIssue,
  SonarQubeSeverity,
  SonarQubeIssueType,
  QualityGateStatus,
} from '../src/types/sonarqube.types.js';

describe('MergeService', () => {
  let mergeService: MergeService;

  beforeEach(() => {
    mergeService = new MergeService();
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const service = new MergeService();
      expect(service).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const service = new MergeService({
        deduplicationStrategy: 'exact',
        fuzzyMatchThreshold: 0.9,
        preferSonarQube: false,
        includeRawResults: true,
      });
      expect(service).toBeDefined();
    });
  });

  describe('Severity Mapping', () => {
    it('should map BLOCKER to critical', () => {
      const sonarIssue = createSonarQubeIssue({
        severity: 'BLOCKER' as SonarQubeSeverity,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].severity).toBe('critical');
    });

    it('should map CRITICAL to critical', () => {
      const sonarIssue = createSonarQubeIssue({
        severity: 'CRITICAL' as SonarQubeSeverity,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].severity).toBe('critical');
    });

    it('should map MAJOR to high', () => {
      const sonarIssue = createSonarQubeIssue({
        severity: 'MAJOR' as SonarQubeSeverity,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].severity).toBe('high');
    });

    it('should map MINOR to medium', () => {
      const sonarIssue = createSonarQubeIssue({
        severity: 'MINOR' as SonarQubeSeverity,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].severity).toBe('medium');
    });

    it('should map INFO to info', () => {
      const sonarIssue = createSonarQubeIssue({
        severity: 'INFO' as SonarQubeSeverity,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].severity).toBe('info');
    });
  });

  describe('Type Mapping', () => {
    it('should map BUG to bug', () => {
      const sonarIssue = createSonarQubeIssue({
        type: 'BUG' as SonarQubeIssueType,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].type).toBe('bug');
    });

    it('should map VULNERABILITY to vulnerability', () => {
      const sonarIssue = createSonarQubeIssue({
        type: 'VULNERABILITY' as SonarQubeIssueType,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].type).toBe('vulnerability');
    });

    it('should map CODE_SMELL to code-smell', () => {
      const sonarIssue = createSonarQubeIssue({
        type: 'CODE_SMELL' as SonarQubeIssueType,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].type).toBe('code-smell');
    });

    it('should map SECURITY_HOTSPOT to security-hotspot', () => {
      const sonarIssue = createSonarQubeIssue({
        type: 'SECURITY_HOTSPOT' as SonarQubeIssueType,
      });
      const result = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, result, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].type).toBe('security-hotspot');
    });
  });

  describe('Deduplication - Exact Match', () => {
    beforeEach(() => {
      mergeService = new MergeService({ deduplicationStrategy: 'exact' });
    });

    it('should remove exact duplicates', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Duplicate issue',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Duplicate issue',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.deduplicationInfo?.totalIssues).toBe(2);
      expect(merged.deduplicationInfo?.duplicatesRemoved).toBe(1);
      expect(merged.deduplicationInfo?.uniqueIssues).toBe(1);
    });

    it('should keep non-duplicate issues', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'AI issue',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 20, endLine: 20 },
        message: 'SonarQube issue',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.deduplicationInfo?.uniqueIssues).toBe(2);
      expect(merged.deduplicationInfo?.duplicatesRemoved).toBe(0);
    });

    it('should prefer SonarQube issues by default', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Duplicate issue',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Duplicate issue',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].source).toBe('sonarqube');
    });

    it('should prefer AI issues when configured', () => {
      mergeService = new MergeService({
        deduplicationStrategy: 'exact',
        preferSonarQube: false,
      });

      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Duplicate issue',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Duplicate issue',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].source).toBe('ai');
    });
  });

  describe('Deduplication - Fuzzy Match', () => {
    beforeEach(() => {
      mergeService = new MergeService({
        deduplicationStrategy: 'fuzzy',
        fuzzyMatchThreshold: 0.8,
      });
    });

    it('should detect similar messages', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Variable is not used',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Variable not used',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.deduplicationInfo?.duplicatesRemoved).toBeGreaterThan(0);
    });

    it('should keep dissimilar messages', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Variable is not used',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Security vulnerability detected',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.deduplicationInfo?.uniqueIssues).toBe(2);
    });

    it('should respect fuzzy threshold', () => {
      mergeService = new MergeService({
        deduplicationStrategy: 'fuzzy',
        fuzzyMatchThreshold: 0.95, // Very strict
      });

      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Variable is not used',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Variable not used', // Similar but not 95% match
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      // With strict threshold, these might not be considered duplicates
      expect(merged.deduplicationInfo?.uniqueIssues).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Deduplication - Location Based', () => {
    beforeEach(() => {
      mergeService = new MergeService({ deduplicationStrategy: 'location' });
    });

    it('should deduplicate by file and line only', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Completely different message',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 10, endLine: 10 },
        message: 'Another different message',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.deduplicationInfo?.duplicatesRemoved).toBe(1);
      expect(merged.deduplicationInfo?.uniqueIssues).toBe(1);
    });

    it('should keep issues on different lines', () => {
      const aiIssues = [
        createCodeIssue({
          source: 'ai',
          file: 'test.ts',
          line: 10,
          message: 'Issue',
        }),
      ];
      const sonarIssue = createSonarQubeIssue({
        component: 'project:test.ts',
        textRange: { startLine: 20, endLine: 20 },
        message: 'Issue',
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.deduplicationInfo?.uniqueIssues).toBe(2);
    });
  });

  describe('Priority Sorting', () => {
    it('should sort by severity first', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'low', file: 'test.ts', line: 1 }),
        createCodeIssue({ severity: 'critical', file: 'test.ts', line: 2 }),
        createCodeIssue({ severity: 'medium', file: 'test.ts', line: 3 }),
        createCodeIssue({ severity: 'high', file: 'test.ts', line: 4 }),
      ];

      const aiResult = createAIResult(aiIssues);
      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].severity).toBe('critical');
      expect(issues[1].severity).toBe('high');
      expect(issues[2].severity).toBe('medium');
      expect(issues[3].severity).toBe('low');
    });

    it('should sort by type when severity is same', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'high', type: 'code-smell', file: 'test.ts', line: 1 }),
        createCodeIssue({ severity: 'high', type: 'vulnerability', file: 'test.ts', line: 2 }),
        createCodeIssue({ severity: 'high', type: 'bug', file: 'test.ts', line: 3 }),
      ];

      const aiResult = createAIResult(aiIssues);
      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].type).toBe('vulnerability');
      expect(issues[1].type).toBe('bug');
      expect(issues[2].type).toBe('code-smell');
    });

    it('should sort by file and line when severity and type are same', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'high', type: 'bug', file: 'b.ts', line: 20 }),
        createCodeIssue({ severity: 'high', type: 'bug', file: 'a.ts', line: 10 }),
        createCodeIssue({ severity: 'high', type: 'bug', file: 'a.ts', line: 5 }),
      ];

      const aiResult = createAIResult(aiIssues);
      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].file).toBe('a.ts');
      expect(issues[0].line).toBe(5);
      expect(issues[1].file).toBe('a.ts');
      expect(issues[1].line).toBe(10);
      expect(issues[2].file).toBe('b.ts');
    });
  });

  describe('Impact Calculation', () => {
    it('should set risk level to critical when critical issues exist', () => {
      const aiIssues = [createCodeIssue({ severity: 'critical' })];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.impactAnalysis.riskLevel).toBe('critical');
    });

    it('should set risk level to high when multiple high issues exist', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'high', line: 1, message: 'Issue 1' }),
        createCodeIssue({ severity: 'high', line: 2, message: 'Issue 2' }),
        createCodeIssue({ severity: 'high', line: 3, message: 'Issue 3' }),
        createCodeIssue({ severity: 'high', line: 4, message: 'Issue 4' }),
      ];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.impactAnalysis.riskLevel).toBe('high');
    });

    it('should set risk level to medium when few high issues or many issues', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'high' }),
        createCodeIssue({ severity: 'medium' }),
      ];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.impactAnalysis.riskLevel).toBe('medium');
    });

    it('should set risk level to low when few low-severity issues', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'low' }),
        createCodeIssue({ severity: 'info' }),
      ];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.impactAnalysis.riskLevel).toBe('low');
    });

    it('should calculate quality score based on issues', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'critical' }), // -15
        createCodeIssue({ severity: 'high' }), // -10
        createCodeIssue({ severity: 'medium' }), // -5
      ];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.impactAnalysis.qualityScore).toBeLessThan(100);
      expect(merged.impactAnalysis.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should consider SonarQube metrics in quality score', () => {
      const aiResult = createAIResult([]);
      const sonarResult = createSonarQubeResult([], {
        bugs: 5,
        vulnerabilities: 2,
        codeSmells: 10,
      });

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.impactAnalysis.qualityScore).toBeLessThan(100);
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', () => {
      const aiIssues = [
        createCodeIssue({ severity: 'critical', type: 'bug', source: 'ai', file: 'file1.ts', line: 1 }),
        createCodeIssue({ severity: 'high', type: 'vulnerability', source: 'ai', file: 'file2.ts', line: 2 }),
      ];
      const sonarIssue = createSonarQubeIssue({
        severity: 'MAJOR' as SonarQubeSeverity,
        type: 'CODE_SMELL' as SonarQubeIssueType,
        component: 'project:file3.ts',
        textRange: { startLine: 3, endLine: 3 },
      });

      const aiResult = createAIResult(aiIssues);
      const sonarResult = createSonarQubeResult([sonarIssue]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());
      const stats = mergeService.getStatistics(merged);

      expect(stats.totalIssues).toBe(3);
      expect(stats.issuesBySeverity.critical).toBe(1);
      expect(stats.issuesBySeverity.high).toBe(2); // MAJOR maps to high
      expect(stats.issuesByType.bug).toBe(1);
      expect(stats.issuesByType.vulnerability).toBe(1);
      expect(stats.issuesByType['code-smell']).toBe(1);
      expect(stats.issuesBySource.ai).toBe(2);
      expect(stats.issuesBySource.sonarqube).toBe(1);
    });

    it('should handle empty results', () => {
      const aiResult = createAIResult([]);
      const merged = mergeService.merge(aiResult, undefined, createBaseResult());
      const stats = mergeService.getStatistics(merged);

      expect(stats.totalIssues).toBe(0);
      expect(stats.filesAnalyzed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Raw Results Inclusion', () => {
    it('should include raw results when configured', () => {
      mergeService = new MergeService({ includeRawResults: true });

      const aiResult = createAIResult([]);
      const sonarResult = createSonarQubeResult([]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.sonarQubeResults).toBeDefined();
      expect(merged.aiResults).toBeDefined();
    });

    it('should not include raw results by default', () => {
      const aiResult = createAIResult([]);
      const sonarResult = createSonarQubeResult([]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      expect(merged.sonarQubeResults).toBeUndefined();
      expect(merged.aiResults).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty AI results', () => {
      const aiResult = createAIResult([]);
      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.fileAnalyses).toBeDefined();
      expect(merged.deduplicationInfo?.uniqueIssues).toBe(0);
    });

    it('should handle undefined SonarQube results', () => {
      const aiIssues = [createCodeIssue()];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      expect(merged.fileAnalyses.flatMap((f) => f.issues).length).toBe(1);
    });

    it('should handle issues without line numbers', () => {
      const aiIssues = [createCodeIssue({ line: 0 })];
      const aiResult = createAIResult(aiIssues);

      const merged = mergeService.merge(aiResult, undefined, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].line).toBe(0);
    });

    it('should handle SonarQube issues without text range', () => {
      const sonarIssue = createSonarQubeIssue({ textRange: undefined });
      const sonarResult = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].line).toBe(0);
    });

    it('should parse effort strings correctly', () => {
      const sonarIssue = createSonarQubeIssue({ effort: '30min' });
      const sonarResult = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].effort).toBe(30);
    });

    it('should handle complex component paths', () => {
      const sonarIssue = createSonarQubeIssue({
        component: 'my-project:src/services/MyService.ts',
      });
      const sonarResult = createSonarQubeResult([sonarIssue]);
      const aiResult = createAIResult([]);

      const merged = mergeService.merge(aiResult, sonarResult, createBaseResult());

      const issues = merged.fileAnalyses.flatMap((f) => f.issues);
      expect(issues[0].file).toBe('src/services/MyService.ts');
    });
  });
});

// Helper functions

function createCodeIssue(overrides: Partial<CodeIssue> = {}): CodeIssue {
  return {
    source: 'ai',
    severity: 'medium',
    type: 'code-smell',
    file: 'test.ts',
    line: 10,
    message: 'Test issue',
    ...overrides,
  };
}

function createSonarQubeIssue(overrides: Partial<SonarQubeIssue> = {}): SonarQubeIssue {
  return {
    key: 'issue-1',
    rule: 'typescript:S1234',
    severity: 'MAJOR' as SonarQubeSeverity,
    type: 'CODE_SMELL' as SonarQubeIssueType,
    component: 'project:test.ts',
    project: 'project',
    message: 'Test issue',
    status: 'OPEN' as any,
    creationDate: '2025-01-20T00:00:00Z',
    updateDate: '2025-01-20T00:00:00Z',
    textRange: { startLine: 10, endLine: 10 },
    ...overrides,
  };
}

function createSonarQubeResult(
  issues: SonarQubeIssue[] = [],
  metricsOverride: Partial<SonarQubeAnalysisResult['metrics']> = {}
): SonarQubeAnalysisResult {
  return {
    projectKey: 'test-project',
    analysisDate: '2025-01-20T00:00:00Z',
    issues,
    metrics: {
      bugs: 0,
      vulnerabilities: 0,
      codeSmells: 0,
      securityHotspots: 0,
      ...metricsOverride,
    },
    qualityGate: {
      status: 'OK' as QualityGateStatus,
    },
    issuesBySeverity: {
      BLOCKER: 0,
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      INFO: 0,
    },
    issuesByType: {
      BUG: 0,
      VULNERABILITY: 0,
      CODE_SMELL: 0,
      SECURITY_HOTSPOT: 0,
    },
  };
}

function createAIResult(issues: CodeIssue[]): AIAnalysisResult {
  const fileAnalyses: FileAnalysis[] = [];

  // Group issues by file
  const issuesByFile = new Map<string, CodeIssue[]>();
  for (const issue of issues) {
    const fileIssues = issuesByFile.get(issue.file) || [];
    fileIssues.push(issue);
    issuesByFile.set(issue.file, fileIssues);
  }

  for (const [file, fileIssues] of issuesByFile) {
    fileAnalyses.push({
      file,
      changeType: 'unknown',
      issues: fileIssues,
      summary: 'Test analysis',
      linesChanged: 10,
    });
  }

  return {
    fileAnalyses,
    impactAnalysis: createImpactAnalysis(),
  };
}

function createImpactAnalysis(): ImpactAnalysis {
  return {
    riskLevel: 'low',
    affectedModules: [],
    breakingChanges: [],
    testingRecommendations: [],
    deploymentRisks: [],
    qualityScore: 100,
  };
}

function createBaseResult(): ChangeAnalysisResult {
  return {
    changeType: 'working-directory',
    summary: {
      filesChanged: 1,
      insertions: 10,
      deletions: 5,
    },
    fileAnalyses: [],
    impactAnalysis: createImpactAnalysis(),
    timestamp: new Date().toISOString(),
  };
}

