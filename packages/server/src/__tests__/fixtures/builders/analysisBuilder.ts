import type { AnalysisResult, Issue } from '../../../types/ai.js';

/**
 * AnalysisResult Builder
 * 用于灵活构建测试所需的分析结果
 *
 * @example
 * const result = buildAnalysisResult()
 *   .addCriticalIssue('SQL injection detected', 10)
 *   .addIssue({ severity: 'medium', line: 20, message: 'Code smell' })
 *   .withSummary('Found 2 issues')
 *   .build();
 */
export class AnalysisResultBuilder {
  private issues: Issue[] = [];
  private summary: string = '';
  private timestamp: string = new Date().toISOString();

  /**
   * 添加一个issue
   * @param issue - Issue对象（可以是部分属性）
   */
  addIssue(issue: Partial<Issue>): this {
    this.issues.push({
      severity: issue.severity || 'medium',
      category: issue.category || 'quality',
      line: issue.line || 1,
      message: issue.message || 'Default message',
      suggestion: issue.suggestion || 'Default suggestion',
      column: issue.column,
      codeExample: issue.codeExample,
    });
    return this;
  }

  /**
   * 添加critical severity的issue
   * @param message - 问题描述
   * @param line - 行号
   */
  addCriticalIssue(message: string, line: number = 1): this {
    return this.addIssue({
      severity: 'critical',
      category: 'security',
      line,
      message,
      suggestion: `Fix critical issue: ${message}`,
    });
  }

  /**
   * 添加high severity的issue
   * @param message - 问题描述
   * @param line - 行号
   */
  addHighIssue(message: string, line: number = 1): this {
    return this.addIssue({
      severity: 'high',
      category: 'bug',
      line,
      message,
      suggestion: `Fix high priority issue: ${message}`,
    });
  }

  /**
   * 添加medium severity的issue
   * @param message - 问题描述
   * @param line - 行号
   */
  addMediumIssue(message: string, line: number = 1): this {
    return this.addIssue({
      severity: 'medium',
      category: 'quality',
      line,
      message,
      suggestion: `Consider improving: ${message}`,
    });
  }

  /**
   * 添加安全问题
   * @param message - 问题描述
   * @param line - 行号
   * @param severity - 严重程度（默认critical）
   */
  addSecurityIssue(
    message: string,
    line: number = 1,
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'critical'
  ): this {
    return this.addIssue({
      severity,
      category: 'security',
      line,
      message,
      suggestion: `Security fix required: ${message}`,
    });
  }

  /**
   * 添加性能问题
   * @param message - 问题描述
   * @param line - 行号
   * @param severity - 严重程度（默认medium）
   */
  addPerformanceIssue(
    message: string,
    line: number = 1,
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info' = 'medium'
  ): this {
    return this.addIssue({
      severity,
      category: 'performance',
      line,
      message,
      suggestion: `Performance optimization: ${message}`,
    });
  }

  /**
   * 添加带代码示例的issue
   * @param message - 问题描述
   * @param line - 行号
   * @param before - 修改前代码
   * @param after - 修改后代码
   */
  addIssueWithExample(
    message: string,
    line: number,
    before: string,
    after: string
  ): this {
    return this.addIssue({
      severity: 'medium',
      category: 'quality',
      line,
      message,
      suggestion: `Refactor code as shown in example`,
      codeExample: { before, after },
    });
  }

  /**
   * 设置summary
   * @param summary - 总结信息
   */
  withSummary(summary: string): this {
    this.summary = summary;
    return this;
  }

  /**
   * 设置timestamp
   * @param timestamp - 时间戳
   */
  withTimestamp(timestamp: string): this {
    this.timestamp = timestamp;
    return this;
  }

  /**
   * 自动生成summary（基于issues数量）
   */
  withAutoSummary(): this {
    const count = this.issues.length;
    if (count === 0) {
      this.summary = 'No issues found';
    } else {
      const severityCounts = this.issues.reduce(
        (acc, issue) => {
          acc[issue.severity] = (acc[issue.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const parts = Object.entries(severityCounts)
        .map(([severity, count]) => `${count} ${severity}`)
        .join(', ');

      this.summary = `Found ${count} issue${count > 1 ? 's' : ''}: ${parts}`;
    }
    return this;
  }

  /**
   * 清空所有issues
   */
  clearIssues(): this {
    this.issues = [];
    return this;
  }

  /**
   * 构建并返回AnalysisResult
   */
  build(): AnalysisResult {
    return {
      issues: this.issues,
      summary: this.summary || `Found ${this.issues.length} issue${this.issues.length !== 1 ? 's' : ''}`,
      timestamp: this.timestamp,
    };
  }
}

/**
 * 便捷函数：创建一个新的AnalysisResultBuilder
 *
 * @example
 * const result = buildAnalysisResult()
 *   .addCriticalIssue('XSS vulnerability', 42)
 *   .withAutoSummary()
 *   .build();
 */
export const buildAnalysisResult = (): AnalysisResultBuilder => {
  return new AnalysisResultBuilder();
};
