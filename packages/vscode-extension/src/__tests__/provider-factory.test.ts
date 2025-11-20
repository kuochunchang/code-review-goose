import { describe, it, expect, vi } from 'vitest';
import { AIProviderFactory } from '../services/providers/provider-factory.js';
import { OpenAIProvider } from '../services/providers/openai-provider.js';
import { GeminiProvider } from '../services/providers/gemini-provider.js';

// Mock the provider implementations
vi.mock('../services/providers/openai-provider.js', () => ({
  OpenAIProvider: vi.fn(),
}));

vi.mock('../services/providers/gemini-provider.js', () => ({
  GeminiProvider: vi.fn(),
}));

describe('AIProviderFactory', () => {
  describe('create', () => {
    it('should create OpenAI provider when provider is "openai"', () => {
      const config = {
        provider: 'openai' as const,
        openai: {
          apiKey: 'test-openai-key',
          model: 'gpt-4',
        },
      };

      AIProviderFactory.create(config);

      expect(OpenAIProvider).toHaveBeenCalledWith({
        apiKey: 'test-openai-key',
        model: 'gpt-4',
      });
    });

    it('should create Gemini provider when provider is "gemini"', () => {
      const config = {
        provider: 'gemini' as const,
        gemini: {
          apiKey: 'test-gemini-key',
          model: 'gemini-2.5-flash',
        },
      };

      AIProviderFactory.create(config);

      expect(GeminiProvider).toHaveBeenCalledWith({
        apiKey: 'test-gemini-key',
        model: 'gemini-2.5-flash',
      });
    });

    it('should throw error when OpenAI provider is selected but config is missing', () => {
      const config = {
        provider: 'openai' as const,
      };

      expect(() => AIProviderFactory.create(config as any)).toThrow(
        'OpenAI configuration is required when provider is "openai"'
      );
    });

    it('should throw error when Gemini provider is selected but config is missing', () => {
      const config = {
        provider: 'gemini' as const,
      };

      expect(() => AIProviderFactory.create(config as any)).toThrow(
        'Gemini configuration is required when provider is "gemini"'
      );
    });

    it('should throw error for unknown provider', () => {
      const config = {
        provider: 'claude' as any,
      };

      expect(() => AIProviderFactory.create(config)).toThrow('Unknown AI provider: claude');
    });

    it('should pass through all OpenAI config options', () => {
      const config = {
        provider: 'openai' as const,
        openai: {
          apiKey: 'test-key',
          model: 'gpt-4-turbo',
          timeout: 120000,
          baseURL: 'https://custom-api.example.com/v1',
        },
      };

      AIProviderFactory.create(config);

      expect(OpenAIProvider).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
        timeout: 120000,
        baseURL: 'https://custom-api.example.com/v1',
      });
    });

    it('should pass through all Gemini config options', () => {
      const config = {
        provider: 'gemini' as const,
        gemini: {
          apiKey: 'test-gemini-key',
          model: 'gemini-3-pro-preview',
          timeout: 90000,
        },
      };

      AIProviderFactory.create(config);

      expect(GeminiProvider).toHaveBeenCalledWith({
        apiKey: 'test-gemini-key',
        model: 'gemini-3-pro-preview',
        timeout: 90000,
      });
    });
  });
});
