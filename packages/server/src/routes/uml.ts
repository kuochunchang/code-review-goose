import { Router, Request, Response } from 'express';
import { UMLService, DiagramType, UMLResult } from '../services/umlService.js';
import { AIService } from '../services/aiService.js';
import { ConfigService } from '../services/configService.js';
import { CacheService } from '../services/cacheService.js';

export const umlRouter = Router();

/**
 * POST /api/uml/generate
 * Generate UML diagram
 */
umlRouter.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, type, forceRefresh } = req.body as {
      code: string;
      type: DiagramType;
      forceRefresh?: boolean;
    };

    const projectPath = req.app.locals.projectPath;

    // Validate request parameters
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Code is required and must be a string',
      });
      return;
    }

    const validTypes: DiagramType[] = ['class', 'flowchart', 'sequence', 'dependency'];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: `Type is required and must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // Initialize cache service
    const cacheService = new CacheService(projectPath, 'uml');

    // Try to get from cache (unless forceRefresh is set)
    if (!forceRefresh) {
      const cacheOptions = { type };
      const cached = await cacheService.get<UMLResult>(code, cacheOptions);
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
    }

    // Load configuration
    const configService = new ConfigService(projectPath);
    const config = await configService.get();

    // Initialize AI Service (if needed)
    let aiService: AIService | undefined;
    try {
      aiService = new AIService(projectPath);
      const isConfigured = await aiService.isConfigured();
      if (!isConfigured) {
        aiService = undefined;
      }
    } catch (error) {
      console.log('AI service not available:', error);
      aiService = undefined;
    }

    // Generate UML diagram
    const umlService = new UMLService(aiService, config);
    const result = await umlService.generateDiagram(code, type);

    // Save to cache (cache will be updated regardless of forceRefresh)
    const cacheOptions = { type };
    await cacheService.set(code, cacheOptions, result);

    res.json({
      success: true,
      data: {
        ...result,
        fromCache: false,
        forceRefreshed: !!forceRefresh,
      },
    });
  } catch (error) {
    console.error('UML generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'UML generation failed',
    });
  }
});

/**
 * DELETE /api/uml/cache
 * Clear UML cache
 */
umlRouter.delete('/cache', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const cacheService = new CacheService(projectPath, 'uml');

    await cacheService.clear();

    res.json({
      success: true,
      data: {
        message: 'UML cache cleared successfully',
      },
    });
  } catch (error) {
    console.error('UML cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear UML cache',
    });
  }
});

/**
 * GET /api/uml/cache/stats
 * Get UML cache statistics
 */
umlRouter.get('/cache/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const cacheService = new CacheService(projectPath, 'uml');

    const stats = await cacheService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('UML cache stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get UML cache stats',
    });
  }
});

/**
 * GET /api/uml/supported-types
 * Get supported UML diagram types
 */
umlRouter.get('/supported-types', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;

    // Load configuration
    const configService = new ConfigService(projectPath);
    const config = await configService.get();

    // Check if AI is available
    let aiAvailable = false;
    try {
      const aiService = new AIService(projectPath);
      aiAvailable = await aiService.isConfigured();
    } catch (error) {
      aiAvailable = false;
    }

    const generationMode = config.uml?.generationMode || 'hybrid';
    const aiEnabledTypes = config.uml?.aiOptions?.enabledTypes || ['sequence', 'dependency'];

    res.json({
      success: true,
      data: {
        generationMode,
        aiAvailable,
        types: [
          {
            id: 'class',
            name: 'Class Diagram',
            description: 'Visualize classes, interfaces, and their relationships',
            modes: ['native', 'ai', 'hybrid'],
            defaultMode: aiEnabledTypes.includes('class') ? generationMode : 'native',
          },
          {
            id: 'flowchart',
            name: 'Flowchart',
            description: 'Visualize function control flow and logic',
            modes: ['native', 'ai', 'hybrid'],
            defaultMode: aiEnabledTypes.includes('flowchart') ? generationMode : 'native',
          },
          {
            id: 'sequence',
            name: 'Sequence Diagram',
            description: 'Visualize method calls and interactions between objects',
            modes: ['ai'],
            defaultMode: aiAvailable ? 'ai' : 'unavailable',
            requiresAI: true,
          },
          {
            id: 'dependency',
            name: 'Dependency Graph',
            description: 'Visualize module dependencies and relationships',
            modes: ['ai'],
            defaultMode: aiAvailable ? 'ai' : 'unavailable',
            requiresAI: true,
          },
        ],
      },
    });
  } catch (error) {
    console.error('Supported types error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get supported types',
    });
  }
});
