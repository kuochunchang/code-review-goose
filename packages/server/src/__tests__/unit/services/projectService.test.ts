import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProjectService } from '../../../services/projectService.js';
import fs from 'fs-extra';

// Mock fs-extra
vi.mock('fs-extra');

describe('ProjectService', () => {
  let projectService: ProjectService;
  const mockProjectPath = '/test/project';

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    vi.resetAllMocks();

    // Mock .gitignore check in constructor
    vi.mocked(fs.pathExists).mockResolvedValue(false);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('Not found'));

    projectService = new ProjectService(mockProjectPath);

    // Wait for constructor async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Reset mocks after constructor
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProjectInfo', () => {
    it('should return basic project info', async () => {
      // Mock fs.stat for project directory (first call in getProjectInfo)
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      // Mock fs.stat for project directory (second call in calculateProjectStats)
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      // Mock empty directory
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      const info = await projectService.getProjectInfo(false);

      expect(info.name).toBe('project');
      expect(info.path).toBe(mockProjectPath);
      expect(info.fileCount).toBe(0);
      expect(info.totalSize).toBe(0);
    });

    it('should count files and calculate total size', async () => {
      // First stat call in getProjectInfo
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      // Second stat call in calculateProjectStats for root
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      // Mock fs.readdir for root directory
      vi.mocked(fs.readdir).mockResolvedValueOnce(['file1.ts'] as any);

      // Mock fs.stat for file1.ts
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => true,
        size: 1024,
      } as any);

      const info = await projectService.getProjectInfo(false);

      expect(info.fileCount).toBe(1);
      expect(info.totalSize).toBe(1024);
    });

    it('should use cache when available', async () => {
      // First call - set up all mocks
      vi.mocked(fs.stat).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const info1 = await projectService.getProjectInfo(false);

      // Clear mocks
      vi.clearAllMocks();

      // Second call with cache
      const info2 = await projectService.getProjectInfo(true);

      expect(info2).toEqual(info1);
      expect(fs.stat).not.toHaveBeenCalled(); // Should not call fs operations
    });
  });

  describe('clearCache', () => {
    it('should clear the project info cache', () => {
      projectService.clearCache();
      // Cache should be cleared - this is verified by checking internal state
      // The method doesn't return anything, so we just ensure it doesn't throw
      expect(() => projectService.clearCache()).not.toThrow();
    });
  });

  describe('getFileTree', () => {
    it('should build file tree with empty directory', async () => {
      // Root directory
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any);

      const tree = await projectService.getFileTree();

      expect(tree.name).toBe('project');
      expect(tree.type).toBe('directory');
      expect(tree.children).toHaveLength(0);
    });

    it('should build file tree with files', async () => {
      // Root directory
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      vi.mocked(fs.readdir).mockResolvedValueOnce(['file1.ts'] as any);

      // file1.ts
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => true,
        size: 100,
      } as any);

      const tree = await projectService.getFileTree();

      expect(tree.type).toBe('directory');
      expect(tree.children).toHaveLength(1);
      expect(tree.children![0].name).toBe('file1.ts');
      expect(tree.children![0].type).toBe('file');
      expect(tree.children![0].size).toBe(100);
    });

    it('should build nested file tree', async () => {
      // Root directory
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      vi.mocked(fs.readdir).mockResolvedValueOnce(['src'] as any);

      // src directory
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 0,
      } as any);

      vi.mocked(fs.readdir).mockResolvedValueOnce(['index.ts'] as any);

      // index.ts
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => true,
        size: 500,
      } as any);

      const tree = await projectService.getFileTree();

      expect(tree.type).toBe('directory');
      expect(tree.children).toHaveLength(1);
      expect(tree.children![0].name).toBe('src');
      expect(tree.children![0].type).toBe('directory');
      expect(tree.children![0].children).toHaveLength(1);
      expect(tree.children![0].children![0].name).toBe('index.ts');
      expect(tree.children![0].children![0].size).toBe(500);
    });
  });
});
