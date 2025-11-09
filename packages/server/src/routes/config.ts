import { Router, Request, Response } from 'express';
import { AIService } from '../services/aiService.js';
import type { ProjectConfig } from '../types/config.js';

export const configRouter = Router();

/**
 * GET /api/config
 * Get project configuration
 */
configRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const aiService = new AIService(projectPath);

    const config = await aiService.getConfig();

    // Return configuration directly, frontend will mask with password input
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configuration',
    });
  }
});

/**
 * PUT /api/config
 * Update project configuration
 */
configRouter.put('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const aiService = new AIService(projectPath);
    const updates = req.body as Partial<ProjectConfig>;

    // Validate input
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Invalid configuration data',
      });
      return;
    }

    const newConfig = await aiService.updateConfig(updates);

    // Return configuration directly
    res.json({
      success: true,
      data: newConfig,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration',
    });
  }
});

/**
 * POST /api/config/reset
 * Reset to default configuration
 */
configRouter.post('/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const aiService = new AIService(projectPath);

    // Reset to default configuration
    const defaultConfig: Partial<ProjectConfig> = {
      aiProvider: 'openai',
      openai: {
        apiKey: '',
        model: 'gpt-4',
      },
      ignorePatterns: [
        'node_modules',
        '.git',
        'dist',
        'build',
        '.next',
        'coverage',
      ],
      maxFileSize: 5 * 1024 * 1024,
    };

    const newConfig = await aiService.updateConfig(defaultConfig);

    res.json({
      success: true,
      data: {
        message: 'Configuration reset to defaults',
        config: newConfig,
      },
    });
  } catch (error) {
    console.error('Reset config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset configuration',
    });
  }
});
