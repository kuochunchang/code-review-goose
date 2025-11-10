import path from 'path';
import pLimit from 'p-limit';
import type {
  BatchAnalysisOptions,
  BatchAnalysisResult,
  BatchProgress,
  FileAnalysisResult,
} from '../types/batch.js';
import { AIService } from './aiService.js';
import { FileService } from './fileService.js';
import { ProjectService } from './projectService.js';
import { CacheService } from './cacheService.js';
import { ReviewService } from './reviewService.js';
import type { FileNode } from './projectService.js';

export class BatchAnalysisService {
  private projectPath: string;
  private aiService: AIService;
  private fileService: FileService;
  private projectService: ProjectService;
  private cacheService: CacheService;
  private reviewService: ReviewService;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.aiService = new AIService(projectPath);
    this.fileService = new FileService(projectPath);
    this.projectService = new ProjectService(projectPath);
    this.cacheService = new CacheService(projectPath);
    this.reviewService = new ReviewService(projectPath);
  }

  /**
   * Analyze entire project with batch processing
   */
  async analyzeProject(options: BatchAnalysisOptions = {}): Promise<BatchAnalysisResult> {
    const startTime = Date.now();

    // Check if AI is configured
    const isConfigured = await this.aiService.isConfigured();
    if (!isConfigured) {
      throw new Error('AI provider not configured. Please configure API key first.');
    }

    // Get all files in project
    const fileTree = await this.projectService.getFileTree();
    let allFiles = this.flattenFileTree(fileTree);

    // Filter by directories if specified
    if (options.directories && options.directories.length > 0) {
      allFiles = this.filterByDirectories(allFiles, options.directories);
    }

    // Filter to only analyzable files
    const analyzableFiles = await this.filterAnalyzableFiles(allFiles, options.extensions);

    const totalFiles = allFiles.length;
    const analyzableCount = analyzableFiles.length;

    // Initialize progress
    const progress: BatchProgress = {
      currentFile: '',
      analyzed: 0,
      skipped: 0,
      errors: 0,
      total: analyzableCount,
      status: 'Starting batch analysis...',
    };

    // Report initial progress
    if (options.onProgress) {
      options.onProgress(progress);
    }

    // Analyze files with concurrency control
    const concurrency = options.concurrency || 1;
    const limit = pLimit(concurrency);
    const results: FileAnalysisResult[] = [];

    const analysisPromises = analyzableFiles.map((filePath) =>
      limit(async () => {
        progress.currentFile = filePath;
        progress.status = `Analyzing ${filePath}...`;

        if (options.onProgress) {
          options.onProgress({ ...progress });
        }

        const result = await this.analyzeFile(filePath, options.force || false);

        if (result.analyzed) {
          progress.analyzed++;
        } else if (result.skipReason) {
          progress.skipped++;
        }

        if (result.error) {
          progress.errors++;
        }

        if (options.onProgress) {
          options.onProgress({ ...progress });
        }

        return result;
      })
    );

    // Wait for all analyses to complete
    results.push(...(await Promise.all(analysisPromises)));

    // Calculate summary statistics
    const summary = this.calculateSummary(results);

    const totalDuration = Date.now() - startTime;

    progress.status = 'Batch analysis completed';
    if (options.onProgress) {
      options.onProgress(progress);
    }

    return {
      totalFiles,
      analyzableFiles: analyzableCount,
      analyzedCount: progress.analyzed,
      skippedCount: progress.skipped,
      errorCount: progress.errors,
      results,
      totalDuration,
      summary,
    };
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(
    filePath: string,
    force: boolean
  ): Promise<FileAnalysisResult> {
    const startTime = Date.now();

    try {
      // Read file content
      const content = await this.fileService.readFile(filePath);

      const analysisOptions = {
        filePath,
        language: this.getLanguageFromPath(filePath),
      };

      // Check if file needs analysis (check cache first)
      if (!force) {
        const cached = await this.cacheService.get(content, analysisOptions);

        if (cached) {
          const duration = Date.now() - startTime;
          return {
            filePath,
            analyzed: false,
            skipReason: 'Already cached (file not modified)',
            duration,
          };
        }
      }

      // Analyze the file
      const analysis = await this.aiService.analyzeCode(content, analysisOptions);

      // Save to cache (for fast access when opening files in UI)
      await this.cacheService.set(content, analysisOptions, analysis);

      // Save to reviews (for UI to display in Reviews page)
      await this.reviewService.createOrUpdate({
        filePath,
        analysis,
      });

      const duration = Date.now() - startTime;

      return {
        filePath,
        analyzed: true,
        analysis,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        filePath,
        analyzed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  /**
   * Flatten file tree to get list of all file paths
   */
  private flattenFileTree(node: FileNode, result: string[] = []): string[] {
    if (node.type === 'file') {
      if (node.path) {
        result.push(node.path);
      }
    } else if (node.children) {
      for (const child of node.children) {
        this.flattenFileTree(child, result);
      }
    }

    return result;
  }

  /**
   * Filter files by specified directories
   */
  private filterByDirectories(files: string[], directories: string[]): string[] {
    return files.filter((file) => {
      // Normalize the file path (remove leading ./ or /)
      const normalizedFile = file.replace(/^\.?\//, '');

      // Check if file is in any of the specified directories
      return directories.some((dir) => {
        // Normalize the directory path
        const normalizedDir = dir.replace(/^\.?\//, '').replace(/\/$/, '');

        // Check if file starts with this directory
        return normalizedFile === normalizedDir ||
               normalizedFile.startsWith(normalizedDir + '/');
      });
    });
  }

  /**
   * Filter files to only analyzable ones
   */
  private async filterAnalyzableFiles(
    files: string[],
    extensions?: string[]
  ): Promise<string[]> {
    const analyzable: string[] = [];

    for (const file of files) {
      // If extensions provided, check against them
      if (extensions && extensions.length > 0) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          analyzable.push(file);
        }
        continue;
      }

      // Otherwise, use AI service to check
      const isAnalyzable = await this.aiService.isFileAnalyzable(file);
      if (isAnalyzable) {
        analyzable.push(file);
      }
    }

    return analyzable;
  }

  /**
   * Calculate summary statistics from results
   */
  private calculateSummary(results: FileAnalysisResult[]): {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    infoIssues: number;
  } {
    const summary = {
      totalIssues: 0,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      infoIssues: 0,
    };

    for (const result of results) {
      if (result.analysis) {
        for (const issue of result.analysis.issues) {
          summary.totalIssues++;

          switch (issue.severity) {
            case 'critical':
              summary.criticalIssues++;
              break;
            case 'high':
              summary.highIssues++;
              break;
            case 'medium':
              summary.mediumIssues++;
              break;
            case 'low':
              summary.lowIssues++;
              break;
            case 'info':
              summary.infoIssues++;
              break;
          }
        }
      }
    }

    return summary;
  }

  /**
   * Get programming language from file path
   */
  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.m': 'objectivec',
      '.sh': 'bash',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.vue': 'vue',
    };

    return languageMap[ext] || 'unknown';
  }
}
