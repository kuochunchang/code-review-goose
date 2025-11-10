import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { fileRouter } from '../../../routes/file.js';
import { FileService } from '../../../services/fileService.js';
import { mockFileInfo, mockFileContent, mockFileChunk } from '../../fixtures/index.js';

// Mock FileService
vi.mock('../../../services/fileService.js');

describe('File API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/file', fileRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/file/info', () => {
    it('should return file info', async () => {
      // ✅ Using pre-defined file info fixture
      const mockGetFileInfo = vi.fn().mockResolvedValue(mockFileInfo);
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            getFileInfo: mockGetFileInfo,
          }) as any
      );

      const response = await request(app).get('/api/file/info').query({ path: 'src/test.ts' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        size: mockFileInfo.size,
        isLargeFile: mockFileInfo.isLargeFile,
      });
    });

    it('should return 400 when path is missing', async () => {
      const response = await request(app).get('/api/file/info');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing file path parameter');
    });

    it('should handle errors from FileService', async () => {
      const mockGetFileInfo = vi.fn().mockRejectedValue(new Error('File not found'));
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            getFileInfo: mockGetFileInfo,
          }) as any
      );

      const response = await request(app).get('/api/file/info').query({ path: 'nonexistent.ts' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('GET /api/file/content', () => {
    it('should return file content', async () => {
      // ✅ Using pre-defined file content fixture
      const mockReadFile = vi.fn().mockResolvedValue(mockFileContent);
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            readFile: mockReadFile,
          }) as any
      );

      const response = await request(app).get('/api/file/content').query({ path: 'src/test.ts' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(mockFileContent);
    });

    it('should return 400 when path is missing', async () => {
      const response = await request(app).get('/api/file/content');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing file path parameter');
    });

    it('should handle errors from FileService', async () => {
      const mockReadFile = vi.fn().mockRejectedValue(new Error('Invalid file path'));
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            readFile: mockReadFile,
          }) as any
      );

      const response = await request(app)
        .get('/api/file/content')
        .query({ path: '../../../etc/passwd' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid file path');
    });
  });

  describe('GET /api/file/chunk', () => {
    it('should return file chunk', async () => {
      // ✅ Using pre-defined file chunk fixture
      const mockReadFileChunk = vi.fn().mockResolvedValue(mockFileChunk);
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            readFileChunk: mockReadFileChunk,
          }) as any
      );

      const response = await request(app)
        .get('/api/file/chunk')
        .query({ path: 'large-file.ts', offset: '0', chunkSize: '1024' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFileChunk);
    });

    it('should use default offset and chunkSize when not provided', async () => {
      const mockChunk = {
        content: 'content',
        offset: 0,
        totalSize: 1024,
        hasMore: false,
        isLargeFile: false,
      };

      const mockReadFileChunk = vi.fn().mockResolvedValue(mockChunk);
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            readFileChunk: mockReadFileChunk,
          }) as any
      );

      const response = await request(app).get('/api/file/chunk').query({ path: 'file.ts' });

      expect(response.status).toBe(200);
      expect(mockReadFileChunk).toHaveBeenCalledWith('file.ts', 0, undefined);
    });

    it('should return 400 when path is missing', async () => {
      const response = await request(app).get('/api/file/chunk');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing file path parameter');
    });

    it('should handle errors from FileService', async () => {
      const mockReadFileChunk = vi.fn().mockRejectedValue(new Error('File does not exist'));
      vi.mocked(FileService).mockImplementation(
        () =>
          ({
            readFileChunk: mockReadFileChunk,
          }) as any
      );

      const response = await request(app).get('/api/file/chunk').query({ path: 'nonexistent.ts' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File does not exist');
    });
  });
});
