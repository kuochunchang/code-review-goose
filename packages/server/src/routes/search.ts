import { Router, Request, Response } from 'express';
import { SearchService } from '../services/searchService.js';
import type { SearchOptions } from '../types/search.js';

export const searchRouter = Router();

/**
 * POST /api/search
 * Execute search
 */
searchRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const options = req.body as SearchOptions;

    // Validate required fields
    if (!options.query || typeof options.query !== 'string' || options.query.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Query is required and must be a non-empty string',
      });
      return;
    }

    const searchService = new SearchService(projectPath);
    const result = await searchService.search(options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

/**
 * POST /api/search/with-context
 * Execute search with context
 */
searchRouter.post('/with-context', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const options = req.body as SearchOptions;

    // Validate required fields
    if (!options.query || typeof options.query !== 'string' || options.query.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Query is required and must be a non-empty string',
      });
      return;
    }

    const searchService = new SearchService(projectPath);
    const result = await searchService.searchWithContext(options);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Search with context error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

/**
 * GET /api/search/history
 * Get search history
 */
searchRouter.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const searchService = new SearchService(projectPath);
    const history = await searchService.getHistory(limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get search history',
    });
  }
});

/**
 * DELETE /api/search/history
 * Clear search history
 */
searchRouter.delete('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;

    const searchService = new SearchService(projectPath);
    await searchService.clearHistory();

    res.json({
      success: true,
      data: {
        message: 'Search history cleared successfully',
      },
    });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear search history',
    });
  }
});

/**
 * GET /api/search/stats
 * Get search statistics
 */
searchRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;

    const searchService = new SearchService(projectPath);
    const stats = await searchService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get search stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get search stats',
    });
  }
});
