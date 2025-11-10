import { Router, Request, Response } from 'express';
import { ReviewService } from '../services/reviewService.js';
import type {
  ReviewQuery,
  ReviewFilter,
  ReviewSort,
  ExportOptions,
  CodeSnippet,
} from '../types/review.js';
import type { AnalysisResult } from '../types/ai.js';

export const reviewRouter = Router();

/**
 * POST /api/reviews
 * Create new review record
 */
reviewRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { filePath, analysis, codeSnippet, notes } = req.body as {
      filePath: string;
      analysis: AnalysisResult;
      codeSnippet?: CodeSnippet;
      notes?: string;
    };

    // Validate required fields
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'filePath is required and must be a string',
      });
      return;
    }

    if (!analysis || !analysis.issues || !Array.isArray(analysis.issues)) {
      res.status(400).json({
        success: false,
        error: 'analysis is required and must contain issues array',
      });
      return;
    }

    const reviewService = new ReviewService(projectPath);
    const review = await reviewService.create({
      filePath,
      analysis,
      codeSnippet,
      notes,
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create review',
    });
  }
});

/**
 * GET /api/reviews
 * List review records (with filtering, sorting, pagination)
 */
reviewRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const reviewService = new ReviewService(projectPath);

    // Parse query parameters
    const query: ReviewQuery = {};

    // Filter conditions
    if (
      req.query.filePath ||
      req.query.dateFrom ||
      req.query.dateTo ||
      req.query.severity ||
      req.query.bookmarked ||
      req.query.resolved ||
      req.query.searchText
    ) {
      query.filter = {} as ReviewFilter;

      if (req.query.filePath) {
        query.filter.filePath = req.query.filePath as string;
      }

      if (req.query.dateFrom) {
        query.filter.dateFrom = req.query.dateFrom as string;
      }

      if (req.query.dateTo) {
        query.filter.dateTo = req.query.dateTo as string;
      }

      if (req.query.severity) {
        const severities = req.query.severity as string;
        query.filter.severity = severities.split(',');
      }

      if (req.query.bookmarked !== undefined) {
        query.filter.bookmarked = req.query.bookmarked === 'true';
      }

      if (req.query.resolved !== undefined) {
        query.filter.resolved = req.query.resolved === 'true';
      }

      if (req.query.searchText) {
        query.filter.searchText = req.query.searchText as string;
      }
    }

    // Sorting
    if (req.query.sortField) {
      query.sort = {
        field: req.query.sortField as ReviewSort['field'],
        order: (req.query.sortOrder as ReviewSort['order']) || 'desc',
      };
    }

    // Pagination
    if (req.query.limit) {
      query.limit = parseInt(req.query.limit as string, 10);
    }

    if (req.query.offset) {
      query.offset = parseInt(req.query.offset as string, 10);
    }

    const result = await reviewService.list(query);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('List reviews error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list reviews',
    });
  }
});

/**
 * GET /api/reviews/stats
 * Get review statistics
 */
reviewRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const reviewService = new ReviewService(projectPath);

    const stats = await reviewService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review stats',
    });
  }
});

/**
 * GET /api/reviews/export
 * Export review report
 */
reviewRouter.get('/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const reviewService = new ReviewService(projectPath);

    const options: ExportOptions = {
      format: (req.query.format as ExportOptions['format']) || 'markdown',
      includeResolved: req.query.includeResolved === 'true',
    };

    // Filter conditions (same as list)
    if (req.query.filePath || req.query.dateFrom || req.query.dateTo || req.query.severity) {
      options.filter = {} as ReviewFilter;

      if (req.query.filePath) {
        options.filter.filePath = req.query.filePath as string;
      }

      if (req.query.dateFrom) {
        options.filter.dateFrom = req.query.dateFrom as string;
      }

      if (req.query.dateTo) {
        options.filter.dateTo = req.query.dateTo as string;
      }

      if (req.query.severity) {
        const severities = req.query.severity as string;
        options.filter.severity = severities.split(',');
      }
    }

    let content: string;
    let contentType: string;
    let filename: string;

    switch (options.format) {
      case 'markdown':
        content = await reviewService.exportToMarkdown(options);
        contentType = 'text/markdown';
        filename = `code-review-${Date.now()}.md`;
        break;

      case 'html':
        content = await reviewService.exportToHTML(options);
        contentType = 'text/html';
        filename = `code-review-${Date.now()}.html`;
        break;

      case 'json': {
        const { reviews } = await reviewService.list({ filter: options.filter });
        const filtered = options.includeResolved ? reviews : reviews.filter((r) => !r.resolved);
        content = JSON.stringify(filtered, null, 2);
        contentType = 'application/json';
        filename = `code-review-${Date.now()}.json`;
        break;
      }

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid export format. Use: markdown, html, or json',
        });
        return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error('Export reviews error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export reviews',
    });
  }
});

/**
 * GET /api/reviews/:id
 * Get single review record
 */
reviewRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { id } = req.params;

    const reviewService = new ReviewService(projectPath);
    const review = await reviewService.get(id);

    if (!review) {
      res.status(404).json({
        success: false,
        error: 'Review not found',
      });
      return;
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review',
    });
  }
});

/**
 * PATCH /api/reviews/:id
 * Update review record (bookmark, notes, etc.)
 */
reviewRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { id } = req.params;
    const { notes, bookmarked, resolved, tags } = req.body;

    const reviewService = new ReviewService(projectPath);
    const updated = await reviewService.update(id, {
      notes,
      bookmarked,
      resolved,
      tags,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Review not found',
      });
      return;
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update review',
    });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete review record
 */
reviewRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { id } = req.params;

    const reviewService = new ReviewService(projectPath);
    const deleted = await reviewService.delete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Review not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Review deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete review',
    });
  }
});
