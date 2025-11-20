/**
 * Git Analysis Service
 * Integrates git-analyzer package for VS Code extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import {
  ChangeAnalyzer,
  MergeService,
  ReportExporter,
  type ChangeAnalyzerConfig,
  type IAIProvider,
  type AnalysisType,
  type MergedAnalysisResult,
  type ExportFormat,
  type ExportOptions,
  type ChangeAnalysisResult,
} from '@code-review-goose/git-analyzer';
import { getAIProvider as getProviderFactory } from './providers/provider-factory.js';

/**
 * Git analysis configuration
 */
export interface GitAnalysisConfig {
  /** Analysis types to perform */
  analysisTypes: AnalysisType[];
  /** Working directory path */
  workingDirectory: string;
  /** Maximum concurrent AI requests */
  maxConcurrency?: number;
}

/**
 * Branch comparison configuration
 */
export interface BranchComparisonConfig extends GitAnalysisConfig {
  /** Source branch name */
  sourceBranch: string;
  /** Target branch name */
  targetBranch: string;
}

/**
 * Analysis progress callback
 */
export type ProgressCallback = (message: string, increment?: number) => void;

/**
 * Git Analysis Service for VS Code
 * Provides high-level API for Git change analysis
 */
export class GitAnalysisService {
  private changeAnalyzer: ChangeAnalyzer | null = null;
  private mergeService: MergeService;
  private reportExporter: ReportExporter;
  private aiProvider: IAIProvider | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.mergeService = new MergeService();
    this.reportExporter = new ReportExporter();
  }

  /**
   * Initialize the service with AI provider
   */
  async initialize(): Promise<void> {
    try {
      this.aiProvider = await getProviderFactory();
      // ChangeAnalyzer will be created per-analysis with specific repo path
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Git Analysis Service: ${errorMessage}`);
    }
  }

  /**
   * Analyze working directory changes
   */
  async analyzeWorkingDirectory(
    config: GitAnalysisConfig,
    progress?: ProgressCallback
  ): Promise<MergedAnalysisResult> {
    if (!this.aiProvider) {
      throw new Error('Git Analysis Service not initialized. Call initialize() first.');
    }

    try {
      progress?.('Checking working directory changes...', 10);

      // Create analyzer for this repo
      const analyzer = new ChangeAnalyzer({
        aiProvider: this.aiProvider,
        repoPath: config.workingDirectory,
        maxParallelRequests: config.maxConcurrency || 3,
      });

      progress?.('Analyzing changes with AI...', 30);

      // Perform analysis
      const analysisResult = await analyzer.analyzeWorkingDirectory({
        checkQuality: config.analysisTypes.includes('quality'),
        checkSecurity: config.analysisTypes.includes('security'),
        checkArchitecture: config.analysisTypes.includes('architecture'),
      });

      progress?.('Merging analysis results...', 80);

      // Merge results (AI-only, no SonarQube in Phase 5)
      const mergedResult = this.mergeService.merge(
        {
          fileAnalyses: analysisResult.fileAnalyses,
          impactAnalysis: analysisResult.impactAnalysis,
        },
        undefined,
        analysisResult
      );

      progress?.('Analysis complete!', 100);

      return mergedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Working directory analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze branch comparison
   */
  async analyzeBranchComparison(
    config: BranchComparisonConfig,
    progress?: ProgressCallback
  ): Promise<MergedAnalysisResult> {
    if (!this.aiProvider) {
      throw new Error('Git Analysis Service not initialized. Call initialize() first.');
    }

    try {
      progress?.('Comparing branches...', 10);

      // Create analyzer for this repo
      const analyzer = new ChangeAnalyzer({
        aiProvider: this.aiProvider,
        repoPath: config.workingDirectory,
        maxParallelRequests: config.maxConcurrency || 3,
      });

      progress?.('Analyzing changes with AI...', 30);

      // Perform analysis
      const analysisResult = await analyzer.analyzeBranchComparison(
        config.sourceBranch,
        config.targetBranch,
        {
          checkQuality: config.analysisTypes.includes('quality'),
          checkSecurity: config.analysisTypes.includes('security'),
          checkArchitecture: config.analysisTypes.includes('architecture'),
        }
      );

      progress?.('Merging analysis results...', 80);

      // Merge results
      const mergedResult = this.mergeService.merge(
        {
          fileAnalyses: analysisResult.fileAnalyses,
          impactAnalysis: analysisResult.impactAnalysis,
        },
        undefined,
        analysisResult
      );

      progress?.('Analysis complete!', 100);

      return mergedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Branch comparison analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Export analysis result to file
   */
  async exportResult(
    result: MergedAnalysisResult,
    format: ExportFormat,
    outputPath: string,
    options?: ExportOptions
  ): Promise<void> {
    try {
      const content = this.reportExporter.export(result, format, options);
      await fs.writeFile(outputPath, content, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to export report: ${errorMessage}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(workingDirectory: string): Promise<string> {
    const { GitService } = await import('@code-review-goose/git-analyzer');
    const gitService = new GitService(workingDirectory);
    return gitService.getCurrentBranch();
  }

  /**
   * Check if working directory is clean
   */
  async isWorkingDirectoryClean(workingDirectory: string): Promise<boolean> {
    const { GitService } = await import('@code-review-goose/git-analyzer');
    const gitService = new GitService(workingDirectory);
    return gitService.isClean();
  }

  /**
   * Get repository root path
   */
  async getRepoRoot(workingDirectory: string): Promise<string> {
    const { GitService } = await import('@code-review-goose/git-analyzer');
    const gitService = new GitService(workingDirectory);
    return gitService.getRepoRoot();
  }

  /**
   * Get list of available branches
   */
  async getBranches(workingDirectory: string): Promise<string[]> {
    const { GitService } = await import('@code-review-goose/git-analyzer');
    const gitService = new GitService(workingDirectory);
    const result = await gitService.getBranches();
    return result.all;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Clean up if needed
  }
}
