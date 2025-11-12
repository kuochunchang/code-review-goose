import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService.js';
import type { AnalysisOptions } from '../types/ai.js';

export const analysisRouter = Router();

/**
 * POST /api/analysis/analyze
 * Analyze code
 * Note: Insights management is now handled by the frontend.
 * This endpoint only performs the analysis.
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

    // Execute analysis (insights management is handled by frontend)
    const result = await aiService.analyzeCode(code, options || {});

    res.json({
      success: true,
      data: result,
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
 * POST /api/analysis/explain
 * Generate code explanation
 * Note: Insights management is handled by the frontend.
 * This endpoint only performs the explanation generation.
 */
analysisRouter.post('/explain', async (req: Request, res: Response): Promise<void> => {
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

    // Execute explanation (insights management is handled by frontend)
    const result = await aiService.explainCode(code, options || {});

    // Add file dependency analysis if filePath is provided
    if (options?.filePath) {
      try {
        const { FileDependencyService } = await import('../services/fileDependencyService.js');
        const path = await import('path');
        const fileDependencyService = new FileDependencyService();

        // Convert relative path to absolute path
        const absoluteFilePath = path.resolve(projectPath, options.filePath);

        const fileDependencies = await fileDependencyService.analyzeFileDependencies(code, {
          projectRoot: projectPath,
          currentFilePath: absoluteFilePath,
        });

        // Add file dependencies to result
        result.fileDependencies = fileDependencies;
        console.log('File dependencies analyzed:', {
          filePath: options.filePath,
          absolutePath: absoluteFilePath,
          importsCount: fileDependencies.imports.length,
          dependentsCount: fileDependencies.dependents.length,
        });
      } catch (depError) {
        console.error('File dependency analysis error:', depError);
        // Don't fail the entire request if dependency analysis fails
        // Just log the error and continue without file dependencies
      }
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Explanation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Explanation failed',
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

