/**
 * Unit tests for ReportExporter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportExporter } from '../src/services/ReportExporter.js';
import type { MergedAnalysisResult, CodeIssue } from '../src/types/analysis.types.js';

describe('ReportExporter', () => {
  let exporter: ReportExporter;
  let sampleResult: MergedAnalysisResult;

  beforeEach(() => {
    exporter = new ReportExporter();
    sampleResult = createSampleResult();
  });

  describe('Constructor', () => {
    it('should create instance', () => {
      expect(exporter).toBeDefined();
    });
  });

  describe('Markdown Export', () => {
    it('should export basic markdown report', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      expect(markdown).toContain('# Code Review Analysis Report');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Statistics');
      expect(markdown).toContain('## Issues');
    });

    it('should include summary section', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeSummary: true,
      });

      expect(markdown).toContain('**Change Type**:');
      expect(markdown).toContain('**Files Changed**:');
      expect(markdown).toContain('**Quality Score**:');
      expect(markdown).toContain('**Risk Level**:');
    });

    it('should include statistics section', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeStatistics: true,
      });

      expect(markdown).toContain('### Issues by Severity');
      expect(markdown).toContain('### Issues by Type');
      expect(markdown).toContain('### Issues by Source');
    });

    it('should include impact analysis section', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeImpact: true,
      });

      expect(markdown).toContain('## Impact Analysis');
    });

    it('should include deduplication info', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeDeduplication: true,
      });

      expect(markdown).toContain('## Deduplication');
      expect(markdown).toContain('**Total Issues Found**:');
      expect(markdown).toContain('**Duplicates Removed**:');
      expect(markdown).toContain('**Unique Issues**:');
    });

    it('should group issues by file', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        groupByFile: true,
      });

      expect(markdown).toContain('### 📄');
    });

    it('should group issues by severity', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        groupBySeverity: true,
        groupByFile: false,
      });

      expect(markdown).toMatch(/### (Critical|High|Medium|Low|Info)/);
    });

    it('should limit number of issues shown', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        maxIssues: 1,
      });

      expect(markdown).toContain('Showing 1 of');
    });

    it('should show all issues when maxIssues is 0', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        maxIssues: 0,
      });

      expect(markdown).not.toContain('Showing');
    });

    it('should handle empty results', () => {
      const emptyResult = createEmptyResult();
      const markdown = exporter.export(emptyResult, 'markdown');

      expect(markdown).toContain('✅ No issues found!');
    });

    it('should format severity icons', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      expect(markdown).toMatch(/[🔴🟠🟡🔵ℹ️]/);
    });

    it('should include issue details', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      expect(markdown).toContain('**Location**:');
      expect(markdown).toContain('**Type**:');
      expect(markdown).toContain('**Source**:');
    });

    it('should exclude sections when configured', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeSummary: false,
        includeStatistics: false,
        includeImpact: false,
        includeDeduplication: false,
      });

      expect(markdown).not.toContain('## Summary');
      expect(markdown).not.toContain('## Statistics');
      expect(markdown).not.toContain('## Impact Analysis');
      expect(markdown).not.toContain('## Deduplication');
    });
  });

  describe('HTML Export', () => {
    it('should export valid HTML', () => {
      const html = exporter.export(sampleResult, 'html');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
    });

    it('should include CSS styles', () => {
      const html = exporter.export(sampleResult, 'html');

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain('font-family');
    });

    it('should include report content', () => {
      const html = exporter.export(sampleResult, 'html');

      expect(html).toContain('Code Review Analysis Report');
    });

    it('should escape HTML entities', () => {
      const resultWithSpecialChars = createSampleResult();
      resultWithSpecialChars.fileAnalyses[0].issues[0].message = '<script>alert("xss")</script>';

      const html = exporter.export(resultWithSpecialChars, 'html');

      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>alert');
    });

    it('should have responsive viewport', () => {
      const html = exporter.export(sampleResult, 'html');

      expect(html).toContain('viewport');
      expect(html).toContain('width=device-width');
    });
  });

  describe('JSON Export', () => {
    it('should export valid JSON', () => {
      const json = exporter.export(sampleResult, 'json');

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include metadata', () => {
      const json = exporter.export(sampleResult, 'json');
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.timestamp).toBeDefined();
      expect(parsed.metadata.changeType).toBeDefined();
    });

    it('should include summary when configured', () => {
      const json = exporter.export(sampleResult, 'json', {
        includeSummary: true,
      });
      const parsed = JSON.parse(json);

      expect(parsed.summary).toBeDefined();
      expect(parsed.summary.filesChanged).toBeDefined();
    });

    it('should include statistics when configured', () => {
      const json = exporter.export(sampleResult, 'json', {
        includeStatistics: true,
      });
      const parsed = JSON.parse(json);

      expect(parsed.statistics).toBeDefined();
      expect(parsed.statistics.totalIssues).toBeDefined();
      expect(parsed.statistics.bySeverity).toBeDefined();
      expect(parsed.statistics.byType).toBeDefined();
    });

    it('should include impact when configured', () => {
      const json = exporter.export(sampleResult, 'json', {
        includeImpact: true,
      });
      const parsed = JSON.parse(json);

      expect(parsed.impact).toBeDefined();
      expect(parsed.impact.riskLevel).toBeDefined();
    });

    it('should include deduplication when configured', () => {
      const json = exporter.export(sampleResult, 'json', {
        includeDeduplication: true,
      });
      const parsed = JSON.parse(json);

      expect(parsed.deduplication).toBeDefined();
    });

    it('should include issues when configured', () => {
      const json = exporter.export(sampleResult, 'json', {
        includeIssues: true,
      });
      const parsed = JSON.parse(json);

      expect(parsed.issues).toBeDefined();
      expect(Array.isArray(parsed.issues)).toBe(true);
    });

    it('should limit issues when maxIssues is set', () => {
      const json = exporter.export(sampleResult, 'json', {
        maxIssues: 1,
      });
      const parsed = JSON.parse(json);

      expect(parsed.issues.length).toBe(1);
    });

    it('should include file analyses', () => {
      const json = exporter.export(sampleResult, 'json');
      const parsed = JSON.parse(json);

      expect(parsed.fileAnalyses).toBeDefined();
      expect(Array.isArray(parsed.fileAnalyses)).toBe(true);
    });

    it('should be properly formatted', () => {
      const json = exporter.export(sampleResult, 'json');

      // Check for indentation (pretty-printed)
      expect(json).toContain('\n');
      expect(json).toContain('  '); // 2-space indentation
    });
  });

  describe('Export Options', () => {
    it('should use default options', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## Statistics');
      expect(markdown).toContain('## Impact Analysis');
      expect(markdown).toContain('## Issues');
    });

    it('should merge custom options with defaults', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeSummary: false,
      });

      expect(markdown).not.toContain('## Summary');
      expect(markdown).toContain('## Statistics'); // Still included (default)
    });

    it('should handle all options disabled', () => {
      const markdown = exporter.export(sampleResult, 'markdown', {
        includeSummary: false,
        includeIssues: false,
        includeStatistics: false,
        includeImpact: false,
        includeDeduplication: false,
      });

      expect(markdown).toContain('# Code Review Analysis Report');
      expect(markdown).not.toContain('## Summary');
      expect(markdown).not.toContain('## Issues');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', () => {
      expect(() => {
        exporter.export(sampleResult, 'xml' as any);
      }).toThrow('Unsupported export format');
    });
  });

  describe('Formatting Helpers', () => {
    it('should format severity correctly', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      // Sample result has 'high' and 'medium' severity issues
      expect(markdown).toContain('High');
      expect(markdown).toContain('Medium');
    });

    it('should format types correctly', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      expect(markdown).toContain('Bug');
      expect(markdown).toContain('Code Smell');
    });

    it('should format risk levels with emojis', () => {
      const markdown = exporter.export(sampleResult, 'markdown');

      expect(markdown).toMatch(/[🔴🟠🟡🟢]/);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple files with issues', () => {
      const result = createMultiFileResult();
      const markdown = exporter.export(result, 'markdown', {
        groupByFile: true,
      });

      expect(markdown).toContain('file1.ts');
      expect(markdown).toContain('file2.ts');
    });

    it('should handle mixed severity issues', () => {
      const result = createMixedSeverityResult();
      const markdown = exporter.export(result, 'markdown', {
        groupBySeverity: true,
        groupByFile: false,
      });

      expect(markdown).toContain('Critical');
      expect(markdown).toContain('High');
      expect(markdown).toContain('Medium');
    });

    it('should handle issues with all optional fields', () => {
      const result = createDetailedResult();
      const markdown = exporter.export(result, 'markdown');

      expect(markdown).toContain('**Rule**:');
      expect(markdown).toContain('**Effort**:');
      expect(markdown).toContain('**Suggestion**:');
    });

    it('should handle large number of issues', () => {
      const result = createLargeResult(100);
      const markdown = exporter.export(result, 'markdown', {
        maxIssues: 10,
      });

      expect(markdown).toContain('Showing 10 of 100');
    });

    it('should handle breaking changes in impact', () => {
      const result = createSampleResult();
      result.impactAnalysis.breakingChanges = ['API change', 'Database schema change'];

      const markdown = exporter.export(result, 'markdown');

      expect(markdown).toContain('⚠️ Breaking Changes');
      expect(markdown).toContain('API change');
    });

    it('should handle deployment risks', () => {
      const result = createSampleResult();
      result.impactAnalysis.deploymentRisks = ['Database migration required'];

      const markdown = exporter.export(result, 'markdown');

      expect(markdown).toContain('Deployment Risks');
    });

    it('should handle testing recommendations', () => {
      const result = createSampleResult();
      result.impactAnalysis.testingRecommendations = ['Add integration tests'];

      const markdown = exporter.export(result, 'markdown');

      expect(markdown).toContain('Testing Recommendations');
    });
  });
});

// Helper functions

function createSampleResult(): MergedAnalysisResult {
  return {
    changeType: 'working-directory',
    summary: {
      filesChanged: 2,
      insertions: 50,
      deletions: 20,
    },
    fileAnalyses: [
      {
        file: 'test.ts',
        changeType: 'feature',
        issues: [
          {
            source: 'ai',
            severity: 'high',
            type: 'bug',
            file: 'test.ts',
            line: 10,
            message: 'Potential null pointer',
          },
          {
            source: 'sonarqube',
            severity: 'medium',
            type: 'code-smell',
            file: 'test.ts',
            line: 20,
            message: 'Complex function',
          },
        ],
        summary: 'Added new feature',
        linesChanged: 30,
      },
    ],
    impactAnalysis: {
      riskLevel: 'medium',
      affectedModules: ['auth', 'api'],
      breakingChanges: [],
      testingRecommendations: [],
      deploymentRisks: [],
      qualityScore: 75,
    },
    timestamp: '2025-01-20T00:00:00Z',
    duration: 5000,
    deduplicationInfo: {
      totalIssues: 3,
      duplicatesRemoved: 1,
      uniqueIssues: 2,
    },
  };
}

function createEmptyResult(): MergedAnalysisResult {
  return {
    changeType: 'working-directory',
    summary: {
      filesChanged: 0,
      additions: 0,
      deletions: 0,
    },
    fileAnalyses: [],
    impactAnalysis: {
      riskLevel: 'low',
      affectedModules: [],
      breakingChanges: [],
      testingRecommendations: [],
      deploymentRisks: [],
      qualityScore: 100,
    },
    timestamp: '2025-01-20T00:00:00Z',
  };
}

function createMultiFileResult(): MergedAnalysisResult {
  const result = createSampleResult();
  result.fileAnalyses.push({
    file: 'file1.ts',
    changeType: 'feature',
    issues: [
      {
        source: 'ai',
        severity: 'low',
        type: 'code-smell',
        file: 'file1.ts',
        line: 5,
        message: 'Issue in file 1',
      },
    ],
    summary: 'File 1 changes',
    linesChanged: 10,
  });
  result.fileAnalyses.push({
    file: 'file2.ts',
    changeType: 'bugfix',
    issues: [
      {
        source: 'sonarqube',
        severity: 'high',
        type: 'vulnerability',
        file: 'file2.ts',
        line: 15,
        message: 'Issue in file 2',
      },
    ],
    summary: 'File 2 changes',
    linesChanged: 20,
  });
  return result;
}

function createMixedSeverityResult(): MergedAnalysisResult {
  const result = createSampleResult();
  result.fileAnalyses[0].issues = [
    {
      source: 'ai',
      severity: 'critical',
      type: 'vulnerability',
      file: 'test.ts',
      line: 1,
      message: 'Critical issue',
    },
    {
      source: 'ai',
      severity: 'high',
      type: 'bug',
      file: 'test.ts',
      line: 2,
      message: 'High issue',
    },
    {
      source: 'ai',
      severity: 'medium',
      type: 'code-smell',
      file: 'test.ts',
      line: 3,
      message: 'Medium issue',
    },
    {
      source: 'ai',
      severity: 'low',
      type: 'code-smell',
      file: 'test.ts',
      line: 4,
      message: 'Low issue',
    },
    {
      source: 'ai',
      severity: 'info',
      type: 'code-smell',
      file: 'test.ts',
      line: 5,
      message: 'Info issue',
    },
  ];
  return result;
}

function createDetailedResult(): MergedAnalysisResult {
  const result = createSampleResult();
  result.fileAnalyses[0].issues[0] = {
    source: 'sonarqube',
    severity: 'high',
    type: 'bug',
    file: 'test.ts',
    line: 10,
    message: 'Detailed issue',
    rule: 'typescript:S1234',
    effort: 30,
    suggestion: 'Fix by doing X',
  };
  return result;
}

function createLargeResult(issueCount: number): MergedAnalysisResult {
  const result = createSampleResult();
  const issues: CodeIssue[] = [];

  for (let i = 0; i < issueCount; i++) {
    issues.push({
      source: 'ai',
      severity: 'medium',
      type: 'code-smell',
      file: 'test.ts',
      line: i + 1,
      message: `Issue ${i + 1}`,
    });
  }

  result.fileAnalyses[0].issues = issues;
  return result;
}

