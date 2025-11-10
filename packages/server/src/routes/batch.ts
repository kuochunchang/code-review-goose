import { Router, Request, Response } from 'express';
import { BatchAnalysisService } from '../services/batchAnalysisService.js';
import type { BatchAnalysisOptions } from '../types/batch.js';

export const batchRouter = Router();

/**
 * POST /api/batch/analyze
 * Analyze entire project in batch
 */
batchRouter.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const options = req.body as BatchAnalysisOptions;

    const batchService = new BatchAnalysisService(projectPath);

    // Start batch analysis
    const result = await batchService.analyzeProject({
      force: options.force,
      concurrency: options.concurrency || 1,
      extensions: options.extensions,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch analysis failed',
    });
  }
});
