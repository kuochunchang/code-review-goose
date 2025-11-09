import fs from 'fs-extra';
import path from 'path';
import type { ProjectConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';

const CONFIG_DIR = '.code-review';
const CONFIG_FILE = 'config.json';

export class ConfigService {
  private projectPath: string;
  private configPath: string;
  private config: ProjectConfig | null = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, CONFIG_DIR, CONFIG_FILE);
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    const configDir = path.join(this.projectPath, CONFIG_DIR);
    await fs.ensureDir(configDir);
  }

  /**
   * Deep merge configuration
   * Properly handle nested objects, avoid shallow merge overwriting entire object
   */
  private deepMergeConfig(
    current: ProjectConfig,
    updates: Partial<ProjectConfig>
  ): ProjectConfig {
    const merged: ProjectConfig = { ...current };

    // Handle top-level fields
    if (updates.aiProvider !== undefined) {
      merged.aiProvider = updates.aiProvider;
    }

    if (updates.ignorePatterns !== undefined) {
      merged.ignorePatterns = updates.ignorePatterns;
    }

    if (updates.maxFileSize !== undefined) {
      merged.maxFileSize = updates.maxFileSize;
    }

    if (updates.analyzableFileExtensions !== undefined) {
      merged.analyzableFileExtensions = updates.analyzableFileExtensions;
    }

    if (updates.uml !== undefined) {
      merged.uml = updates.uml;
    }

    // Handle OpenAI config - use deep merge instead of shallow merge
    if (updates.openai) {
      merged.openai = {
        ...(merged.openai || { apiKey: '', model: 'gpt-4' }),
        ...updates.openai,
      };
    }

    // Handle Claude config
    if (updates.claude) {
      merged.claude = {
        ...(merged.claude || { apiKey: '', model: 'claude-3' }),
        ...updates.claude,
      };
    }

    // Handle Gemini config
    if (updates.gemini) {
      merged.gemini = {
        ...(merged.gemini || { apiKey: '', model: 'gemini-pro' }),
        ...updates.gemini,
      };
    }

    // Handle Ollama config
    if (updates.ollama) {
      merged.ollama = {
        ...merged.ollama,
        ...updates.ollama,
      };
    }

    return merged;
  }

  /**
   * Load configuration
   * @param force Force reload, ignore cache
   */
  async load(force: boolean = false): Promise<ProjectConfig> {
    if (this.config && !force) {
      return this.config;
    }

    try {
      await this.ensureConfigDir();

      if (await fs.pathExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(content);

        // Use deep merge to ensure new fields have default values
        this.config = {
          // First use default config as base
          ...DEFAULT_CONFIG,
          // Merge loaded config (only override defined values)
          ...(loadedConfig.aiProvider !== undefined && { aiProvider: loadedConfig.aiProvider }),
          ...(loadedConfig.openai && { openai: { ...DEFAULT_CONFIG.openai, ...loadedConfig.openai } }),
          ...(loadedConfig.claude && { claude: loadedConfig.claude }),
          ...(loadedConfig.gemini && { gemini: loadedConfig.gemini }),
          ...(loadedConfig.ollama && { ollama: loadedConfig.ollama }),
          ...(loadedConfig.ignorePatterns && { ignorePatterns: loadedConfig.ignorePatterns }),
          ...(loadedConfig.maxFileSize !== undefined && { maxFileSize: loadedConfig.maxFileSize }),
          ...(loadedConfig.analyzableFileExtensions && { analyzableFileExtensions: loadedConfig.analyzableFileExtensions }),
          ...(loadedConfig.uml && { uml: { ...DEFAULT_CONFIG.uml, ...loadedConfig.uml } }),
        };
      } else {
        // If config file does not exist, use default config
        this.config = { ...DEFAULT_CONFIG };
      }

      return this.config as ProjectConfig;
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = { ...DEFAULT_CONFIG };
      return this.config as ProjectConfig;
    }
  }

  /**
   * Save configuration
   */
  async save(config: ProjectConfig): Promise<void> {
    try {
      await this.ensureConfigDir();
      await fs.writeFile(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
      this.config = config;
    } catch (error) {
      console.error('Failed to save config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Update configuration (partial update)
   * Use deep merge, specially handle API keys
   */
  async update(updates: Partial<ProjectConfig>): Promise<ProjectConfig> {
    const currentConfig = await this.load();
    const newConfig = this.deepMergeConfig(currentConfig, updates);
    await this.save(newConfig);
    return newConfig;
  }

  /**
   * Get configuration
   * Always reload from file to ensure latest config
   */
  async get(): Promise<ProjectConfig> {
    return this.load(true);
  }

  /**
   * Reset to default configuration
   */
  async reset(): Promise<ProjectConfig> {
    const defaultConfig = { ...DEFAULT_CONFIG };
    await this.save(defaultConfig);
    return defaultConfig;
  }
}
