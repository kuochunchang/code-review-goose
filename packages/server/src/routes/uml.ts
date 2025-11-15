import { Request, Response, Router } from 'express';
import { AIService } from '../services/aiService.js';
import { ConfigService } from '../services/configService.js';
import { InsightService } from '../services/insightService.js';
import { DiagramType, UMLService } from '../services/umlService.js';

export const umlRouter = Router();

/**
 * POST /api/uml/generate
 * Generate UML diagram (caching removed as per requirements)
 */
umlRouter.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      type,
      filePath,
      crossFileAnalysis,
      analysisDepth,
      analysisMode,
    } = req.body as {
      code: string;
      type: DiagramType;
      filePath: string;
      forceRefresh?: boolean; // Accepted for backward compatibility
      crossFileAnalysis?: boolean;
      analysisDepth?: 1 | 2 | 3;
      analysisMode?: 'forward' | 'reverse' | 'bidirectional';
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

    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'FilePath is required and must be a string',
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

    // Validate cross-file analysis parameters
    if (crossFileAnalysis) {
      // Cross-file analysis only supported for class diagrams
      if (type !== 'class') {
        res.status(400).json({
          success: false,
          error: 'Cross-file analysis is only supported for class diagrams',
        });
        return;
      }

      // Validate analysisDepth
      if (analysisDepth && (analysisDepth < 1 || analysisDepth > 3)) {
        res.status(400).json({
          success: false,
          error: 'analysisDepth must be 1, 2, or 3',
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
    let result;

    if (crossFileAnalysis && type === 'class') {
      // Use cross-file analysis for class diagrams with specified mode
      const depth = analysisDepth || 1;
      const mode = analysisMode || 'bidirectional';
      result = await umlService.generateCrossFileClassDiagram(filePath, projectPath, depth, mode);
    } else {
      // Use standard single-file analysis
      result = await umlService.generateDiagram(code, type);
    }

    res.json({
      success: true,
      data: {
        ...result,
        crossFileAnalysis: !!crossFileAnalysis,
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
 * Clear UML insights (deprecated endpoint, use /api/insights/clear instead)
 * Note: This clears ALL insights including analysis, not just UML
 */
umlRouter.delete('/cache', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const insightService = new InsightService(projectPath);

    // Clear all insights (including UML and analysis)
    await insightService.clear();

    res.json({
      success: true,
      data: {
        message: 'All insights (including UML diagrams) cleared successfully',
        note: 'UML is now stored in insights. Use /api/insights/clear for future requests.',
      },
    });
  } catch (error) {
    console.error('Insights clear error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear insights',
    });
  }
});

/**
 * GET /api/uml/cache/stats
 * Get UML insights statistics (deprecated endpoint, use /api/insights/stats instead)
 */
umlRouter.get('/cache/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectPath = req.app.locals.projectPath;
    const insightService = new InsightService(projectPath);

    const stats = await insightService.getStats();

    res.json({
      success: true,
      data: {
        ...stats,
        note: 'UML is now stored in insights. Use /api/insights/stats for future requests.',
      },
    });
  } catch (error) {
    console.error('Insights stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get insights stats',
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
