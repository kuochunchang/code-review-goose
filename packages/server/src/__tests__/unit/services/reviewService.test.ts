import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewService } from '../../../services/reviewService.js';
import type { AnalysisResult } from '../../../types/ai.js';
import type { ReviewRecord } from '../../../types/review.js';
import fs from 'fs-extra';

// Mock fs-extra
vi.mock('fs-extra');

describe('ReviewService', () => {
  let reviewService: ReviewService;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    reviewService = new ReviewService(mockProjectPath);
  });

  describe('createOrUpdate', () => {
    it('should create new review record', async () => {
      const mockAnalysis: AnalysisResult = {
        issues: [
          {
            severity: 'medium',
            category: 'quality',
            line: 10,
            message: 'Test issue',
            suggestion: 'Fix it',
          },
        ],
        summary: 'Found 1 issue',
        timestamp: new Date().toISOString(),
      };

      // Mock directory doesn't exist yet
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const record = await reviewService.createOrUpdate({
        filePath: 'src/test.ts',
        analysis: mockAnalysis,
      });

      expect(record).toBeDefined();
      expect(record.filePath).toBe('src/test.ts');
      expect(record.analysis).toEqual(mockAnalysis);
      expect(record.reviewCount).toBe(1);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should update existing review record', async () => {
      const existingReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'Old analysis',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      const newAnalysis: AnalysisResult = {
        issues: [],
        summary: 'New analysis',
        timestamp: new Date().toISOString(),
      };

      // Mock finding existing review
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingReview) as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const record = await reviewService.createOrUpdate({
        filePath: 'src/test.ts',
        analysis: newAnalysis,
      });

      expect(record.id).toBe('test-id');
      expect(record.reviewCount).toBe(2);
      expect(record.analysis.summary).toBe('New analysis');
    });
  });

  describe('findByFilePath', () => {
    it('should find review by file path', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'Test',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const result = await reviewService.findByFilePath('src/test.ts');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
      expect(result?.filePath).toBe('src/test.ts');
    });

    it('should return null when review not found', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await reviewService.findByFilePath('src/nonexistent.ts');

      expect(result).toBeNull();
    });

    it('should return null when reviews directory does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await reviewService.findByFilePath('src/test.ts');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read error'));

      const result = await reviewService.findByFilePath('src/test.ts');

      expect(result).toBeNull();
    });
  });

  describe('get', () => {
    it('should get review by ID', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'Test',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const result = await reviewService.get('test-id');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-id');
    });

    it('should return null when review does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await reviewService.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle read errors', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));

      const result = await reviewService.get('test-id');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all reviews', async () => {
      const mockReview1: ReviewRecord = {
        id: 'test-1',
        filePath: 'src/test1.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'Test 1',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      const mockReview2: ReviewRecord = {
        id: 'test-2',
        filePath: 'src/test2.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'Test 2',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-1.json', 'test-2.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockReview1) as any)
        .mockResolvedValueOnce(JSON.stringify(mockReview2) as any);

      const result = await reviewService.list();

      expect(result.reviews).toBeDefined();
      expect(result.reviews.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should return empty result when no reviews exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await reviewService.list();

      expect(result.reviews.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Read error'));

      const result = await reviewService.list();

      expect(result.reviews.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete review by ID', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await reviewService.delete('test-id');

      expect(result).toBe(true);
      expect(fs.remove).toHaveBeenCalled();
    });

    it('should return false when review does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await reviewService.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle delete errors', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockRejectedValue(new Error('Delete error'));

      const result = await reviewService.delete('test-id');

      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update review metadata', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'Test',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const updated = await reviewService.update('test-id', {
        bookmarked: true,
        resolved: true,
      });

      expect(updated).toBeDefined();
      expect(updated.bookmarked).toBe(true);
      expect(updated.resolved).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return null when review does not exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const result = await reviewService.update('nonexistent', { bookmarked: true });

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return review statistics', async () => {
      const mockReview1: ReviewRecord = {
        id: 'test-1',
        filePath: 'src/test1.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 2,
        analysis: {
          issues: [
            {
              severity: 'high',
              category: 'security',
              line: 10,
              message: 'Security issue',
              suggestion: 'Fix it',
            },
          ],
          summary: 'Test 1',
          timestamp: new Date().toISOString(),
        },
        bookmarked: true,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-1.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview1) as any);

      const stats = await reviewService.getStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(stats.byCategory).toBeDefined();
    });

    it('should return empty stats when no reviews exist', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const stats = await reviewService.getStats();

      expect(stats.total).toBe(0);
    });

    it('should correctly count issues by severity and category', async () => {
      const mockReviews: ReviewRecord[] = [
        {
          id: 'test-1',
          filePath: 'src/test1.ts',
          timestamp: new Date().toISOString(),
          reviewCount: 1,
          analysis: {
            issues: [
              { severity: 'critical', category: 'security', line: 1, message: 'msg', suggestion: 'fix' },
              { severity: 'high', category: 'quality', line: 2, message: 'msg', suggestion: 'fix' },
            ],
            summary: 'Test 1',
            timestamp: new Date().toISOString(),
          },
          bookmarked: false,
          resolved: false,
        },
        {
          id: 'test-2',
          filePath: 'src/test2.ts',
          timestamp: new Date().toISOString(),
          reviewCount: 1,
          analysis: {
            issues: [
              { severity: 'medium', category: 'performance', line: 3, message: 'msg', suggestion: 'fix' },
            ],
            summary: 'Test 2',
            timestamp: new Date().toISOString(),
          },
          bookmarked: true,
          resolved: true,
        },
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-1.json', 'test-2.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockReviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(mockReviews[1]) as any);

      const stats = await reviewService.getStats();

      expect(stats.total).toBe(2);
      expect(stats.bookmarked).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.unresolved).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.medium).toBe(1);
      expect(stats.byCategory.security).toBe(1);
      expect(stats.byCategory.quality).toBe(1);
      expect(stats.byCategory.performance).toBe(1);
    });
  });

  describe('create (deprecated)', () => {
    it('should create new review using deprecated method', async () => {
      const mockAnalysis: AnalysisResult = {
        issues: [],
        summary: 'Test',
        timestamp: new Date().toISOString(),
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const record = await reviewService.create({
        filePath: 'src/test.ts',
        analysis: mockAnalysis,
      });

      expect(record).toBeDefined();
      expect(record.filePath).toBe('src/test.ts');
    });
  });

  describe('list with filters and sorting', () => {
    const createMockReview = (overrides: Partial<ReviewRecord>): ReviewRecord => ({
      id: 'test-id',
      filePath: 'src/test.ts',
      timestamp: new Date().toISOString(),
      reviewCount: 1,
      analysis: {
        issues: [],
        summary: 'Test',
        timestamp: new Date().toISOString(),
      },
      bookmarked: false,
      resolved: false,
      ...overrides,
    });

    it('should filter by file path', async () => {
      const reviews = [
        createMockReview({ id: '1', filePath: 'src/components/App.tsx' }),
        createMockReview({ id: '2', filePath: 'src/utils/helper.ts' }),
        createMockReview({ id: '3', filePath: 'src/components/Button.tsx' }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        filter: { filePath: 'components' },
      });

      expect(result.reviews.length).toBe(2);
      expect(result.reviews.every((r) => r.filePath.includes('components'))).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const reviews = [
        createMockReview({ id: '1', timestamp: yesterday.toISOString() }),
        createMockReview({ id: '2', timestamp: now.toISOString() }),
        createMockReview({ id: '3', timestamp: tomorrow.toISOString() }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        filter: {
          dateFrom: now.toISOString(),
          dateTo: tomorrow.toISOString(),
        },
      });

      expect(result.reviews.length).toBe(2);
    });

    it('should filter by severity', async () => {
      const reviews = [
        createMockReview({
          id: '1',
          analysis: {
            issues: [{ severity: 'critical', category: 'security', line: 1, message: 'msg', suggestion: 'fix' }],
            summary: 'Critical issue',
            timestamp: new Date().toISOString(),
          },
        }),
        createMockReview({
          id: '2',
          analysis: {
            issues: [{ severity: 'low', category: 'quality', line: 1, message: 'msg', suggestion: 'fix' }],
            summary: 'Low issue',
            timestamp: new Date().toISOString(),
          },
        }),
        createMockReview({
          id: '3',
          analysis: {
            issues: [{ severity: 'high', category: 'bug', line: 1, message: 'msg', suggestion: 'fix' }],
            summary: 'High issue',
            timestamp: new Date().toISOString(),
          },
        }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        filter: { severity: ['critical', 'high'] },
      });

      expect(result.reviews.length).toBe(2);
    });

    it('should filter by bookmarked status', async () => {
      const reviews = [
        createMockReview({ id: '1', bookmarked: true }),
        createMockReview({ id: '2', bookmarked: false }),
        createMockReview({ id: '3', bookmarked: true }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        filter: { bookmarked: true },
      });

      expect(result.reviews.length).toBe(2);
      expect(result.reviews.every((r) => r.bookmarked)).toBe(true);
    });

    it('should filter by resolved status', async () => {
      const reviews = [
        createMockReview({ id: '1', resolved: true }),
        createMockReview({ id: '2', resolved: false }),
        createMockReview({ id: '3', resolved: false }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        filter: { resolved: false },
      });

      expect(result.reviews.length).toBe(2);
      expect(result.reviews.every((r) => !r.resolved)).toBe(true);
    });

    it('should filter by search text', async () => {
      const reviews = [
        createMockReview({
          id: '1',
          filePath: 'src/auth.ts',
          analysis: {
            issues: [{ severity: 'high', category: 'security', line: 1, message: 'SQL injection', suggestion: 'Use prepared statements' }],
            summary: 'Security vulnerabilities found',
            timestamp: new Date().toISOString(),
          },
        }),
        createMockReview({
          id: '2',
          filePath: 'src/utils.ts',
          analysis: {
            issues: [],
            summary: 'No issues',
            timestamp: new Date().toISOString(),
          },
        }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any);

      const result = await reviewService.list({
        filter: { searchText: 'security' },
      });

      expect(result.reviews.length).toBe(1);
      expect(result.reviews[0].id).toBe('1');
    });

    it('should sort by timestamp ascending', async () => {
      const now = new Date();
      const reviews = [
        createMockReview({ id: '1', timestamp: new Date(now.getTime() + 3000).toISOString() }),
        createMockReview({ id: '2', timestamp: new Date(now.getTime() + 1000).toISOString() }),
        createMockReview({ id: '3', timestamp: new Date(now.getTime() + 2000).toISOString() }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        sort: { field: 'timestamp', order: 'asc' },
      });

      expect(result.reviews[0].id).toBe('2');
      expect(result.reviews[1].id).toBe('3');
      expect(result.reviews[2].id).toBe('1');
    });

    it('should sort by timestamp descending', async () => {
      const now = new Date();
      const reviews = [
        createMockReview({ id: '1', timestamp: new Date(now.getTime() + 1000).toISOString() }),
        createMockReview({ id: '2', timestamp: new Date(now.getTime() + 3000).toISOString() }),
        createMockReview({ id: '3', timestamp: new Date(now.getTime() + 2000).toISOString() }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        sort: { field: 'timestamp', order: 'desc' },
      });

      expect(result.reviews[0].id).toBe('2');
      expect(result.reviews[1].id).toBe('3');
      expect(result.reviews[2].id).toBe('1');
    });

    it('should sort by file path', async () => {
      const reviews = [
        createMockReview({ id: '1', filePath: 'src/zzz.ts' }),
        createMockReview({ id: '2', filePath: 'src/aaa.ts' }),
        createMockReview({ id: '3', filePath: 'src/mmm.ts' }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        sort: { field: 'filePath', order: 'asc' },
      });

      expect(result.reviews[0].id).toBe('2');
      expect(result.reviews[1].id).toBe('3');
      expect(result.reviews[2].id).toBe('1');
    });

    it('should sort by severity', async () => {
      const reviews = [
        createMockReview({
          id: '1',
          analysis: {
            issues: [{ severity: 'low', category: 'quality', line: 1, message: 'msg', suggestion: 'fix' }],
            summary: 'Low',
            timestamp: new Date().toISOString(),
          },
        }),
        createMockReview({
          id: '2',
          analysis: {
            issues: [{ severity: 'critical', category: 'security', line: 1, message: 'msg', suggestion: 'fix' }],
            summary: 'Critical',
            timestamp: new Date().toISOString(),
          },
        }),
        createMockReview({
          id: '3',
          analysis: {
            issues: [{ severity: 'medium', category: 'performance', line: 1, message: 'msg', suggestion: 'fix' }],
            summary: 'Medium',
            timestamp: new Date().toISOString(),
          },
        }),
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['1.json', '2.json', '3.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(reviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[1]) as any)
        .mockResolvedValueOnce(JSON.stringify(reviews[2]) as any);

      const result = await reviewService.list({
        sort: { field: 'severity', order: 'asc' },
      });

      expect(result.reviews[0].id).toBe('2'); // critical
      expect(result.reviews[1].id).toBe('3'); // medium
      expect(result.reviews[2].id).toBe('1'); // low
    });

    it('should apply pagination', async () => {
      const reviews = Array.from({ length: 10 }, (_, i) =>
        createMockReview({ id: `test-${i}`, filePath: `src/test${i}.ts` })
      );

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(reviews.map((_, i) => `test-${i}.json`) as any);
      reviews.forEach((review) => {
        vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(review) as any);
      });

      const result = await reviewService.list({
        limit: 3,
        offset: 2,
      });

      expect(result.reviews.length).toBe(3);
      expect(result.total).toBe(10);
    });
  });

  describe('exportToMarkdown', () => {
    it('should export reviews to Markdown format', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        fileName: 'test.ts',
        timestamp: new Date('2024-01-01').toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [
            {
              severity: 'high',
              category: 'security',
              line: 10,
              message: 'Security vulnerability',
              suggestion: 'Fix the issue',
              codeExample: {
                before: 'bad code',
                after: 'good code',
              },
            },
          ],
          summary: 'Found 1 issue',
          timestamp: new Date().toISOString(),
        },
        bookmarked: true,
        resolved: false,
        notes: 'Important note',
        codeSnippet: {
          code: 'const x = 1;',
          startLine: 5,
          endLine: 10,
        },
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const markdown = await reviewService.exportToMarkdown({
        includeResolved: true,
      });

      expect(markdown).toContain('# Code Review Report');
      expect(markdown).toContain('test.ts');
      expect(markdown).toContain('src/test.ts');
      expect(markdown).toContain('Security vulnerability');
      expect(markdown).toContain('Fix the issue');
      expect(markdown).toContain('**⭐ Bookmarked**');
      expect(markdown).toContain('Important note');
      expect(markdown).toContain('Lines 5-10');
      expect(markdown).toContain('bad code');
      expect(markdown).toContain('good code');
    });

    it('should exclude resolved reviews when includeResolved is false', async () => {
      const mockReviews: ReviewRecord[] = [
        {
          id: 'resolved',
          filePath: 'src/completedfile.ts',
          fileName: 'completedfile.ts',
          timestamp: new Date().toISOString(),
          reviewCount: 1,
          analysis: { issues: [], summary: 'This was resolved', timestamp: new Date().toISOString() },
          bookmarked: false,
          resolved: true,
        },
        {
          id: 'unresolved',
          filePath: 'src/pendingfile.ts',
          fileName: 'pendingfile.ts',
          timestamp: new Date().toISOString(),
          reviewCount: 1,
          analysis: { issues: [], summary: 'Still pending', timestamp: new Date().toISOString() },
          bookmarked: false,
          resolved: false,
        },
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['resolved.json', 'unresolved.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockReviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(mockReviews[1]) as any);

      const markdown = await reviewService.exportToMarkdown({
        includeResolved: false,
      });

      expect(markdown).toContain('pendingfile.ts');
      expect(markdown).not.toContain('completedfile.ts');
    });

    it('should handle reviews without optional fields', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        fileName: 'test.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [],
          summary: 'No issues',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const markdown = await reviewService.exportToMarkdown({
        includeResolved: true,
      });

      expect(markdown).toContain('# Code Review Report');
      expect(markdown).toContain('No issues');
      expect(markdown).not.toContain('**⭐ Bookmarked**');
      expect(markdown).not.toContain('**✅ Resolved**');
    });
  });

  describe('exportToHTML', () => {
    it('should export reviews to HTML format', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        fileName: 'test.ts',
        timestamp: new Date('2024-01-01').toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [
            {
              severity: 'critical',
              category: 'bug',
              line: 15,
              message: 'Critical bug',
              suggestion: 'Fix immediately',
              codeExample: {
                before: 'buggy code',
                after: 'fixed code',
              },
            },
          ],
          summary: 'Critical issue found',
          timestamp: new Date().toISOString(),
        },
        bookmarked: true,
        resolved: false,
        notes: 'High priority',
        codeSnippet: {
          code: 'const y = 2;',
          startLine: 10,
          endLine: 20,
        },
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const html = await reviewService.exportToHTML({
        includeResolved: true,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Code Review Report</title>');
      expect(html).toContain('test.ts');
      expect(html).toContain('src/test.ts');
      expect(html).toContain('Critical bug');
      expect(html).toContain('Fix immediately');
      expect(html).toContain('class="badge bookmarked"');
      expect(html).toContain('High priority');
      expect(html).toContain('Lines 10-20');
      expect(html).toContain('class="issue critical"');
      expect(html).toContain('buggy code');
      expect(html).toContain('fixed code');
    });

    it('should escape HTML characters', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/<script>alert("xss")</script>.ts',
        fileName: '<test>.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [
            {
              severity: 'high',
              category: 'security',
              line: 1,
              message: '<script>malicious</script>',
              suggestion: 'Use & instead of &amp;',
            },
          ],
          summary: 'XSS vulnerability: <img src=x onerror=alert(1)>',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
        notes: 'Quote: "test" and apostrophe: \'test\'',
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const html = await reviewService.exportToHTML({
        includeResolved: true,
      });

      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
      expect(html).toContain('&#039;');
      expect(html).not.toContain('<script>alert(');
    });

    it('should exclude resolved reviews when includeResolved is false', async () => {
      const mockReviews: ReviewRecord[] = [
        {
          id: 'completed',
          filePath: 'src/completedfile.ts',
          fileName: 'completedfile.ts',
          timestamp: new Date().toISOString(),
          reviewCount: 1,
          analysis: { issues: [], summary: 'This was resolved', timestamp: new Date().toISOString() },
          bookmarked: false,
          resolved: true,
        },
        {
          id: 'pending',
          filePath: 'src/pendingfile.ts',
          fileName: 'pendingfile.ts',
          timestamp: new Date().toISOString(),
          reviewCount: 1,
          analysis: { issues: [], summary: 'Still pending', timestamp: new Date().toISOString() },
          bookmarked: false,
          resolved: false,
        },
      ];

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['completed.json', 'pending.json'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(mockReviews[0]) as any)
        .mockResolvedValueOnce(JSON.stringify(mockReviews[1]) as any);

      const html = await reviewService.exportToHTML({
        includeResolved: false,
      });

      expect(html).toContain('pendingfile.ts');
      expect(html).not.toContain('completedfile.ts');
    });

    it('should handle all severity levels with correct CSS classes', async () => {
      const mockReview: ReviewRecord = {
        id: 'test-id',
        filePath: 'src/test.ts',
        fileName: 'test.ts',
        timestamp: new Date().toISOString(),
        reviewCount: 1,
        analysis: {
          issues: [
            { severity: 'critical', category: 'security', line: 1, message: 'Critical', suggestion: 'Fix' },
            { severity: 'high', category: 'bug', line: 2, message: 'High', suggestion: 'Fix' },
            { severity: 'medium', category: 'quality', line: 3, message: 'Medium', suggestion: 'Fix' },
            { severity: 'low', category: 'performance', line: 4, message: 'Low', suggestion: 'Fix' },
            { severity: 'info', category: 'best-practice', line: 5, message: 'Info', suggestion: 'Fix' },
          ],
          summary: 'Multiple issues',
          timestamp: new Date().toISOString(),
        },
        bookmarked: false,
        resolved: false,
      };

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['test-id.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockReview) as any);

      const html = await reviewService.exportToHTML({
        includeResolved: true,
      });

      expect(html).toContain('class="issue critical"');
      expect(html).toContain('class="issue high"');
      expect(html).toContain('class="issue medium"');
      expect(html).toContain('class="issue low"');
      expect(html).toContain('class="issue info"');
    });
  });
});
