import { Router, Request, Response } from 'express';
import { FileService } from '../services/fileService.js';
import type { ApiResponse } from '../types/server.js';

export const fileRouter = Router();

// GET /api/file/info?path=... - Get file information
fileRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing file path parameter',
      };
      res.status(400).json(response);
      return;
    }

    const projectPath = req.app.locals.projectPath as string;
    const fileService = new FileService(projectPath);
    const fileInfo = await fileService.getFileInfo(filePath);

    const response: ApiResponse = {
      success: true,
      data: fileInfo,
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

// GET /api/file/content?path=... - Get file content
fileRouter.get('/content', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing file path parameter',
      };
      res.status(400).json(response);
      return;
    }

    const projectPath = req.app.locals.projectPath as string;
    const fileService = new FileService(projectPath);
    const content = await fileService.readFile(filePath);

    const response: ApiResponse = {
      success: true,
      data: { content },
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

// GET /api/file/chunk?path=...&offset=...&chunkSize=... - Read file in chunks
fileRouter.get('/chunk', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing file path parameter',
      };
      res.status(400).json(response);
      return;
    }

    const offset = parseInt(req.query.offset as string) || 0;
    const chunkSize = parseInt(req.query.chunkSize as string) || undefined;

    const projectPath = req.app.locals.projectPath as string;
    const fileService = new FileService(projectPath);
    const chunk = await fileService.readFileChunk(filePath, offset, chunkSize);

    const response: ApiResponse = {
      success: true,
      data: chunk,
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
