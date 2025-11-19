import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { getConfiguration, updateConfiguration } from '../utils/config.js';

describe('Config', () => {
  let mockConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      get: vi.fn((key: string, defaultValue: any) => defaultValue),
      update: vi.fn(async () => {}),
    };
    (vscode.workspace.getConfiguration as any).mockReturnValue(mockConfig);
  });

  describe('getConfiguration', () => {
    it('should return default configuration values', () => {
      const config = getConfiguration();

      expect(config.analysisDepth).toBe(2);
      expect(config.analysisMode).toBe('focused');
      expect(config.showPrivateMembers).toBe(false);
      expect(config.autoRefresh).toBe(true);
    });

    it('should read custom configuration values', () => {
      mockConfig.get = vi.fn((key: string, defaultValue: any) => {
        const values: Record<string, any> = {
          analysisDepth: 3,
          analysisMode: 'comprehensive',
          showPrivateMembers: true,
          autoRefresh: false,
        };
        return values[key] ?? defaultValue;
      });

      const config = getConfiguration();

      expect(config.analysisDepth).toBe(3);
      expect(config.analysisMode).toBe('comprehensive');
      expect(config.showPrivateMembers).toBe(true);
      expect(config.autoRefresh).toBe(false);
    });

    it('should call getConfiguration with correct section', () => {
      getConfiguration();

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('gooseCodeReview');
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration value', async () => {
      await updateConfiguration('analysisDepth', 3);

      expect(mockConfig.update).toHaveBeenCalledWith('analysisDepth', 3, false);
    });

    it('should update configuration globally when specified', async () => {
      await updateConfiguration('analysisMode', 'comprehensive', true);

      expect(mockConfig.update).toHaveBeenCalledWith('analysisMode', 'comprehensive', true);
    });

    it('should update all configuration keys', async () => {
      await updateConfiguration('analysisDepth', 3);
      await updateConfiguration('analysisMode', 'comprehensive');
      await updateConfiguration('showPrivateMembers', true);
      await updateConfiguration('autoRefresh', false);

      expect(mockConfig.update).toHaveBeenCalledTimes(4);
    });
  });
});

