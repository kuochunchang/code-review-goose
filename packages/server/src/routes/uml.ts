import { Request, Response, Router } from 'express';
import { InsightService } from '../services/insightService.js';
import { UMLAnalyzer } from '@code-review-goose/analysis-core';
import { NodeFileProvider } from '@code-review-goose/analysis-adapter-node';
import type { DiagramType } from '@code-review-goose/analysis-types';

export const umlRouter = Router();

/**
 * POST /api/uml/generate
 * Generate UML diagram with unified interface for single-file and cross-file analysis
 */
umlRouter.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, filePath, depth, analysisDepth, analysisMode, crossFileAnalysis } = req.body as {
      code?: string; // Optional: accepted for backward compatibility but not used (filePath is used instead)
      type: DiagramType;
      filePath: string;
      depth?: number; // New unified parameter: 0 = single file, 1-3 = cross-file
      analysisDepth?: number; // Legacy parameter, maps to depth
      analysisMode?: 'forward' | 'reverse' | 'bidirectional';
      crossFileAnalysis?: boolean; // Legacy parameter, maps to depth > 0
      forceRefresh?: boolean; // Accepted for backward compatibility
    };

    const projectPath = req.app.locals.projectPath;

    // Validate filePath (required)
    if (!filePath || typeof filePath !== 'string') {
      res.status(400).json({
        success: false,
        error: 'filePath is required and must be a string',
      });
      return;
    }

    // Validate type
    const validTypes: DiagramType[] = ['class', 'flowchart', 'sequence'];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: `type is required and must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    // Determine depth from new or legacy parameters
    // Priority: depth > analysisDepth > crossFileAnalysis flag
    let finalDepth = 0; // Default to single file
    if (depth !== undefined) {
      finalDepth = depth;
    } else if (analysisDepth !== undefined) {
      finalDepth = analysisDepth;
    } else if (crossFileAnalysis === true) {
      finalDepth = 1; // If crossFileAnalysis=true, use depth=1
    }

    // Validate depth
    if (finalDepth < 0 || finalDepth > 3) {
      res.status(400).json({
        success: false,
        error: 'depth must be between 0 (single file) and 3 (cross-file)',
      });
      return;
    }

    // For non-class diagrams, only depth=0 is supported
    if (type !== 'class' && finalDepth > 0) {
      res.status(400).json({
        success: false,
        error: `Cross-file analysis (depth > 0) is only supported for class diagrams. Type '${type}' only supports depth=0`,
      });
      return;
    }

    // Generate UML diagram using unified method (native mode only)
    const fileProvider = new NodeFileProvider(projectPath);
    const umlAnalyzer = new UMLAnalyzer(fileProvider);
    const result = await umlAnalyzer.generateUnifiedDiagram(filePath, type, {
      depth: finalDepth,
      mode: analysisMode || 'bidirectional',
    });

    res.json({
      success: true,
      data: {
        ...result,
        // Include legacy fields for backward compatibility
        crossFileAnalysis: finalDepth > 0,
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
 * Get supported UML diagram types (native mode only)
 */
umlRouter.get('/supported-types', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        generationMode: 'native',
        aiAvailable: false,
        types: [
          {
            id: 'class',
            name: 'Class Diagram',
            description: 'Visualize classes, interfaces, and their relationships',
            modes: ['native'],
            defaultMode: 'native',
          },
          {
            id: 'flowchart',
            name: 'Flowchart',
            description: 'Visualize function control flow and logic',
            modes: ['native'],
            defaultMode: 'native',
          },
          {
            id: 'sequence',
            name: 'Sequence Diagram',
            description: 'Visualize method calls and interactions between objects',
            modes: ['native'],
            defaultMode: 'native',
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
