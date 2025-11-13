import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock API instance using hoisted
const { mockApi } = vi.hoisted(() => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return { mockApi };
});

// Mock axios before importing services
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => mockApi),
    },
  };
});

// Import services after mocking axios
import { analysisApi, configApi, fileApi, projectApi, searchApi } from '../../services/api';

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('projectApi', () => {
    describe('getProjectInfo', () => {
      it('should fetch project info successfully', async () => {
        const mockProjectInfo = {
          name: 'test-project',
          path: '/test/path',
          version: '1.0.0',
        };

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockProjectInfo },
        });

        const result = await projectApi.getProjectInfo();

        expect(result).toEqual(mockProjectInfo);
        expect(mockApi.get).toHaveBeenCalledWith('/project/info');
      });

      it('should throw error when API returns error', async () => {
        mockApi.get.mockResolvedValue({
          data: { success: false, error: 'Failed to fetch' },
        });

        await expect(projectApi.getProjectInfo()).rejects.toThrow('Failed to fetch');
      });

      it('should throw default error when no data returned', async () => {
        mockApi.get.mockResolvedValue({
          data: { success: true },
        });

        await expect(projectApi.getProjectInfo()).rejects.toThrow('Failed to get project info');
      });
    });

    describe('getFileTree', () => {
      it('should fetch file tree successfully', async () => {
        const mockFileTree = {
          name: 'src',
          type: 'directory',
          children: [],
        };

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockFileTree },
        });

        const result = await projectApi.getFileTree();

        expect(result).toEqual(mockFileTree);
        expect(mockApi.get).toHaveBeenCalledWith('/project/tree');
      });

      it('should throw error when fetching file tree fails', async () => {
        mockApi.get.mockResolvedValue({
          data: { success: false, error: 'Tree fetch failed' },
        });

        await expect(projectApi.getFileTree()).rejects.toThrow('Tree fetch failed');
      });
    });
  });

  describe('fileApi', () => {
    describe('getFileContent', () => {
      it('should fetch file content successfully', async () => {
        const mockContent = 'console.log("test");';

        mockApi.get.mockResolvedValue({
          data: { success: true, data: { content: mockContent } },
        });

        const result = await fileApi.getFileContent('test.ts');

        expect(result).toBe(mockContent);
        expect(mockApi.get).toHaveBeenCalledWith('/file/content', {
          params: { path: 'test.ts' },
        });
      });

      it('should throw error when file not found', async () => {
        mockApi.get.mockResolvedValue({
          data: { success: false, error: 'File not found' },
        });

        await expect(fileApi.getFileContent('missing.ts')).rejects.toThrow('File not found');
      });
    });
  });

  describe('analysisApi', () => {
    describe('analyzeCode', () => {
      it('should analyze code successfully', async () => {
        const mockAnalysis = {
          issues: [],
          summary: 'No issues found',
        };

        mockApi.post.mockResolvedValue({
          data: { success: true, data: mockAnalysis },
        });

        const result = await analysisApi.analyzeCode('const x = 1;');

        expect(result).toEqual(mockAnalysis);
        expect(mockApi.post).toHaveBeenCalledWith('/analysis/analyze', {
          code: 'const x = 1;',
          options: undefined,
        });
      });

      it('should pass options to analysis', async () => {
        const mockAnalysis = { issues: [], summary: 'OK' };
        const options = { language: 'typescript' };

        mockApi.post.mockResolvedValue({
          data: { success: true, data: mockAnalysis },
        });

        await analysisApi.analyzeCode('code', options);

        expect(mockApi.post).toHaveBeenCalledWith('/analysis/analyze', {
          code: 'code',
          options,
        });
      });
    });

    describe('getStatus', () => {
      it('should get analysis status', async () => {
        const mockStatus = { analyzing: false, queue: 0 };

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockStatus },
        });

        const result = await analysisApi.getStatus();

        expect(result).toEqual(mockStatus);
      });
    });

    describe('isFileAnalyzable', () => {
      it('should check if file is analyzable', async () => {
        mockApi.get.mockResolvedValue({
          data: { success: true, data: { isAnalyzable: true, filePath: 'test.ts' } },
        });

        const result = await analysisApi.isFileAnalyzable('test.ts');

        expect(result).toBe(true);
        expect(mockApi.get).toHaveBeenCalledWith('/analysis/is-analyzable', {
          params: { filePath: 'test.ts' },
        });
      });
    });
  });

  describe('configApi', () => {
    describe('getConfig', () => {
      it('should fetch config successfully', async () => {
        const mockConfig = { aiProvider: 'openai', apiKey: 'test' };

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockConfig },
        });

        const result = await configApi.getConfig();

        expect(result).toEqual(mockConfig);
      });
    });

    describe('updateConfig', () => {
      it('should update config successfully', async () => {
        const updates = { aiProvider: 'claude' as const };
        const mockConfig = { aiProvider: 'claude', apiKey: 'test' };

        mockApi.put.mockResolvedValue({
          data: { success: true, data: mockConfig },
        });

        const result = await configApi.updateConfig(updates);

        expect(result).toEqual(mockConfig);
        expect(mockApi.put).toHaveBeenCalledWith('/config', updates);
      });
    });

    describe('resetConfig', () => {
      it('should reset config successfully', async () => {
        mockApi.post.mockResolvedValue({
          data: { success: true },
        });

        await expect(configApi.resetConfig()).resolves.not.toThrow();
      });
    });
  });

  describe('searchApi', () => {
    describe('search', () => {
      it('should perform search successfully', async () => {
        const options = { query: 'test', caseSensitive: false };
        const mockResult = { files: [], totalMatches: 0 };

        mockApi.post.mockResolvedValue({
          data: { success: true, data: mockResult },
        });

        const result = await searchApi.search(options as any);

        expect(result).toEqual(mockResult);
        expect(mockApi.post).toHaveBeenCalledWith('/search', options);
      });
    });

    describe('searchWithContext', () => {
      it('should search with context', async () => {
        const options = { query: 'test' };
        const mockResult = {
          files: [],
          totalFiles: 0,
          totalMatches: 0,
          searchTime: 100,
          truncated: false,
        };

        mockApi.post.mockResolvedValue({
          data: { success: true, data: mockResult },
        });

        const result = await searchApi.searchWithContext(options as any);

        expect(result).toEqual(mockResult);
        expect(mockApi.post).toHaveBeenCalledWith('/search/with-context', options);
      });
    });

    describe('getHistory', () => {
      it('should get search history with default limit', async () => {
        const mockHistory = [{ query: 'test', timestamp: '2025-11-08' }];

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockHistory },
        });

        const result = await searchApi.getHistory();

        expect(result).toEqual(mockHistory);
        expect(mockApi.get).toHaveBeenCalledWith('/search/history', {
          params: { limit: 10 },
        });
      });

      it('should get search history with custom limit', async () => {
        const mockHistory: any[] = [];

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockHistory },
        });

        await searchApi.getHistory(20);

        expect(mockApi.get).toHaveBeenCalledWith('/search/history', {
          params: { limit: 20 },
        });
      });
    });

    describe('clearHistory', () => {
      it('should clear search history', async () => {
        mockApi.delete.mockResolvedValue({
          data: { success: true },
        });

        await expect(searchApi.clearHistory()).resolves.not.toThrow();
        expect(mockApi.delete).toHaveBeenCalledWith('/search/history');
      });
    });

    describe('getStats', () => {
      it('should get search stats', async () => {
        const mockStats = { totalSearches: 100, avgResponseTime: 50 };

        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockStats },
        });

        const result = await searchApi.getStats();

        expect(result).toEqual(mockStats);
      });
    });
  });
});
