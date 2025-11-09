import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from '../../../services/aiService.js';
import { ConfigService } from '../../../services/configService.js';
import { OpenAIProvider } from '../../../services/providers/openaiProvider.js';
import type { ProjectConfig } from '../../../types/config.js';
import type { AnalysisResult } from '../../../types/ai.js';

// Mock dependencies
vi.mock('../../../services/configService.js');
vi.mock('../../../services/providers/openaiProvider.js');

describe('AIService', () => {
  const mockProjectPath = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return true when OpenAI API key is configured', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.isConfigured();

      expect(result).toBe(true);
    });

    it('should return false when OpenAI API key is not configured', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: '',
          model: 'gpt-4',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.isConfigured();

      expect(result).toBe(false);
    });

    it('should return false for unknown provider', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'unknown' as any,
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.isConfigured();

      expect(result).toBe(false);
    });

    it('should return false on config error', async () => {
      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockRejectedValue(new Error('Config error')),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.isConfigured();

      expect(result).toBe(false);
    });
  });

  describe('analyzeCode', () => {
    it('should analyze code using OpenAI provider', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
          timeout: 60000,
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      const mockAnalysisResult: AnalysisResult = {
        issues: [
          {
            severity: 'medium',
            category: 'quality',
            line: 10,
            message: 'Variable name could be more descriptive',
            suggestion: 'Use camelCase naming',
          },
        ],
        summary: 'Found 1 issue',
        timestamp: new Date().toISOString(),
      };

      const mockAnalyze = vi.fn().mockResolvedValue(mockAnalysisResult);

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      vi.mocked(OpenAIProvider).mockImplementation(
        () =>
          ({
            analyze: mockAnalyze,
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.analyzeCode('const x = 1;', {
        language: 'typescript',
      });

      expect(result).toEqual(mockAnalysisResult);
      expect(mockAnalyze).toHaveBeenCalledWith('const x = 1;', { language: 'typescript' });
    });

    it('should throw error when OpenAI API key is not configured', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: '',
          model: 'gpt-4',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);

      await expect(aiServiceWithMock.analyzeCode('const x = 1;')).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should throw error for unimplemented providers', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'claude',
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);

      await expect(aiServiceWithMock.analyzeCode('const x = 1;')).rejects.toThrow(
        'Claude provider not yet implemented'
      );
    });

    it('should reuse provider instance on subsequent calls', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'test-api-key',
          model: 'gpt-4',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      const mockAnalysisResult: AnalysisResult = {
        issues: [],
        summary: 'No issues',
        timestamp: new Date().toISOString(),
      };

      const mockAnalyze = vi.fn().mockResolvedValue(mockAnalysisResult);

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      let providerCallCount = 0;
      vi.mocked(OpenAIProvider).mockImplementation(() => {
        providerCallCount++;
        return {
          analyze: mockAnalyze,
        } as any;
      });

      const aiServiceWithMock = new AIService(mockProjectPath);

      await aiServiceWithMock.analyzeCode('code 1');
      await aiServiceWithMock.analyzeCode('code 2');

      expect(providerCallCount).toBe(1); // Provider should only be created once
      expect(mockAnalyze).toHaveBeenCalledTimes(2);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'test-key',
          model: 'gpt-4',
        },
        ignorePatterns: ['node_modules'],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.getConfig();

      expect(result).toEqual(mockConfig);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration and reload provider', async () => {
      const mockInitialConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'old-key',
          model: 'gpt-4',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      const mockUpdatedConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'new-key',
          model: 'gpt-4-turbo',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      const mockUpdate = vi.fn().mockResolvedValue(mockUpdatedConfig);

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockInitialConfig),
            update: mockUpdate,
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);
      const result = await aiServiceWithMock.updateConfig({
        openai: { apiKey: 'new-key', model: 'gpt-4-turbo' },
      });

      expect(result).toEqual(mockUpdatedConfig);
      expect(mockUpdate).toHaveBeenCalledWith({
        openai: { apiKey: 'new-key', model: 'gpt-4-turbo' },
      });
    });
  });

  describe('isFileAnalyzable', () => {
    it('should return true for analyzable file extensions', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        analyzableFileExtensions: ['.ts', '.js', '.tsx', '.jsx'],
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);

      expect(await aiServiceWithMock.isFileAnalyzable('src/index.ts')).toBe(true);
      expect(await aiServiceWithMock.isFileAnalyzable('src/component.tsx')).toBe(true);
      expect(await aiServiceWithMock.isFileAnalyzable('src/utils.js')).toBe(true);
    });

    it('should return false for non-analyzable file extensions', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        analyzableFileExtensions: ['.ts', '.js'],
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);

      expect(await aiServiceWithMock.isFileAnalyzable('README.md')).toBe(false);
      expect(await aiServiceWithMock.isFileAnalyzable('image.png')).toBe(false);
      expect(await aiServiceWithMock.isFileAnalyzable('data.json')).toBe(false);
    });

    it('should return false for files without extension', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        analyzableFileExtensions: ['.ts', '.js'],
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      const aiServiceWithMock = new AIService(mockProjectPath);

      expect(await aiServiceWithMock.isFileAnalyzable('Makefile')).toBe(false);
      expect(await aiServiceWithMock.isFileAnalyzable('LICENSE')).toBe(false);
    });
  });

  describe('reloadProvider', () => {
    it('should clear provider instance', async () => {
      const mockConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'test-key',
          model: 'gpt-4',
        },
        ignorePatterns: [],
        maxFileSize: 5242880,
      };

      const mockAnalysisResult: AnalysisResult = {
        issues: [],
        summary: 'No issues',
        timestamp: new Date().toISOString(),
      };

      vi.mocked(ConfigService).mockImplementation(
        () =>
          ({
            get: vi.fn().mockResolvedValue(mockConfig),
          }) as any
      );

      let providerCallCount = 0;
      vi.mocked(OpenAIProvider).mockImplementation(() => {
        providerCallCount++;
        return {
          analyze: vi.fn().mockResolvedValue(mockAnalysisResult),
        } as any;
      });

      const aiServiceWithMock = new AIService(mockProjectPath);

      // First analysis - creates provider
      await aiServiceWithMock.analyzeCode('code 1');
      expect(providerCallCount).toBe(1);

      // Reload provider
      await aiServiceWithMock.reloadProvider();

      // Second analysis - creates new provider
      await aiServiceWithMock.analyzeCode('code 2');
      expect(providerCallCount).toBe(2);
    });
  });
});
