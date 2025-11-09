import type { AnalysisResult } from '../../types/ai.js';

/**
 * 基础分析结果fixture
 * 包含一个medium severity的质量问题
 */
export const mockAnalysisResult: AnalysisResult = {
  issues: [
    {
      severity: 'medium',
      category: 'quality',
      line: 10,
      message: 'Variable name could be more descriptive',
      suggestion: 'Use camelCase naming',
    },
  ],
  summary: 'Found 1 issue',
  timestamp: '2024-01-01T00:00:00.000Z',
};

/**
 * 空结果（无问题）
 */
export const mockEmptyAnalysisResult: AnalysisResult = {
  issues: [],
  summary: 'No issues found',
  timestamp: '2024-01-01T00:00:00.000Z',
};

/**
 * 缓存的结果
 */
export const mockCachedResult: AnalysisResult = {
  issues: [],
  summary: 'No issues (cached)',
  timestamp: '2024-01-01T00:00:00.000Z',
};

/**
 * 多问题结果
 * 包含不同severity和category的问题
 */
export const mockMultipleIssuesResult: AnalysisResult = {
  issues: [
    {
      severity: 'critical',
      category: 'security',
      line: 5,
      message: 'Potential SQL injection vulnerability',
      suggestion: 'Use parameterized queries',
      codeExample: {
        before: 'query = "SELECT * FROM users WHERE id=" + userId',
        after: 'query = db.prepare("SELECT * FROM users WHERE id=?").bind(userId)',
      },
    },
    {
      severity: 'high',
      category: 'performance',
      line: 20,
      message: 'Inefficient loop detected',
      suggestion: 'Consider using Array.map()',
    },
    {
      severity: 'medium',
      category: 'quality',
      line: 35,
      message: 'Complex function with high cyclomatic complexity',
      suggestion: 'Break down into smaller functions',
    },
  ],
  summary: 'Found 3 issues: 1 critical, 1 high, 1 medium',
  timestamp: '2024-01-01T00:00:00.000Z',
};

/**
 * 安全问题结果
 */
export const mockSecurityIssuesResult: AnalysisResult = {
  issues: [
    {
      severity: 'critical',
      category: 'security',
      line: 10,
      message: 'Hardcoded API key detected',
      suggestion: 'Move sensitive data to environment variables',
      codeExample: {
        before: 'const apiKey = "sk-1234567890abcdef"',
        after: 'const apiKey = process.env.API_KEY',
      },
    },
  ],
  summary: 'Found 1 critical security issue',
  timestamp: '2024-01-01T00:00:00.000Z',
};

/**
 * 性能问题结果
 */
export const mockPerformanceIssuesResult: AnalysisResult = {
  issues: [
    {
      severity: 'high',
      category: 'performance',
      line: 15,
      message: 'N+1 query problem detected',
      suggestion: 'Use bulk loading or eager loading',
    },
    {
      severity: 'medium',
      category: 'performance',
      line: 42,
      message: 'Unnecessary re-renders detected',
      suggestion: 'Use React.memo or useMemo',
    },
  ],
  summary: 'Found 2 performance issues',
  timestamp: '2024-01-01T00:00:00.000Z',
};
