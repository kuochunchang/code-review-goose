import type {
  IAIProvider,
  AIProviderType,
  OpenAIProviderConfig,
  GeminiProviderConfig,
} from './ai-provider.interface.js';
import { OpenAIProvider } from './openai-provider.js';
import { GeminiProvider } from './gemini-provider.js';

/**
 * Configuration for creating an AI provider
 */
export interface AIProviderFactoryConfig {
  provider: AIProviderType;
  openai?: OpenAIProviderConfig;
  gemini?: GeminiProviderConfig;
}

/**
 * Factory for creating AI providers
 * Supports OpenAI and Gemini providers
 */
export class AIProviderFactory {
  /**
   * Create an AI provider based on configuration
   * @param config - Provider configuration
   * @returns AI provider instance
   */
  static create(config: AIProviderFactoryConfig): IAIProvider {
    switch (config.provider) {
      case 'openai':
        if (!config.openai) {
          throw new Error('OpenAI configuration is required when provider is "openai"');
        }
        return new OpenAIProvider(config.openai);

      case 'gemini':
        if (!config.gemini) {
          throw new Error('Gemini configuration is required when provider is "gemini"');
        }
        return new GeminiProvider(config.gemini);

      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  }
}
