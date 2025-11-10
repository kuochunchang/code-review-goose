import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../services/api';
import { useProjectStore } from '../../stores/project';

// Mock the API module
vi.mock('../../services/api', () => ({
  projectApi: {
    getProjectInfo: vi.fn(),
    getFileTree: vi.fn(),
  },
  fileApi: {
    getFileContent: vi.fn(),
  },
}));

describe('Project Store', () => {
  beforeEach(() => {
    // Create a new pinia instance for each test
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('fetchProjectInfo', () => {
    it('should fetch project info successfully', async () => {
      const mockProjectInfo = {
        name: 'test-project',
        path: '/test/path',
        version: '1.0.0',
        fileCount: 10,
        totalSize: 1024,
      };

      vi.mocked(api.projectApi.getProjectInfo).mockResolvedValue(mockProjectInfo);

      const store = useProjectStore();
      const result = await store.fetchProjectInfo();

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.projectInfo).toEqual(mockProjectInfo);
      expect(result).toEqual(mockProjectInfo);
      expect(api.projectApi.getProjectInfo).toHaveBeenCalledOnce();
    });

    it('should set loading to true while fetching', async () => {
      const mockProjectInfo = { name: 'test-project', path: '/test/path' };

      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.projectApi.getProjectInfo).mockReturnValue(promise as any);

      const store = useProjectStore();
      const fetchPromise = store.fetchProjectInfo();

      expect(store.loading).toBe(true);

      resolvePromise(mockProjectInfo);
      await fetchPromise;

      expect(store.loading).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const errorMessage = 'Failed to fetch project info';
      vi.mocked(api.projectApi.getProjectInfo).mockRejectedValue(new Error(errorMessage));

      const store = useProjectStore();

      await expect(store.fetchProjectInfo()).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.projectInfo).toBeNull();
    });

    it('should handle non-Error objects', async () => {
      vi.mocked(api.projectApi.getProjectInfo).mockRejectedValue('String error');

      const store = useProjectStore();

      await expect(store.fetchProjectInfo()).rejects.toEqual('String error');

      expect(store.error).toBe('Unknown error');
    });
  });

  describe('fetchFileTree', () => {
    it('should fetch file tree successfully', async () => {
      const mockFileTree = {
        name: 'src',
        type: 'directory',
        path: 'src',
        children: [{ name: 'index.ts', type: 'file', path: 'src/index.ts' }],
      };

      vi.mocked(api.projectApi.getFileTree).mockResolvedValue(mockFileTree as any);

      const store = useProjectStore();
      const result = await store.fetchFileTree();

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.fileTree).toEqual(mockFileTree);
      expect(result).toEqual(mockFileTree);
      expect(api.projectApi.getFileTree).toHaveBeenCalledOnce();
    });

    it('should handle errors when fetching file tree', async () => {
      const errorMessage = 'Failed to fetch file tree';
      vi.mocked(api.projectApi.getFileTree).mockRejectedValue(new Error(errorMessage));

      const store = useProjectStore();

      await expect(store.fetchFileTree()).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
      expect(store.fileTree).toBeNull();
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content successfully', async () => {
      const mockContent = 'console.log("Hello World");';
      vi.mocked(api.fileApi.getFileContent).mockResolvedValue(mockContent);

      const store = useProjectStore();
      const result = await store.fetchFileContent('src/index.ts');

      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(result).toBe(mockContent);
      expect(api.fileApi.getFileContent).toHaveBeenCalledWith('src/index.ts');
    });

    it('should handle errors when fetching file content', async () => {
      const errorMessage = 'File not found';
      vi.mocked(api.fileApi.getFileContent).mockRejectedValue(new Error(errorMessage));

      const store = useProjectStore();

      await expect(store.fetchFileContent('nonexistent.ts')).rejects.toThrow(errorMessage);

      expect(store.loading).toBe(false);
      expect(store.error).toBe(errorMessage);
    });
  });
});
