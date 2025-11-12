import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { projectRouter } from '../../../routes/project.js';
import { ProjectService } from '../../../services/projectService.js';

// Mock ProjectService
vi.mock('../../../services/projectService.js');

describe('Project API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/project', projectRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/project/info', () => {
    it('should return project info', async () => {
      const mockProjectInfo = {
        name: 'test-project',
        path: '/test/path',
        fileCount: 10,
        totalSize: 1024,
      };

      const mockGetProjectInfo = vi.fn().mockResolvedValue(mockProjectInfo);
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            getProjectInfo: mockGetProjectInfo,
          }) as any
      );

      const response = await request(app).get('/api/project/info');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProjectInfo);
    });

    it('should handle errors when getting project info', async () => {
      const mockGetProjectInfo = vi.fn().mockRejectedValue(new Error('Failed to read project'));
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            getProjectInfo: mockGetProjectInfo,
          }) as any
      );

      const response = await request(app).get('/api/project/info');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to read project');
    });
  });

  describe('GET /api/project/tree', () => {
    it('should return file tree', async () => {
      const mockFileTree = {
        name: 'src',
        type: 'directory',
        children: [],
      };

      const mockGetFileTree = vi.fn().mockResolvedValue(mockFileTree);
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            getFileTree: mockGetFileTree,
          }) as any
      );

      const response = await request(app).get('/api/project/tree');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFileTree);
    });

    it('should handle errors when getting file tree', async () => {
      const mockGetFileTree = vi.fn().mockRejectedValue(new Error('Failed to read directory'));
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            getFileTree: mockGetFileTree,
          }) as any
      );

      const response = await request(app).get('/api/project/tree');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to read directory');
    });
  });

  describe('GET /api/project/readme', () => {
    it('should return README file path when it exists', async () => {
      const mockFindReadmeFile = vi.fn().mockResolvedValue('README.md');
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            findReadmeFile: mockFindReadmeFile,
          }) as any
      );

      const response = await request(app).get('/api/project/readme');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ readmePath: 'README.md' });
      expect(mockFindReadmeFile).toHaveBeenCalledTimes(1);
    });

    it('should return null when no README file exists', async () => {
      const mockFindReadmeFile = vi.fn().mockResolvedValue(null);
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            findReadmeFile: mockFindReadmeFile,
          }) as any
      );

      const response = await request(app).get('/api/project/readme');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ readmePath: null });
    });

    it('should handle errors when finding README file', async () => {
      const mockFindReadmeFile = vi.fn().mockRejectedValue(new Error('Failed to read directory'));
      vi.mocked(ProjectService).mockImplementation(
        () =>
          ({
            findReadmeFile: mockFindReadmeFile,
          }) as any
      );

      const response = await request(app).get('/api/project/readme');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to read directory');
    });
  });
});
