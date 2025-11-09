import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { configRouter } from '../../../routes/config.js';
import { AIService } from '../../../services/aiService.js';
import type { ProjectConfig } from '../../../types/config.js';

// Mock AIService
vi.mock('../../../services/aiService.js');

describe('Config API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.projectPath = '/test/project';
    app.use('/api/config', configRouter);
    vi.clearAllMocks();
  });

  describe('GET /api/config', () => {
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

      const mockGetConfig = vi.fn().mockResolvedValue(mockConfig);
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            getConfig: mockGetConfig,
          }) as any
      );

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockConfig);
    });

    it('should handle errors when getting config', async () => {
      const mockGetConfig = vi.fn().mockRejectedValue(new Error('Config read error'));
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            getConfig: mockGetConfig,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Config read error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('PUT /api/config', () => {
    it('should update configuration', async () => {
      const updates: Partial<ProjectConfig> = {
        openai: {
          apiKey: 'new-key',
          model: 'gpt-4-turbo',
        },
      };

      const mockUpdatedConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: 'new-key',
          model: 'gpt-4-turbo',
        },
        ignorePatterns: ['node_modules'],
        maxFileSize: 5242880,
      };

      const mockUpdateConfig = vi.fn().mockResolvedValue(mockUpdatedConfig);
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            updateConfig: mockUpdateConfig,
          }) as any
      );

      const response = await request(app).put('/api/config').send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedConfig);
      expect(mockUpdateConfig).toHaveBeenCalledWith(updates);
    });

    it('should handle empty configuration data', async () => {
      const mockUpdatedConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: '',
          model: 'gpt-4',
        },
        ignorePatterns: ['node_modules'],
        maxFileSize: 5242880,
      };

      const mockUpdateConfig = vi.fn().mockResolvedValue(mockUpdatedConfig);
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            updateConfig: mockUpdateConfig,
          }) as any
      );

      const response = await request(app).put('/api/config').send({});

      // Empty object is valid, should succeed
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle errors when updating config', async () => {
      const updates: Partial<ProjectConfig> = {
        openai: { apiKey: 'test-key', model: 'gpt-4' },
      };

      const mockUpdateConfig = vi.fn().mockRejectedValue(new Error('Update failed'));
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            updateConfig: mockUpdateConfig,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).put('/api/config').send(updates);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Update failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('POST /api/config/reset', () => {
    it('should reset configuration to defaults', async () => {
      const mockResetConfig: ProjectConfig = {
        aiProvider: 'openai',
        openai: {
          apiKey: '',
          model: 'gpt-4',
        },
        ignorePatterns: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
        maxFileSize: 5242880,
      };

      const mockUpdateConfig = vi.fn().mockResolvedValue(mockResetConfig);
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            updateConfig: mockUpdateConfig,
          }) as any
      );

      const response = await request(app).post('/api/config/reset');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Configuration reset to defaults');
      expect(response.body.data.config).toEqual(mockResetConfig);
    });

    it('should handle errors when resetting config', async () => {
      const mockUpdateConfig = vi.fn().mockRejectedValue(new Error('Reset failed'));
      vi.mocked(AIService).mockImplementation(
        () =>
          ({
            updateConfig: mockUpdateConfig,
          }) as any
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await request(app).post('/api/config/reset');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Reset failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
