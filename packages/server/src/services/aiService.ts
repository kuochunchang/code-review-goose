import type { AIProvider, AnalysisOptions, AnalysisResult } from '../types/ai.js';
import type { ProjectConfig } from '../types/config.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { CustomProvider } from './providers/customProvider.js';
import { ConfigService } from './configService.js';

export class AIService {
  private configService: ConfigService;
  private provider: AIProvider | null = null;

  constructor(projectPath: string) {
    this.configService = new ConfigService(projectPath);
  }

  /**
   * Initialize AI Provider
   */
  private async initializeProvider(): Promise<AIProvider> {
    const config = await this.configService.get();

    switch (config.aiProvider) {
      case 'openai':
        if (!config.openai?.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        return new OpenAIProvider({
          apiKey: config.openai.apiKey,
          model: config.openai.model,
          timeout: config.openai.timeout,
        });

      case 'custom': {
        const customConfig = config.custom;
        if (!customConfig?.baseUrl) {
          throw new Error('Custom provider base URL not configured');
        }
        if (!customConfig.model) {
          throw new Error('Custom provider model not configured');
        }
        return new CustomProvider({
          baseUrl: customConfig.baseUrl,
          apiKey: customConfig.apiKey,
          model: customConfig.model,
          timeout: customConfig.timeout,
        });
      }

      case 'claude':
        throw new Error('Claude provider not yet implemented');

      case 'gemini':
        throw new Error('Gemini provider not yet implemented');

      case 'ollama':
        throw new Error('Ollama provider not yet implemented');

      default:
        throw new Error(`Unknown AI provider: ${config.aiProvider}`);
    }
  }

  /**
   * Get current Provider
   */
  private async getProvider(): Promise<AIProvider> {
    if (!this.provider) {
      this.provider = await this.initializeProvider();
    }
    return this.provider;
  }

  /**
   * Reload Provider (when configuration updates)
   */
  async reloadProvider(): Promise<void> {
    this.provider = null;
  }

  /**
   * Analyze code
   */
  async analyzeCode(code: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const provider = await this.getProvider();
    return provider.analyze(code, options);
  }

  /**
   * Check if configuration is complete
   */
  async isConfigured(): Promise<boolean> {
    try {
      const config = await this.configService.get();

      switch (config.aiProvider) {
        case 'openai':
          return !!config.openai?.apiKey;
        case 'custom':
          return !!config.custom?.baseUrl && !!config.custom?.model;
        case 'claude':
          return !!config.claude?.apiKey;
        case 'gemini':
          return !!config.gemini?.apiKey;
        case 'ollama':
          return !!config.ollama?.baseUrl;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<ProjectConfig> {
    return this.configService.get();
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<ProjectConfig>): Promise<ProjectConfig> {
    const newConfig = await this.configService.update(config);
    await this.reloadProvider();
    return newConfig;
  }

  /**
   * Check if file can be analyzed
   */
  async isFileAnalyzable(filePath: string): Promise<boolean> {
    const config = await this.configService.get();
    const analyzableExtensions = config.analyzableFileExtensions || [];

    // Get file extension (including the dot)
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension found
      return false;
    }

    const extension = filePath.substring(lastDotIndex);

    // Check if the extension is in the analyzable list
    return analyzableExtensions.includes(extension);
  }
}
