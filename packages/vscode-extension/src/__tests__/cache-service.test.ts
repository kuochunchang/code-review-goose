import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../services/cache-service.js';
import type { AnalysisResult } from '../types/analysis.js';

// Mock VS Code API
const mockWorkspaceState = {
  keys: vi.fn(() => []),
  get: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined),
};

const mockContext: any = {
  workspaceState: mockWorkspaceState,
  subscriptions: [],
};

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockWorkspaceState.keys.mockReturnValue([]);
    mockWorkspaceState.get.mockReturnValue(undefined);
    mockWorkspaceState.update.mockResolvedValue(undefined);

    cacheService = new CacheService(mockContext);
  });

  it('should check cache and return no cache when nothing stored', async () => {
    const result = await cacheService.check('/test/file.ts', 'hash123');

    expect(result.hasCache).toBe(false);
    expect(result.hashMatched).toBe(false);
    expect(result.insight).toBeNull();
  });

  it('should find exact cache match', async () => {
    const mockInsight = {
      filePath: '/test/file.ts',
      codeHash: 'hash123',
      analysis: {
        issues: [],
        summary: 'Test',
        timestamp: '2024-01-01',
      },
      timestamp: '2024-01-01',
    };

    mockWorkspaceState.get.mockReturnValue(mockInsight);

    const result = await cacheService.check('/test/file.ts', 'hash123');

    expect(result.hasCache).toBe(true);
    expect(result.hashMatched).toBe(true);
    expect(result.insight).toEqual(mockInsight);
  });

  it('should find outdated cache with different hash', async () => {
    const mockInsight = {
      filePath: '/test/file.ts',
      codeHash: 'oldHash',
      analysis: {
        issues: [],
        summary: 'Test',
        timestamp: '2024-01-01',
      },
      timestamp: '2024-01-01',
    };

    (mockWorkspaceState.keys as any).mockReturnValue(['goose:insight:/test/file.ts:oldHash']);
    (mockWorkspaceState.get as any).mockImplementation((key: string) => {
      if (key === 'goose:insight:/test/file.ts:oldHash') {
        return mockInsight;
      }
      return undefined;
    });

    const result = await cacheService.check('/test/file.ts', 'newHash');

    expect(result.hasCache).toBe(true);
    expect(result.hashMatched).toBe(false);
    expect(result.insight).toEqual(mockInsight);
  });

  it('should save analysis to cache', async () => {
    const analysis: AnalysisResult = {
      issues: [
        {
          severity: 'high',
          category: 'security',
          line: 10,
          message: 'Security issue',
          suggestion: 'Fix it',
        },
      ],
      summary: 'Found 1 issue',
      timestamp: '2024-01-01',
    };

    await cacheService.saveAnalysis('/test/file.ts', 'hash123', analysis);

    expect(mockWorkspaceState.update).toHaveBeenCalledWith(
      'goose:insight:/test/file.ts:hash123',
      expect.objectContaining({
        filePath: '/test/file.ts',
        codeHash: 'hash123',
        analysis,
      })
    );
  });

  it('should save explain to cache', async () => {
    const explain = {
      overview: 'This is a test',
      mainComponents: [],
      howItWorks: [],
      keyConcepts: [],
      dependencies: [],
      notableFeatures: [],
      timestamp: '2024-01-01',
    };

    await cacheService.saveExplain('/test/file.ts', 'hash123', explain);

    expect(mockWorkspaceState.update).toHaveBeenCalledWith(
      'goose:insight:/test/file.ts:hash123',
      expect.objectContaining({
        filePath: '/test/file.ts',
        codeHash: 'hash123',
        explain,
      })
    );
  });

  it('should clear all cache', async () => {
    (mockWorkspaceState.keys as any).mockReturnValue([
      'goose:insight:/file1.ts:hash1',
      'goose:insight:/file2.ts:hash2',
      'other:key:value',
    ]);

    await cacheService.clearAll();

    // Should only clear insight keys
    expect(mockWorkspaceState.update).toHaveBeenCalledTimes(2);
    expect(mockWorkspaceState.update).toHaveBeenCalledWith(
      'goose:insight:/file1.ts:hash1',
      undefined
    );
    expect(mockWorkspaceState.update).toHaveBeenCalledWith(
      'goose:insight:/file2.ts:hash2',
      undefined
    );
  });
});
