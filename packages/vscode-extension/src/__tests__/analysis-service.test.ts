import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from '../services/analysis-service.js';
import type { IAIProvider } from '../services/providers/ai-provider.interface.js';
import type { AnalysisResult, ExplainResult } from '../types/analysis.js';

describe('AnalysisService', () => {
  let mockProvider: IAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = {
      analyzeCode: vi.fn(),
      explainCode: vi.fn(),
    };
  });

  it('should create service with provider', () => {
    const service = new AnalysisService(mockProvider);
    expect(service).toBeDefined();
  });

  describe('analyzeCode', () => {
    it('should delegate to provider analyzeCode method', async () => {
      const mockResult: AnalysisResult = {
        issues: [
          {
            severity: 'high',
            category: 'security',
            line: 10,
            message: 'Potential issue',
            suggestion: 'Fix it',
          },
        ],
        summary: 'Test summary',
        timestamp: new Date().toISOString(),
      };

      (mockProvider.analyzeCode as any).mockResolvedValue(mockResult);

      const service = new AnalysisService(mockProvider);
      const result = await service.analyzeCode('const x = 1;', {
        language: 'javascript',
      });

      expect(mockProvider.analyzeCode).toHaveBeenCalledWith('const x = 1;', {
        language: 'javascript',
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass options to provider', async () => {
      const mockResult: AnalysisResult = {
        issues: [],
        summary: 'OK',
        timestamp: new Date().toISOString(),
      };

      (mockProvider.analyzeCode as any).mockResolvedValue(mockResult);

      const service = new AnalysisService(mockProvider);
      await service.analyzeCode('const x = 1;', {
        language: 'typescript',
        filePath: 'test.ts',
        checkSecurity: true,
        checkPerformance: false,
      });

      expect(mockProvider.analyzeCode).toHaveBeenCalledWith('const x = 1;', {
        language: 'typescript',
        filePath: 'test.ts',
        checkSecurity: true,
        checkPerformance: false,
      });
    });

    it('should handle errors from provider', async () => {
      (mockProvider.analyzeCode as any).mockRejectedValue(new Error('Provider error'));

      const service = new AnalysisService(mockProvider);

      await expect(service.analyzeCode('const x = 1;')).rejects.toThrow('Provider error');
    });
  });

  describe('explainCode', () => {
    it('should delegate to provider explainCode method', async () => {
      const mockResult: ExplainResult = {
        overview: 'Test overview',
        fields: [],
        mainComponents: [],
        methodDependencies: [],
        howItWorks: [],
        keyConcepts: [],
        dependencies: [],
        notableFeatures: [],
        timestamp: new Date().toISOString(),
      };

      (mockProvider.explainCode as any).mockResolvedValue(mockResult);

      const service = new AnalysisService(mockProvider);
      const result = await service.explainCode('const x = 1;', {
        language: 'javascript',
      });

      expect(mockProvider.explainCode).toHaveBeenCalledWith('const x = 1;', {
        language: 'javascript',
      });
      expect(result).toEqual(mockResult);
    });

    it('should pass options to provider', async () => {
      const mockResult: ExplainResult = {
        overview: 'Test',
        fields: [],
        mainComponents: [],
        methodDependencies: [],
        howItWorks: [],
        keyConcepts: [],
        dependencies: [],
        notableFeatures: [],
        timestamp: new Date().toISOString(),
      };

      (mockProvider.explainCode as any).mockResolvedValue(mockResult);

      const service = new AnalysisService(mockProvider);
      await service.explainCode('const x = 1;', {
        language: 'python',
        filePath: 'test.py',
      });

      expect(mockProvider.explainCode).toHaveBeenCalledWith('const x = 1;', {
        language: 'python',
        filePath: 'test.py',
      });
    });

    it('should handle errors from provider', async () => {
      (mockProvider.explainCode as any).mockRejectedValue(new Error('Provider error'));

      const service = new AnalysisService(mockProvider);

      await expect(service.explainCode('const x = 1;')).rejects.toThrow('Provider error');
    });
  });

  describe('Provider Integration', () => {
    it('should work with OpenAI provider interface', async () => {
      const mockResult: AnalysisResult = {
        issues: [],
        summary: 'OK',
        timestamp: new Date().toISOString(),
      };

      (mockProvider.analyzeCode as any).mockResolvedValue(mockResult);

      const service = new AnalysisService(mockProvider);
      const result = await service.analyzeCode('const x = 1;');

      expect(result.issues).toEqual([]);
      expect(result.summary).toBe('OK');
    });

    it('should work with Gemini provider interface', async () => {
      const mockResult: ExplainResult = {
        overview: 'Gemini explanation',
        fields: [],
        mainComponents: [],
        methodDependencies: [],
        howItWorks: [],
        keyConcepts: [],
        dependencies: [],
        notableFeatures: [],
        timestamp: new Date().toISOString(),
      };

      (mockProvider.explainCode as any).mockResolvedValue(mockResult);

      const service = new AnalysisService(mockProvider);
      const result = await service.explainCode('const x = 1;');

      expect(result.overview).toBe('Gemini explanation');
    });
  });
});
