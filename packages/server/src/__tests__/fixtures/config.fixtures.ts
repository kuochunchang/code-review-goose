import type { ProjectConfig } from '../../types/config.js';

/**
 * 默认OpenAI配置
 * 完整配置，可用于大多数测试场景
 */
export const mockOpenAIConfig: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: 'sk-test-key-12345',
    model: 'gpt-4',
    timeout: 60000,
  },
  ignorePatterns: ['node_modules', '.git', 'dist'],
  maxFileSize: 5242880,
  analyzableFileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.vue'],
};

/**
 * 未配置的config
 * API key为空，用于测试未配置场景
 */
export const mockUnconfiguredConfig: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: '',
    model: 'gpt-4',
  },
  ignorePatterns: [],
  maxFileSize: 5242880,
};

/**
 * GPT-4 Turbo配置
 */
export const mockGPT4TurboConfig: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: 'sk-test-key-turbo',
    model: 'gpt-4-turbo',
    timeout: 120000,
  },
  ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
  maxFileSize: 5242880,
  analyzableFileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.vue'],
};

/**
 * GPT-3.5配置
 * 用于测试不同模型
 */
export const mockGPT35Config: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: 'sk-test-key-gpt35',
    model: 'gpt-3.5-turbo',
    timeout: 30000,
  },
  ignorePatterns: ['node_modules'],
  maxFileSize: 5242880,
  analyzableFileExtensions: ['.ts', '.js'],
};

/**
 * 最小化配置
 * 只包含必需字段
 */
export const mockMinimalConfig: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: 'sk-minimal',
    model: 'gpt-4',
  },
  ignorePatterns: [],
  maxFileSize: 5242880,
};

/**
 * 自定义扩展名配置
 * 包含额外的文件类型
 */
export const mockCustomExtensionsConfig: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: 'sk-test-key',
    model: 'gpt-4',
  },
  ignorePatterns: ['node_modules'],
  maxFileSize: 5242880,
  analyzableFileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.vue', '.py', '.java', '.go', '.rs'],
};

/**
 * 大文件配置
 * 更大的maxFileSize限制
 */
export const mockLargeFileConfig: ProjectConfig = {
  aiProvider: 'openai',
  openai: {
    apiKey: 'sk-test-key',
    model: 'gpt-4',
  },
  ignorePatterns: ['node_modules'],
  maxFileSize: 10485760, // 10MB
  analyzableFileExtensions: ['.ts', '.js'],
};
