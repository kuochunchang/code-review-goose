import { Router, Request, Response } from 'express';
import { InsightService } from '../services/insightService.js';
import type { AnalysisResult, ExplainResult } from '../types/ai.js';

export const insightsRouter = Router();

/**
 * GET /api/insights/check
 * Check if insight exists and whether hash matches
 * Query params: filePath, hash
 */
insightsRouter.get('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { filePath, hash } = req.query as { filePath?: string; hash?: string };

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'File path is required',
      });
      return;
    }

    if (!hash || typeof hash !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Hash is required',
      });
      return;
    }

    const insightService = new InsightService(projectPath);
    const result = await insightService.check(filePath, hash);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Insight check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check insight',
    });
  }
});

/**
 * GET /api/insights
 * Get insight record for a file
 * Query params: filePath
 */
insightsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { filePath } = req.query as { filePath?: string };

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'File path is required',
      });
      return;
    }

    const insightService = new InsightService(projectPath);
    const insight = await insightService.get(filePath);

    if (!insight) {
      res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
      return;
    }

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error('Get insight error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get insight',
    });
  }
});

/**
 * POST /api/insights
 * Save or update insight record
 */
insightsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { filePath, codeHash, analysis } = req.body as {
      filePath?: string;
      codeHash?: string;
      analysis?: AnalysisResult;
    };

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'File path is required',
      });
      return;
    }

    if (!codeHash || typeof codeHash !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Code hash is required',
      });
      return;
    }

    if (!analysis) {
      res.status(400).json({
        success: false,
        error: 'Analysis is required',
      });
      return;
    }

    const insightService = new InsightService(projectPath);
    const insight = await insightService.set(filePath, codeHash, analysis);

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error('Save insight error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save insight',
    });
  }
});

/**
 * PUT /api/insights/explain
 * Save or update code explanation
 */
insightsRouter.put('/explain', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { filePath, codeHash, explain } = req.body as {
      filePath?: string;
      codeHash?: string;
      explain?: ExplainResult;
    };

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'File path is required',
      });
      return;
    }

    if (!codeHash || typeof codeHash !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Code hash is required',
      });
      return;
    }

    if (!explain) {
      res.status(400).json({
        success: false,
        error: 'Explanation is required',
      });
      return;
    }

    const insightService = new InsightService(projectPath);
    const insight = await insightService.setExplain(filePath, codeHash, explain);

    res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error('Save explain error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save explanation',
    });
  }
});

/**
 * DELETE /api/insights
 * Delete insight record
 * Query params: filePath
 */
insightsRouter.delete('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { filePath } = req.query as { filePath?: string };

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'File path is required',
      });
      return;
    }

    const insightService = new InsightService(projectPath);
    const deleted = await insightService.delete(filePath);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: 'Insight deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete insight',
    });
  }
});

/**
 * DELETE /api/insights/clear
 * Clear all insights
 */
insightsRouter.delete('/clear', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const insightService = new InsightService(projectPath);

    await insightService.clear();

    res.json({
      success: true,
      data: {
        message: 'All insights cleared successfully',
      },
    });
  } catch (error) {
    console.error('Clear insights error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear insights',
    });
  }
});

/**
 * GET /api/insights/stats
 * Get insights statistics
 */
insightsRouter.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const insightService = new InsightService(projectPath);

    const stats = await insightService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Insights stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get insights stats',
    });
  }
});
