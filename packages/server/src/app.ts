import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import { Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import { analysisRouter } from './routes/analysis.js';
import { batchRouter } from './routes/batch.js';
import { configRouter } from './routes/config.js';
import { fileRouter } from './routes/file.js';
import { insightsRouter } from './routes/insights.js';
import { projectRouter } from './routes/project.js';
import { reviewRouter } from './routes/review.js';
import { searchRouter } from './routes/search.js';
import { umlRouter } from './routes/uml.js';
import type { ServerConfig, ServerInstance } from './types/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer(config: ServerConfig): Promise<ServerInstance> {
  const app: Express = express();
  let server: Server | null = null;

  // Store configuration in app.locals
  app.locals.projectPath = config.projectPath;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes
  app.use('/api/project', projectRouter);
  app.use('/api/file', fileRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/batch', batchRouter);
  app.use('/api/config', configRouter);
  app.use('/api/insights', insightsRouter);
  app.use('/api/reviews', reviewRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/uml', umlRouter);

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        projectPath: config.projectPath,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Static assets serving
  // Try to find web dist in different locations (for development vs. production)
  const possiblePaths = [
    path.join(__dirname, '../../web/dist'), // Development (monorepo)
    path.join(__dirname, '../web-dist'), // Published npm package (same level as server-dist)
    path.join(__dirname, '../../web-dist'), // Alternative npm package structure
  ];

  const webDistPath =
    possiblePaths.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    }) || possiblePaths[0]; // Fallback to first path if none found

  app.use(express.static(webDistPath));

  // SPA fallback - all non-API routes return index.html
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });

  // Error handling
  app.use(errorHandler);

  // Start server
  await new Promise<void>((resolve, reject) => {
    try {
      server = app.listen(config.port, () => {
        resolve();
      });
      server.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });

  return {
    port: config.port,
    projectPath: config.projectPath,
    close: async () => {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    },
  };
}
