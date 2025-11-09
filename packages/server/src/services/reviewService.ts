import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  ReviewRecord,
  ReviewFilter,
  ReviewSort,
  ReviewQuery,
  ReviewStats,
  ExportOptions,
  CodeSnippet,
} from '../types/review.js';
import type { AnalysisResult } from '../types/ai.js';

const REVIEWS_DIR = '.code-review/reviews';

export class ReviewService {
  private reviewsDir: string;

  constructor(projectPath: string) {
    this.reviewsDir = path.join(projectPath, REVIEWS_DIR);
  }

  /**
   * Ensure reviews directory exists
   */
  private async ensureReviewsDir(): Promise<void> {
    await fs.ensureDir(this.reviewsDir);
  }

  /**
   * Get review file path
   */
  private getReviewPath(id: string): string {
    return path.join(this.reviewsDir, `${id}.json`);
  }

  /**
   * Find review record by file path
   */
  async findByFilePath(filePath: string): Promise<ReviewRecord | null> {
    try {
      if (!(await fs.pathExists(this.reviewsDir))) {
        return null;
      }

      const files = await fs.readdir(this.reviewsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const reviewPath = path.join(this.reviewsDir, file);
          const content = await fs.readFile(reviewPath, 'utf-8');
          const review = JSON.parse(content) as ReviewRecord;

          if (review.filePath === filePath) {
            return review;
          }
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding review by file path ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Create new review record or update existing one
   * If review exists for this file, update it; otherwise create new one
   */
  async createOrUpdate(data: {
    filePath: string;
    analysis: AnalysisResult;
    codeSnippet?: CodeSnippet;
    notes?: string;
  }): Promise<ReviewRecord> {
    await this.ensureReviewsDir();

    // Check if review exists for this file
    const existing = await this.findByFilePath(data.filePath);

    if (existing) {
      // Update existing review
      const updated: ReviewRecord = {
        ...existing,
        timestamp: new Date().toISOString(), // Update last review timestamp
        reviewCount: existing.reviewCount + 1, // Increment review count
        analysis: data.analysis, // Update analysis result
        codeSnippet: data.codeSnippet, // Update code snippet
        // Preserve existing notes, bookmarked, resolved status
      };

      const reviewPath = this.getReviewPath(existing.id);
      await fs.writeFile(reviewPath, JSON.stringify(updated, null, 2), 'utf-8');

      return updated;
    } else {
      // Create new review
      const now = new Date().toISOString();
      const review: ReviewRecord = {
        id: randomUUID(),
        timestamp: now,
        firstReviewedAt: now,
        reviewCount: 1,
        filePath: data.filePath,
        fileName: path.basename(data.filePath),
        analysis: data.analysis,
        codeSnippet: data.codeSnippet,
        notes: data.notes,
        bookmarked: false,
        resolved: false,
      };

      const reviewPath = this.getReviewPath(review.id);
      await fs.writeFile(reviewPath, JSON.stringify(review, null, 2), 'utf-8');

      return review;
    }
  }

  /**
   * Create new review record (kept for backward compatibility)
   * @deprecated Use createOrUpdate instead
   */
  async create(data: {
    filePath: string;
    analysis: AnalysisResult;
    codeSnippet?: CodeSnippet;
    notes?: string;
  }): Promise<ReviewRecord> {
    return this.createOrUpdate(data);
  }

  /**
   * Get single review record
   */
  async get(id: string): Promise<ReviewRecord | null> {
    try {
      const reviewPath = this.getReviewPath(id);
      if (!(await fs.pathExists(reviewPath))) {
        return null;
      }

      const content = await fs.readFile(reviewPath, 'utf-8');
      return JSON.parse(content) as ReviewRecord;
    } catch (error) {
      console.error(`Error reading review ${id}:`, error);
      return null;
    }
  }

  /**
   * Update review record
   */
  async update(
    id: string,
    updates: Partial<Pick<ReviewRecord, 'notes' | 'bookmarked' | 'resolved' | 'tags'>>
  ): Promise<ReviewRecord | null> {
    const review = await this.get(id);
    if (!review) {
      return null;
    }

    const updated: ReviewRecord = {
      ...review,
      ...updates,
    };

    const reviewPath = this.getReviewPath(id);
    await fs.writeFile(reviewPath, JSON.stringify(updated, null, 2), 'utf-8');

    return updated;
  }

  /**
   * Delete review record
   */
  async delete(id: string): Promise<boolean> {
    try {
      const reviewPath = this.getReviewPath(id);
      if (!(await fs.pathExists(reviewPath))) {
        return false;
      }

      await fs.remove(reviewPath);
      return true;
    } catch (error) {
      console.error(`Error deleting review ${id}:`, error);
      return false;
    }
  }

  /**
   * List all review records (with filtering, sorting, pagination)
   */
  async list(query: ReviewQuery = {}): Promise<{
    reviews: ReviewRecord[];
    total: number;
  }> {
    try {
      if (!(await fs.pathExists(this.reviewsDir))) {
        return { reviews: [], total: 0 };
      }

      const files = await fs.readdir(this.reviewsDir);
      const reviews: ReviewRecord[] = [];

      // Read all review records
      for (const file of files) {
        if (file.endsWith('.json')) {
          const reviewPath = path.join(this.reviewsDir, file);
          const content = await fs.readFile(reviewPath, 'utf-8');
          const review = JSON.parse(content) as ReviewRecord;
          reviews.push(review);
        }
      }

      // Apply filter
      let filtered = this.applyFilter(reviews, query.filter);

      // Apply sort
      if (query.sort) {
        filtered = this.applySort(filtered, query.sort);
      } else {
        // Default sort by timestamp descending
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      const total = filtered.length;

      // Apply pagination
      if (query.limit !== undefined) {
        const offset = query.offset || 0;
        filtered = filtered.slice(offset, offset + query.limit);
      }

      return { reviews: filtered, total };
    } catch (error) {
      console.error('Error listing reviews:', error);
      return { reviews: [], total: 0 };
    }
  }

  /**
   * Apply filter conditions
   */
  private applyFilter(reviews: ReviewRecord[], filter?: ReviewFilter): ReviewRecord[] {
    if (!filter) {
      return reviews;
    }

    return reviews.filter((review) => {
      // File path filter
      if (filter.filePath && !review.filePath.includes(filter.filePath)) {
        return false;
      }

      // Date range filter
      if (filter.dateFrom) {
        const reviewDate = new Date(review.timestamp);
        const fromDate = new Date(filter.dateFrom);
        if (reviewDate < fromDate) {
          return false;
        }
      }

      if (filter.dateTo) {
        const reviewDate = new Date(review.timestamp);
        const toDate = new Date(filter.dateTo);
        if (reviewDate > toDate) {
          return false;
        }
      }

      // Severity filter
      if (filter.severity && filter.severity.length > 0) {
        const hasMatchingSeverity = review.analysis.issues.some((issue) =>
          filter.severity!.includes(issue.severity)
        );
        if (!hasMatchingSeverity) {
          return false;
        }
      }

      // Bookmark filter
      if (filter.bookmarked !== undefined && review.bookmarked !== filter.bookmarked) {
        return false;
      }

      // Resolved status filter
      if (filter.resolved !== undefined && review.resolved !== filter.resolved) {
        return false;
      }

      // Full text search
      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        const searchableText = [
          review.filePath,
          review.fileName,
          review.notes || '',
          review.analysis.summary,
          ...review.analysis.issues.map((i) => `${i.message} ${i.suggestion}`),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply sorting
   */
  private applySort(reviews: ReviewRecord[], sort: ReviewSort): ReviewRecord[] {
    const sorted = [...reviews];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'timestamp':
          comparison =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;

        case 'filePath':
          comparison = a.filePath.localeCompare(b.filePath);
          break;

        case 'severity': {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
          const getMaxSeverity = (review: ReviewRecord) => {
            if (review.analysis.issues.length === 0) return 4;
            return Math.min(
              ...review.analysis.issues.map((i) => severityOrder[i.severity])
            );
          };
          comparison = getMaxSeverity(a) - getMaxSeverity(b);
          break;
        }
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<ReviewStats> {
    const { reviews } = await this.list();

    const stats: ReviewStats = {
      total: reviews.length,
      bookmarked: reviews.filter((r) => r.bookmarked).length,
      resolved: reviews.filter((r) => r.resolved).length,
      unresolved: reviews.filter((r) => !r.resolved).length,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      byCategory: {
        quality: 0,
        security: 0,
        performance: 0,
        'best-practice': 0,
        bug: 0,
      },
    };

    // Count issues
    for (const review of reviews) {
      for (const issue of review.analysis.issues) {
        stats.bySeverity[issue.severity]++;
        stats.byCategory[issue.category]++;
      }
    }

    return stats;
  }

  /**
   * Export reviews to Markdown format
   */
  async exportToMarkdown(options: ExportOptions): Promise<string> {
    const { reviews } = await this.list({
      filter: options.filter,
    });

    const filtered = options.includeResolved
      ? reviews
      : reviews.filter((r) => !r.resolved);

    let markdown = '# Code Review Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    markdown += `Total Reviews: ${filtered.length}\n\n`;
    markdown += '---\n\n';

    for (const review of filtered) {
      markdown += `## ${review.fileName}\n\n`;
      markdown += `**File Path:** ${review.filePath}\n\n`;
      markdown += `**Date:** ${new Date(review.timestamp).toLocaleString()}\n\n`;

      if (review.bookmarked) {
        markdown += '**⭐ Bookmarked**\n\n';
      }

      if (review.resolved) {
        markdown += '**✅ Resolved**\n\n';
      }

      if (review.codeSnippet) {
        markdown += `**Code Range:** Lines ${review.codeSnippet.startLine}-${review.codeSnippet.endLine}\n\n`;
      }

      markdown += `### Summary\n\n${review.analysis.summary}\n\n`;

      if (review.analysis.issues.length > 0) {
        markdown += '### Issues\n\n';

        for (const issue of review.analysis.issues) {
          const icon = this.getSeverityIcon(issue.severity);
          markdown += `#### ${icon} ${issue.severity.toUpperCase()} - ${issue.category}\n\n`;
          markdown += `**Line:** ${issue.line}\n\n`;
          markdown += `**Message:** ${issue.message}\n\n`;
          markdown += `**Suggestion:** ${issue.suggestion}\n\n`;

          if (issue.codeExample) {
            markdown += '**Before:**\n```\n' + issue.codeExample.before + '\n```\n\n';
            markdown += '**After:**\n```\n' + issue.codeExample.after + '\n```\n\n';
          }
        }
      }

      if (review.notes) {
        markdown += `### Notes\n\n${review.notes}\n\n`;
      }

      markdown += '---\n\n';
    }

    return markdown;
  }

  /**
   * Export reviews to HTML format
   */
  async exportToHTML(options: ExportOptions): Promise<string> {
    const { reviews } = await this.list({
      filter: options.filter,
    });

    const filtered = options.includeResolved
      ? reviews
      : reviews.filter((r) => !r.resolved);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Review Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    .meta { color: #95a5a6; font-size: 0.9em; }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
      margin-right: 8px;
    }
    .badge.bookmarked { background: #f39c12; color: white; }
    .badge.resolved { background: #27ae60; color: white; }
    .issue {
      border-left: 4px solid #bdc3c7;
      padding: 15px;
      margin: 15px 0;
      background: #ecf0f1;
      border-radius: 4px;
    }
    .issue.critical { border-left-color: #e74c3c; background: #fadbd8; }
    .issue.high { border-left-color: #e67e22; background: #fdebd0; }
    .issue.medium { border-left-color: #f39c12; background: #fef5e7; }
    .issue.low { border-left-color: #3498db; background: #d6eaf8; }
    .issue.info { border-left-color: #95a5a6; background: #ecf0f1; }
    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    code { font-family: 'Monaco', 'Courier New', monospace; }
    .divider { border-top: 1px solid #bdc3c7; margin: 30px 0; }
  </style>
</head>
<body>
  <h1>Code Review Report</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()}</p>
  <p class="meta">Total Reviews: ${filtered.length}</p>
  <div class="divider"></div>
`;

    for (const review of filtered) {
      html += `  <h2>${this.escapeHtml(review.fileName)}</h2>\n`;
      html += `  <p><strong>File Path:</strong> ${this.escapeHtml(review.filePath)}</p>\n`;
      html += `  <p class="meta"><strong>Date:</strong> ${new Date(review.timestamp).toLocaleString()}</p>\n`;

      if (review.bookmarked) {
        html += `  <span class="badge bookmarked">⭐ Bookmarked</span>\n`;
      }

      if (review.resolved) {
        html += `  <span class="badge resolved">✅ Resolved</span>\n`;
      }

      if (review.codeSnippet) {
        html += `  <p><strong>Code Range:</strong> Lines ${review.codeSnippet.startLine}-${review.codeSnippet.endLine}</p>\n`;
      }

      html += `  <h3>Summary</h3>\n`;
      html += `  <p>${this.escapeHtml(review.analysis.summary)}</p>\n`;

      if (review.analysis.issues.length > 0) {
        html += `  <h3>Issues</h3>\n`;

        for (const issue of review.analysis.issues) {
          html += `  <div class="issue ${issue.severity}">\n`;
          html += `    <h4>${issue.severity.toUpperCase()} - ${issue.category}</h4>\n`;
          html += `    <p><strong>Line:</strong> ${issue.line}</p>\n`;
          html += `    <p><strong>Message:</strong> ${this.escapeHtml(issue.message)}</p>\n`;
          html += `    <p><strong>Suggestion:</strong> ${this.escapeHtml(issue.suggestion)}</p>\n`;

          if (issue.codeExample) {
            html += `    <p><strong>Before:</strong></p>\n`;
            html += `    <pre><code>${this.escapeHtml(issue.codeExample.before)}</code></pre>\n`;
            html += `    <p><strong>After:</strong></p>\n`;
            html += `    <pre><code>${this.escapeHtml(issue.codeExample.after)}</code></pre>\n`;
          }

          html += `  </div>\n`;
        }
      }

      if (review.notes) {
        html += `  <h3>Notes</h3>\n`;
        html += `  <p>${this.escapeHtml(review.notes)}</p>\n`;
      }

      html += `  <div class="divider"></div>\n`;
    }

    html += `</body>\n</html>`;

    return html;
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: '⚪',
    };
    return icons[severity] || '⚪';
  }

  /**
   * HTML escape
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Export reviews to CSV format
   */
  async exportToCSV(options: ExportOptions): Promise<string> {
    const { reviews } = await this.list({
      filter: options.filter,
    });

    const filtered = options.includeResolved
      ? reviews
      : reviews.filter((r) => !r.resolved);

    // CSV header
    const headers = [
      'Review ID',
      'File Path',
      'File Name',
      'Timestamp',
      'First Reviewed At',
      'Review Count',
      'Bookmarked',
      'Resolved',
      'Summary',
      'Issue Count',
      'Critical Issues',
      'High Issues',
      'Medium Issues',
      'Low Issues',
      'Info Issues',
      'Security Issues',
      'Quality Issues',
      'Performance Issues',
      'Best Practice Issues',
      'Bug Issues',
      'Code Range',
      'Notes',
      'Tags',
    ];

    const rows: string[][] = [];

    for (const review of filtered) {
      // Count issues by severity
      const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      };

      // Count issues by category
      const categoryCounts = {
        security: 0,
        quality: 0,
        performance: 0,
        'best-practice': 0,
        bug: 0,
      };

      for (const issue of review.analysis.issues) {
        severityCounts[issue.severity]++;
        categoryCounts[issue.category]++;
      }

      const row = [
        review.id,
        review.filePath,
        review.fileName,
        new Date(review.timestamp).toISOString(),
        review.firstReviewedAt ? new Date(review.firstReviewedAt).toISOString() : '',
        review.reviewCount.toString(),
        review.bookmarked ? 'Yes' : 'No',
        review.resolved ? 'Yes' : 'No',
        review.analysis.summary,
        review.analysis.issues.length.toString(),
        severityCounts.critical.toString(),
        severityCounts.high.toString(),
        severityCounts.medium.toString(),
        severityCounts.low.toString(),
        severityCounts.info.toString(),
        categoryCounts.security.toString(),
        categoryCounts.quality.toString(),
        categoryCounts.performance.toString(),
        categoryCounts['best-practice'].toString(),
        categoryCounts.bug.toString(),
        review.codeSnippet
          ? `Lines ${review.codeSnippet.startLine}-${review.codeSnippet.endLine}`
          : '',
        review.notes || '',
        review.tags?.join('; ') || '',
      ];

      rows.push(row);
    }

    // Convert to CSV format
    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => this.escapeCSV(cell)).join(',')
    );

    return csvLines.join('\n');
  }

  /**
   * CSV escape - properly escape CSV fields
   */
  private escapeCSV(text: string): string {
    // If the field contains comma, newline, or double quote, wrap it in quotes
    // and escape any internal quotes by doubling them
    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  /**
   * Export reviews to JSON format
   */
  async exportToJSON(options: ExportOptions): Promise<string> {
    const { reviews } = await this.list({
      filter: options.filter,
    });

    const filtered = options.includeResolved
      ? reviews
      : reviews.filter((r) => !r.resolved);

    return JSON.stringify(filtered, null, 2);
  }
}
