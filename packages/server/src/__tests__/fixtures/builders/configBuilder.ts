import type { ProjectConfig } from '../../../types/config.js';

/**
 * ProjectConfig Builder
 * 用于灵活构建测试所需的配置对象
 *
 * @example
 * const config = buildConfig()
 *   .withApiKey('custom-key')
 *   .withModel('gpt-4-turbo')
 *   .withIgnorePatterns(['node_modules', 'dist'])
 *   .build();
 */
export class ConfigBuilder {
  private config: ProjectConfig = {
    aiProvider: 'openai',
    openai: {
      apiKey: 'sk-test-default',
      model: 'gpt-4',
    },
    ignorePatterns: [],
    maxFileSize: 5242880, // 5MB default
  };

  /**
   * 设置AI provider
   * @param provider - Provider类型
   */
  withProvider(provider: 'openai' | 'claude' | 'gemini' | 'ollama'): this {
    this.config.aiProvider = provider;
    return this;
  }

  /**
   * 设置OpenAI API Key
   * @param apiKey - API密钥
   */
  withApiKey(apiKey: string): this {
    if (this.config.openai) {
      this.config.openai.apiKey = apiKey;
    }
    return this;
  }

  /**
   * 设置模型
   * @param model - 模型名称
   */
  withModel(model: string): this {
    if (this.config.openai) {
      this.config.openai.model = model;
    }
    return this;
  }

  /**
   * 设置超时时间
   * @param timeout - 超时时间（毫秒）
   */
  withTimeout(timeout: number): this {
    if (this.config.openai) {
      this.config.openai.timeout = timeout;
    }
    return this;
  }

  /**
   * 设置忽略模式
   * @param patterns - 忽略的文件/目录模式
   */
  withIgnorePatterns(patterns: string[]): this {
    this.config.ignorePatterns = patterns;
    return this;
  }

  /**
   * 添加单个忽略模式
   * @param pattern - 要添加的模式
   */
  addIgnorePattern(pattern: string): this {
    this.config.ignorePatterns.push(pattern);
    return this;
  }

  /**
   * 设置最大文件大小
   * @param size - 文件大小（字节）
   */
  withMaxFileSize(size: number): this {
    this.config.maxFileSize = size;
    return this;
  }

  /**
   * 设置可分析的文件扩展名
   * @param extensions - 文件扩展名数组
   */
  withAnalyzableExtensions(extensions: string[]): this {
    this.config.analyzableFileExtensions = extensions;
    return this;
  }

  /**
   * 添加单个可分析的文件扩展名
   * @param extension - 要添加的扩展名
   */
  addAnalyzableExtension(extension: string): this {
    if (!this.config.analyzableFileExtensions) {
      this.config.analyzableFileExtensions = [];
    }
    this.config.analyzableFileExtensions.push(extension);
    return this;
  }

  /**
   * 设置为未配置状态（空API key）
   */
  unconfigured(): this {
    if (this.config.openai) {
      this.config.openai.apiKey = '';
    }
    return this;
  }

  /**
   * 设置为最小配置
   */
  minimal(): this {
    this.config.ignorePatterns = [];
    delete this.config.analyzableFileExtensions;
    if (this.config.openai) {
      delete this.config.openai.timeout;
    }
    return this;
  }

  /**
   * 设置为GPT-4配置
   */
  asGPT4(): this {
    return this.withModel('gpt-4').withApiKey('sk-gpt4-test-key');
  }

  /**
   * 设置为GPT-4 Turbo配置
   */
  asGPT4Turbo(): this {
    return this.withModel('gpt-4-turbo')
      .withApiKey('sk-gpt4-turbo-test-key')
      .withTimeout(120000);
  }

  /**
   * 设置为GPT-3.5配置
   */
  asGPT35(): this {
    return this.withModel('gpt-3.5-turbo')
      .withApiKey('sk-gpt35-test-key')
      .withTimeout(30000);
  }

  /**
   * 设置为常见的忽略模式（node项目）
   */
  withCommonNodeIgnores(): this {
    this.config.ignorePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
    ];
    return this;
  }

  /**
   * 设置为TypeScript/JavaScript项目配置
   */
  forTypeScriptProject(): this {
    return this.withCommonNodeIgnores().withAnalyzableExtensions([
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
    ]);
  }

  /**
   * 设置为Vue项目配置
   */
  forVueProject(): this {
    return this.withCommonNodeIgnores().withAnalyzableExtensions([
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.vue',
    ]);
  }

  /**
   * 设置为全栈项目配置（支持多语言）
   */
  forFullStackProject(): this {
    return this.withCommonNodeIgnores().withAnalyzableExtensions([
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.vue',
      '.py',
      '.java',
      '.go',
      '.rs',
    ]);
  }

  /**
   * 构建并返回ProjectConfig
   */
  build(): ProjectConfig {
    return { ...this.config };
  }
}

/**
 * 便捷函数：创建一个新的ConfigBuilder
 *
 * @example
 * const config = buildConfig()
 *   .forVueProject()
 *   .asGPT4Turbo()
 *   .build();
 */
export const buildConfig = (): ConfigBuilder => {
  return new ConfigBuilder();
};
