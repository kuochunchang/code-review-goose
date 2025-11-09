import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import type { ApiResponse } from '../types/server.js';

export const projectRouter = Router();

// GET /api/project/info - Get project information
projectRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const projectPath = req.app.locals.projectPath as string;
    const projectService = new ProjectService(projectPath);
    const info = await projectService.getProjectInfo();

    const response: ApiResponse = {
      success: true,
      data: info,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});

// GET /api/project/tree - Get file tree
projectRouter.get('/tree', async (req: Request, res: Response) => {
  try {
    const projectPath = req.app.locals.projectPath as string;
    const projectService = new ProjectService(projectPath);
    const tree = await projectService.getFileTree();

    const response: ApiResponse = {
      success: true,
      data: tree,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
});
