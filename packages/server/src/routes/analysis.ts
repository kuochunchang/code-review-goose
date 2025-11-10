import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService.js';
import { CacheService } from '../services/cacheService.js';
import type { AnalysisOptions } from '../types/ai.js';

export const analysisRouter = Router();

/**
 * POST /api/analysis/analyze
 * Analyze code
 */
analysisRouter.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { code, options } = req.body as {
      code: string;
      options?: AnalysisOptions;
    };

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Code is required and must be a string',
      });
      return;
    }

    const aiService = new AIService(projectPath);
    const cacheService = new CacheService(projectPath);

    // Check if configured
    const isConfigured = await aiService.isConfigured();
    if (!isConfigured) {
      res.status(400).json({
        success: false,
        error: 'AI provider not configured. Please configure API key first.',
      });
      return;
    }

    // Check if file type can be analyzed
    if (options?.filePath) {
      const isAnalyzable = await aiService.isFileAnalyzable(options.filePath);
      if (!isAnalyzable) {
        res.status(400).json({
          success: false,
          error:
            'This file type cannot be analyzed. Please check your analyzable file extensions configuration.',
        });
        return;
      }
    }

    // Try to get from cache
    const cached = await cacheService.get(code, options || {});
    if (cached) {
      res.json({
        success: true,
        data: {
          ...cached,
          fromCache: true,
        },
      });
      return;
    }

    // Execute analysis
    const result = await aiService.analyzeCode(code, options || {});

    // Save to cache
    await cacheService.set(code, options || {}, result);

    res.json({
      success: true,
      data: {
        ...result,
        fromCache: false,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
});

/**
 * GET /api/analysis/status
 * Check AI configuration status
 */
analysisRouter.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const aiService = new AIService(projectPath);

    const isConfigured = await aiService.isConfigured();
    const config = await aiService.getConfig();

    res.json({
      success: true,
      data: {
        configured: isConfigured,
        provider: config.aiProvider || 'openai',
        model: config.openai?.model || config.claude?.model || 'unknown',
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check status',
    });
  }
});

/**
 * DELETE /api/analysis/cache
 * Clear analysis cache
 */
analysisRouter.delete('/cache', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const cacheService = new CacheService(projectPath);

    await cacheService.clear();

    res.json({
      success: true,
      data: {
        message: 'Cache cleared successfully',
      },
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache',
    });
  }
});

/**
 * GET /api/analysis/cache/stats
 * Get cache statistics
 */
analysisRouter.get('/cache/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const cacheService = new CacheService(projectPath);

    const stats = await cacheService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cache stats',
    });
  }
});

/**
 * GET /api/analysis/is-analyzable
 * Check if file can be analyzed
 */
analysisRouter.get('/is-analyzable', async (req: Request, res: Response): Promise<void> => {
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

    const aiService = new AIService(projectPath);
    const isAnalyzable = await aiService.isFileAnalyzable(filePath);

    res.json({
      success: true,
      data: {
        isAnalyzable,
        filePath,
      },
    });
  } catch (error) {
    console.error('File analyzability check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check file analyzability',
    });
  }
});

/**
 * POST /api/analysis/cached
 * Query cached analysis results only (do not trigger new analysis)
 */
analysisRouter.post('/cached', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const { code, options } = req.body as {
      code: string;
      options?: AnalysisOptions;
    };

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Code is required and must be a string',
      });
      return;
    }

    const cacheService = new CacheService(projectPath);

    // Only get from cache, do not execute analysis
    const cached = await cacheService.get(code, options || {});

    if (cached) {
      res.json({
        success: true,
        data: {
          ...cached,
          fromCache: true,
        },
      });
    } else {
      res.json({
        success: true,
        data: null,
      });
    }
  } catch (error) {
    console.error('Cache query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to query cache',
    });
  }
});
