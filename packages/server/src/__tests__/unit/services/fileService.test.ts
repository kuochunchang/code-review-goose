import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileService } from '../../../services/fileService.js';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
vi.mock('fs-extra');

describe('FileService', () => {
  let fileService: FileService;
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    fileService = new FileService(mockProjectPath);
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'console.log("Hello World");';
      const relativePath = 'src/index.ts';

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockContent as any);

      const content = await fileService.readFile(relativePath);

      expect(content).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(path.join(mockProjectPath, relativePath), 'utf-8');
    });

    it('should throw error for path traversal attack (..)', async () => {
      await expect(fileService.readFile('../../../etc/passwd')).rejects.toThrow(
        'Invalid file path'
      );
    });

    it('should throw error for absolute path', async () => {
      await expect(fileService.readFile('/etc/passwd')).rejects.toThrow('Invalid file path');
    });

    it('should throw error for non-existent file', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await expect(fileService.readFile('nonexistent.ts')).rejects.toThrow('File does not exist');
    });

    it('should throw error when path is a directory', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => false,
        size: 0,
      } as any);

      await expect(fileService.readFile('src')).rejects.toThrow('Not a file');
    });

    it('should throw error for files exceeding max size (5MB)', async () => {
      const maxSize = 5 * 1024 * 1024;
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: maxSize + 1,
      } as any);

      await expect(fileService.readFile('large-file.ts')).rejects.toThrow('File too large');
    });

    it('should successfully read file at max size limit', async () => {
      const maxSize = 5 * 1024 * 1024;
      const mockContent = 'a'.repeat(maxSize);

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: maxSize,
      } as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockContent as any);

      const content = await fileService.readFile('exactly-5mb.ts');

      expect(content).toBe(mockContent);
    });
  });

  describe('readFileChunk', () => {
    it('should read first chunk of large file', async () => {
      const totalSize = 10 * 1024 * 1024; // 10MB
      const chunkSize = 1 * 1024 * 1024; // 1MB
      const mockContent = 'a'.repeat(chunkSize);
      const mockBuffer = Buffer.from(mockContent);

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: totalSize,
      } as any);

      const mockFd = 123;
      vi.mocked(fs.open).mockResolvedValue(mockFd as any);
      vi.mocked(fs.read).mockImplementation(async (fd, buffer: any) => {
        mockBuffer.copy(buffer);
        return { bytesRead: chunkSize, buffer } as any;
      });
      vi.mocked(fs.close).mockResolvedValue(undefined);

      const result = await fileService.readFileChunk('large-file.ts', 0, chunkSize);

      expect(result.content).toBe(mockContent);
      expect(result.offset).toBe(chunkSize);
      expect(result.totalSize).toBe(totalSize);
      expect(result.hasMore).toBe(true);
      expect(result.isLargeFile).toBe(true);
      expect(fs.close).toHaveBeenCalledWith(mockFd);
    });

    it('should read last chunk of file', async () => {
      const totalSize = 2.5 * 1024 * 1024; // 2.5MB
      const chunkSize = 1 * 1024 * 1024; // 1MB
      const offset = 2 * 1024 * 1024; // 2MB offset
      const remainingSize = totalSize - offset; // 0.5MB
      const mockContent = 'b'.repeat(remainingSize);
      const mockBuffer = Buffer.from(mockContent);

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: totalSize,
      } as any);

      const mockFd = 124;
      vi.mocked(fs.open).mockResolvedValue(mockFd as any);
      vi.mocked(fs.read).mockImplementation(async (fd, buffer: any) => {
        mockBuffer.copy(buffer);
        return { bytesRead: remainingSize, buffer } as any;
      });
      vi.mocked(fs.close).mockResolvedValue(undefined);

      const result = await fileService.readFileChunk('file.ts', offset, chunkSize);

      expect(result.offset).toBe(totalSize);
      expect(result.hasMore).toBe(false);
      expect(result.isLargeFile).toBe(false);
    });

    it('should return empty content when offset exceeds file size', async () => {
      const totalSize = 1024;
      const offset = 2048;

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: totalSize,
      } as any);

      const result = await fileService.readFileChunk('file.ts', offset);

      expect(result.content).toBe('');
      expect(result.offset).toBe(totalSize);
      expect(result.hasMore).toBe(false);
    });

    it('should throw error for path traversal in chunk read', async () => {
      await expect(fileService.readFileChunk('../../../etc/passwd')).rejects.toThrow(
        'Invalid file path'
      );
    });

    it('should close file descriptor even on error', async () => {
      const mockFd = 125;
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: 1024,
      } as any);
      vi.mocked(fs.open).mockResolvedValue(mockFd as any);
      vi.mocked(fs.read).mockRejectedValue(new Error('Read error'));
      vi.mocked(fs.close).mockResolvedValue(undefined);

      await expect(fileService.readFileChunk('file.ts')).rejects.toThrow('Read error');
      expect(fs.close).toHaveBeenCalledWith(mockFd);
    });
  });

  describe('getFileInfo', () => {
    it('should return file info for small file', async () => {
      const fileSize = 1024;

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: fileSize,
      } as any);

      const info = await fileService.getFileInfo('small-file.ts');

      expect(info.size).toBe(fileSize);
      expect(info.isLargeFile).toBe(false);
    });

    it('should return file info for large file', async () => {
      const fileSize = 10 * 1024 * 1024; // 10MB

      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => true,
        size: fileSize,
      } as any);

      const info = await fileService.getFileInfo('large-file.ts');

      expect(info.size).toBe(fileSize);
      expect(info.isLargeFile).toBe(true);
    });

    it('should throw error for invalid path', async () => {
      await expect(fileService.getFileInfo('../../../etc/passwd')).rejects.toThrow(
        'Invalid file path'
      );
    });

    it('should throw error for non-existent file', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      await expect(fileService.getFileInfo('nonexistent.ts')).rejects.toThrow(
        'File does not exist'
      );
    });

    it('should throw error for directory', async () => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => false,
        size: 0,
      } as any);

      await expect(fileService.getFileInfo('src')).rejects.toThrow('Not a file');
    });
  });
});
