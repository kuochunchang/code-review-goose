import fs from 'fs-extra';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../../services/configService.js';
import type { ProjectConfig } from '../../../types/config.js';
import { DEFAULT_CONFIG } from '../../../types/config.js';

// Mock fs-extra
vi.mock('fs-extra');

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockProjectPath = '/test/project';
  const configPath = path.join(mockProjectPath, '.code-review', 'config.json');

  beforeEach(() => {
    configService = new ConfigService(mockProjectPath);
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should return default config when file does not exist', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(false);

      const config = await configService.load();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(fs.ensureDir).toHaveBeenCalledWith(
        path.join(mockProjectPath, '.code-review')
      );
    });

    it('should load saved config from file', async () => {
      const savedConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        aiProvider: 'openai',
        openai: {
          apiKey: 'test-key',
          model: 'gpt-4-turbo',
        },
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedConfig) as any);

      const config = await configService.load();

      // Config service merges with DEFAULT_CONFIG, so timeout will be added
      const expectedConfig = {
        ...savedConfig,
        openai: {
          ...savedConfig.openai,
          timeout: 60000, // Default timeout from DEFAULT_CONFIG
        },
      };
      expect(config).toEqual(expectedConfig);
      expect(fs.readFile).toHaveBeenCalledWith(configPath, 'utf-8');
    });

    it('should use cache on subsequent loads without force', async () => {
      const savedConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        aiProvider: 'openai',
        openai: { apiKey: 'cached-key', model: 'gpt-4' },
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedConfig) as any);

      // First load
      await configService.load();
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Second load without force
      await configService.load(false);
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should reload from file when force is true', async () => {
      const savedConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        openai: { apiKey: 'test-key', model: 'gpt-4' },
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedConfig) as any);

      // First load
      await configService.load();
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Force reload
      await configService.load(true);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should return default config on JSON parse error', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue('invalid json' as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const config = await configService.load();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load config:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('save', () => {
    it('should save config to file', async () => {
      const newConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        openai: {
          apiKey: 'new-api-key',
          model: 'gpt-4-turbo',
        },
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await configService.save(newConfig);

      expect(fs.ensureDir).toHaveBeenCalledWith(
        path.join(mockProjectPath, '.code-review')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(newConfig, null, 2),
        'utf-8'
      );
    });

    it('should throw error on save failure', async () => {
      const newConfig: ProjectConfig = DEFAULT_CONFIG;
      const error = new Error('Write failed');

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(configService.save(newConfig)).rejects.toThrow(
        'Failed to save configuration'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save config:', error);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('should update specific fields', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(DEFAULT_CONFIG) as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const updates: Partial<ProjectConfig> = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'updated-key',
          model: 'gpt-4-turbo',
        },
      };

      const result = await configService.update(updates);

      expect(result.aiProvider).toBe('openai');
      expect(result.openai?.apiKey).toBe('updated-key');
      expect(result.openai?.model).toBe('gpt-4-turbo');
    });

    it('should deep merge nested openai config', async () => {
      const existingConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        openai: {
          apiKey: 'existing-key',
          model: 'gpt-4',
          timeout: 30000,
        },
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingConfig) as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      // Only update apiKey, keep model and timeout
      const updates: Partial<ProjectConfig> = {
        openai: {
          apiKey: 'new-key',
          model: 'gpt-4',
        },
      };

      const result = await configService.update(updates);

      expect(result.openai?.apiKey).toBe('new-key');
      expect(result.openai?.model).toBe('gpt-4');
      expect(result.openai?.timeout).toBe(30000); // Should be preserved
    });

    it('should update ignore patterns', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(DEFAULT_CONFIG) as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const newPatterns = ['node_modules', '.git', 'custom-dir'];
      const updates: Partial<ProjectConfig> = {
        ignorePatterns: newPatterns,
      };

      const result = await configService.update(updates);

      expect(result.ignorePatterns).toEqual(newPatterns);
    });

    it('should update UML config', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(DEFAULT_CONFIG) as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const updates: Partial<ProjectConfig> = {
        uml: {
          generationMode: 'native',
          nativeOptions: {
            includePrivateMembers: true,
            analyzeImports: false,
          },
        },
      };

      const result = await configService.update(updates);

      expect(result.uml?.generationMode).toBe('native');
      expect(result.uml?.nativeOptions?.includePrivateMembers).toBe(true);
    });
  });

  describe('get', () => {
    it('should always reload from file', async () => {
      const savedConfig: ProjectConfig = {
        ...DEFAULT_CONFIG,
        openai: { apiKey: 'test-key', model: 'gpt-4' },
      };

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedConfig) as any);

      // First get
      await configService.get();
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Second get should reload (force = true)
      await configService.get();
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('should reset to default config', async () => {
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await configService.reset();

      expect(result).toEqual(DEFAULT_CONFIG);
      expect(fs.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        'utf-8'
      );
    });
  });
});
