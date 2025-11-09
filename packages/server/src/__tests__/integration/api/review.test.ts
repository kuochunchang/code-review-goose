import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { reviewRouter } from '../../../routes/review.js';
import { ReviewService } from '../../../services/reviewService.js';
import type { ReviewRecord } from '../../../types/review.js';
import type { AnalysisResult } from '../../../types/ai.js';

// Mock ReviewService
vi.mock('../../../services/reviewService.js');

describe('Review API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/reviews', reviewRouter);
    vi.clearAllMocks();
  });

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
    summary: 'Test summary',
    timestamp: new Date().toISOString(),
  };

  const mockReview: ReviewRecord = {
    id: 'test-id',
    filePath: 'src/test.ts',
    timestamp: new Date().toISOString(),
    reviewCount: 1,
    analysis: mockAnalysis,
    bookmarked: false,
    resolved: false,
  };

  describe('POST /api/reviews', () => {
    it('should create a new review', async () => {
      const mockCreate = vi.fn().mockResolvedValue(mockReview);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            create: mockCreate,
          }) as any
      );

      const response = await request(app).post('/api/reviews').send({
        filePath: 'src/test.ts',
        analysis: mockAnalysis,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReview);
    });

    it('should return 400 when filePath is missing', async () => {
      const response = await request(app).post('/api/reviews').send({
        analysis: mockAnalysis,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('filePath is required');
    });

    it('should return 400 when analysis is missing', async () => {
      const response = await request(app).post('/api/reviews').send({
        filePath: 'src/test.ts',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('analysis is required');
    });

    it('should handle errors when creating review', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Create failed'));
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            create: mockCreate,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).post('/api/reviews').send({
        filePath: 'src/test.ts',
        analysis: mockAnalysis,
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Create failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/reviews', () => {
    it('should list all reviews', async () => {
      const mockList = vi.fn().mockResolvedValue({
        reviews: [mockReview],
        total: 1,
      });

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            list: mockList,
          }) as any
      );

      const response = await request(app).get('/api/reviews');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
    });

    it('should support filtering by filePath', async () => {
      const mockList = vi.fn().mockResolvedValue({
        reviews: [mockReview],
        total: 1,
      });

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            list: mockList,
          }) as any
      );

      const response = await request(app).get('/api/reviews').query({ filePath: 'src/test.ts' });

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            filePath: 'src/test.ts',
          }),
        })
      );
    });

    it('should support pagination', async () => {
      const mockList = vi.fn().mockResolvedValue({
        reviews: [mockReview],
        total: 10,
      });

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            list: mockList,
          }) as any
      );

      const response = await request(app).get('/api/reviews').query({ limit: '5', offset: '0' });

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          offset: 0,
        })
      );
    });

    it('should handle errors when listing reviews', async () => {
      const mockList = vi.fn().mockRejectedValue(new Error('List failed'));
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            list: mockList,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/reviews');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('List failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/reviews/stats', () => {
    it('should return review statistics', async () => {
      const mockStats = {
        total: 10,
        byCategory: { quality: 5, security: 3, performance: 2 },
        bySeverity: { high: 2, medium: 5, low: 3 },
        resolved: 3,
        bookmarked: 2,
      };

      const mockGetStats = vi.fn().mockResolvedValue(mockStats);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            getStats: mockGetStats,
          }) as any
      );

      const response = await request(app).get('/api/reviews/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should handle errors when getting stats', async () => {
      const mockGetStats = vi.fn().mockRejectedValue(new Error('Stats failed'));
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            getStats: mockGetStats,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/reviews/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Stats failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/reviews/export', () => {
    it('should export reviews as markdown', async () => {
      const mockExport = vi.fn().mockResolvedValue('# Code Review Report\n\nTest content');

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            exportToMarkdown: mockExport,
          }) as any
      );

      const response = await request(app).get('/api/reviews/export').query({ format: 'markdown' });

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/markdown');
      expect(response.text).toContain('Code Review Report');
    });

    it('should export reviews as HTML', async () => {
      const mockExport = vi.fn().mockResolvedValue('<html><body>Test</body></html>');

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            exportToHTML: mockExport,
          }) as any
      );

      const response = await request(app).get('/api/reviews/export').query({ format: 'html' });

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/html');
    });

    it('should export reviews as JSON', async () => {
      const mockList = vi.fn().mockResolvedValue({
        reviews: [mockReview],
        total: 1,
      });

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            list: mockList,
          }) as any
      );

      const response = await request(app).get('/api/reviews/export').query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('application/json');
    });

    it('should return 400 for invalid format', async () => {
      const response = await request(app).get('/api/reviews/export').query({ format: 'pdf' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid export format');
    });

    it('should handle errors when exporting', async () => {
      const mockExport = vi.fn().mockRejectedValue(new Error('Export failed'));

      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            exportToMarkdown: mockExport,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/reviews/export').query({ format: 'markdown' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Export failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should get review by id', async () => {
      const mockGet = vi.fn().mockResolvedValue(mockReview);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            get: mockGet,
          }) as any
      );

      const response = await request(app).get('/api/reviews/test-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReview);
    });

    it('should return 404 when review not found', async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            get: mockGet,
          }) as any
      );

      const response = await request(app).get('/api/reviews/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Review not found');
    });

    it('should handle errors when getting review', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('Get failed'));
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            get: mockGet,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/reviews/test-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Get failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('PATCH /api/reviews/:id', () => {
    it('should update review', async () => {
      const updatedReview = { ...mockReview, bookmarked: true };
      const mockUpdate = vi.fn().mockResolvedValue(updatedReview);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            update: mockUpdate,
          }) as any
      );

      const response = await request(app).patch('/api/reviews/test-id').send({ bookmarked: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.bookmarked).toBe(true);
    });

    it('should return 404 when review not found', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(null);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            update: mockUpdate,
          }) as any
      );

      const response = await request(app).patch('/api/reviews/nonexistent').send({ notes: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Review not found');
    });

    it('should handle errors when updating review', async () => {
      const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            update: mockUpdate,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).patch('/api/reviews/test-id').send({ notes: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Update failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should delete review', async () => {
      const mockDelete = vi.fn().mockResolvedValue(true);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            delete: mockDelete,
          }) as any
      );

      const response = await request(app).delete('/api/reviews/test-id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Review deleted successfully');
    });

    it('should return 404 when review not found', async () => {
      const mockDelete = vi.fn().mockResolvedValue(false);
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            delete: mockDelete,
          }) as any
      );

      const response = await request(app).delete('/api/reviews/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Review not found');
    });

    it('should handle errors when deleting review', async () => {
      const mockDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));
      vi.mocked(ReviewService).mockImplementation(
        () =>
          ({
            delete: mockDelete,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).delete('/api/reviews/test-id');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Delete failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
