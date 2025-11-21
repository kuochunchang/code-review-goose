/**
 * Git Analysis Service
 * Integrates git-analyzer package for VS Code extension
 */

import {
  AnalysisMode,
  AnalysisOrchestrator,
  ChangeAnalyzer,
  MergeService,
  ReportExporter,
  SonarQubeService,
  type AnalysisType,
  type ChangeAnalysisResult,
  type ExportFormat,
  type ExportOptions,
  type IAIProvider,
  type MergedAnalysisResult,
  type GitFileChange,
} from '@code-review-goose/git-analyzer';
import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import { getAIProvider } from './providers/provider-factory.js';
import { SonarQubeConfigService } from './sonarqube-config-service.js';

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
  private readonly changeAnalyzer: ChangeAnalyzer | null = null;
  private readonly mergeService: MergeService;
  private readonly reportExporter: ReportExporter;
  private aiProvider: IAIProvider | null = null;
  private readonly sonarQubeConfigService: SonarQubeConfigService;
  private orchestrator: AnalysisOrchestrator | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.mergeService = new MergeService();
    this.reportExporter = new ReportExporter();
    this.sonarQubeConfigService = new SonarQubeConfigService(context);
  }

  /**
   * Initialize the service with AI provider and SonarQube (if configured)
   */
  async initialize(): Promise<void> {
    try {
      // Check if we're in sonarqube-only mode
      const analysisMode = this.sonarQubeConfigService.getAnalysisMode();
      const isSonarQubeOnly = analysisMode === 'sonarqube-only';

      // Only initialize AI provider if not in sonarqube-only mode
      if (!isSonarQubeOnly) {
        try {
          this.aiProvider = await getAIProvider(this.context);
        } catch (error) {
          // If AI provider initialization fails and we're not in sonarqube-only mode,
          // log the error but continue (might fall back to sonarqube-only)
          console.warn('Failed to initialize AI provider:', error);
          this.aiProvider = null;
        }
      }

      // Initialize SonarQube orchestrator if enabled and configured
      if (this.sonarQubeConfigService.isEnabled()) {
        await this.initializeSonarQube();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Git Analysis Service: ${errorMessage}`);
    }
  }

  /**
   * Initialize SonarQube orchestrator
   */
  private async initializeSonarQube(): Promise<void> {
    const sqConfig = await this.sonarQubeConfigService.getSonarQubeConfig();
    const aiProviderAvailable = this.aiProvider !== null;

    if (sqConfig) {
      const sonarQubeService = new SonarQubeService(sqConfig);
      this.orchestrator = new AnalysisOrchestrator(sonarQubeService, aiProviderAvailable);

      // Detect mode (will test connection and set up graceful degradation)
      try {
        await this.orchestrator.detectMode();
      } catch (error) {
        // If detectMode fails (e.g., no providers available), log warning but continue
        console.warn('Failed to detect analysis mode:', error);
        // Create a minimal orchestrator that will skip analysis
        this.orchestrator = new AnalysisOrchestrator(undefined, false);
      }
    } else if (aiProviderAvailable) {
      // No SonarQube config - Create orchestrator with AI-only mode
      this.orchestrator = new AnalysisOrchestrator(undefined, true);
      await this.orchestrator.detectMode();
    } else {
      // No SonarQube config and no AI provider - create empty orchestrator
      this.orchestrator = new AnalysisOrchestrator(undefined, false);
    }
  }

  /**
   * Analyze working directory changes
   */
  async analyzeWorkingDirectory(
    config: GitAnalysisConfig,
    progress?: ProgressCallback
  ): Promise<MergedAnalysisResult> {
    try {
      progress?.('Detecting analysis mode...', 5);

      // Ensure orchestrator is initialized
      if (!this.orchestrator) {
        await this.initializeSonarQube();
      }

      const mode = this.orchestrator?.getMode();
      const analysisMode = this.sonarQubeConfigService.getAnalysisMode();
      
      // Determine actual analysis mode based on preference and availability
      let actualMode: AnalysisMode | 'ai-only' = AnalysisMode.AI_ONLY;
      if (mode) {
        if (analysisMode === 'hybrid' && mode === AnalysisMode.HYBRID) {
          actualMode = AnalysisMode.HYBRID;
        } else if (analysisMode === 'sonarqube-only' && mode === AnalysisMode.SONARQUBE_ONLY) {
          actualMode = AnalysisMode.SONARQUBE_ONLY;
        } else if (analysisMode === 'ai-only') {
          actualMode = AnalysisMode.AI_ONLY;
        } else {
          actualMode = mode; // Use detected mode
        }
      }

      progress?.('Checking working directory changes...', 10);

      // Log analysis mode for debugging
      console.log(`[Git Analysis] Detected mode: ${mode}, User preference: ${analysisMode}, Actual mode: ${actualMode}`);
      console.log(`[Git Analysis] AI Provider available: ${this.aiProvider !== null}`);
      console.log(`[Git Analysis] SonarQube available: ${this.orchestrator?.isSonarQubeAvailable()}`);

      // Check if user requested sonarqube-only but SonarQube is not available
      if (analysisMode === 'sonarqube-only' && !this.orchestrator?.isSonarQubeAvailable()) {
        throw new Error(
          'SonarQube-only mode selected but SonarQube is not available. ' +
          'Please configure SonarQube connection first using "Goose: Add SonarQube Connection" command, ' +
          'or choose a different analysis mode (ai-only or hybrid).'
        );
      }

      // Perform AI analysis (if needed and AI provider is available)
      let aiResult: ChangeAnalysisResult | undefined;
      if ((actualMode === AnalysisMode.HYBRID || actualMode === AnalysisMode.AI_ONLY) && this.aiProvider) {
        progress?.('Analyzing changes with AI...', 30);

        // Create analyzer for this repo with AI provider
        const analyzer = new ChangeAnalyzer({
          aiProvider: this.aiProvider,
          repoPath: config.workingDirectory,
          maxParallelRequests: config.maxConcurrency || 3,
        });

        aiResult = await analyzer.analyzeWorkingDirectory({
          checkQuality: config.analysisTypes.includes('quality'),
          checkSecurity: config.analysisTypes.includes('security'),
          checkArchitecture: config.analysisTypes.includes('architecture'),
        });
      } else if ((actualMode === AnalysisMode.HYBRID || actualMode === AnalysisMode.AI_ONLY) && !this.aiProvider) {
        // AI mode requested but AI provider not available
        progress?.('AI provider not available, skipping AI analysis...', 30);
      }

      // Perform SonarQube analysis (if needed and available)
      let sonarQubeResult = undefined;
      if (
        (actualMode === AnalysisMode.HYBRID || actualMode === AnalysisMode.SONARQUBE_ONLY) &&
        this.orchestrator?.isSonarQubeAvailable()
      ) {
        progress?.('Analyzing with SonarQube...', 50);
        try {
          const sqConfig = await this.sonarQubeConfigService.getSonarQubeConfig();
          if (sqConfig) {
            const sqService = new SonarQubeService(sqConfig);
            
            // Get changed files for SonarQube analysis
            const { GitService } = await import('@code-review-goose/git-analyzer');
            const gitService = new GitService(config.workingDirectory);
            const changes = await gitService.getWorkingDirectoryChanges();
            const changedFilePaths = changes.files.map((f: GitFileChange) => f.path);

            console.log(`[Git Analysis] Found ${changedFilePaths.length} changed files for SonarQube analysis`);

            // Log to output channel as well
            const workingDirOutputChannel = (global as any).gooseOutputChannel;
            if (workingDirOutputChannel) {
              workingDirOutputChannel.appendLine(`[SonarQube] Found ${changedFilePaths.length} changed files`);
            }

            if (changedFilePaths.length > 0) {
              console.log(`[Git Analysis] Changed files:`, changedFilePaths.slice(0, 5).join(', ') + (changedFilePaths.length > 5 ? '...' : ''));
              if (workingDirOutputChannel) {
                workingDirOutputChannel.appendLine(`[SonarQube] Changed files: ${changedFilePaths.slice(0, 5).join(', ')}${changedFilePaths.length > 5 ? ` ... and ${changedFilePaths.length - 5} more` : ''}`);
              }
              // Execute SonarQube scan
              progress?.('Running SonarQube scanner...', 55);
              const scanResult = await sqService.executeScan({
                workingDirectory: config.workingDirectory,
              });

              if (!scanResult.success) {
                throw new Error(`SonarQube scan failed: ${scanResult.error}`);
              }

              // Wait for SonarQube server to complete analysis
              progress?.('Waiting for SonarQube to process results...', 60);
              if (scanResult.taskId) {
                console.log(`[Git Analysis] Waiting for SonarQube task ${scanResult.taskId} to complete...`);
                if (workingDirOutputChannel) {
                  workingDirOutputChannel.appendLine(`[SonarQube] Waiting for analysis task ${scanResult.taskId} to complete...`);
                }
                await sqService.waitForAnalysis(scanResult.taskId, 300000); // 5 minutes timeout
                console.log(`[Git Analysis] SonarQube analysis completed`);
                if (workingDirOutputChannel) {
                  workingDirOutputChannel.appendLine(`[SonarQube] Analysis completed`);
                }
              } else {
                console.warn('[Git Analysis] No taskId returned from SonarQube scan, waiting 5s as fallback');
                await new Promise(resolve => setTimeout(resolve, 5000));
              }

              // Get analysis results for changed files
              progress?.('Fetching SonarQube results...', 65);
              sonarQubeResult = await this.getSonarQubeResultsForChangedFiles(
                sqConfig,
                changedFilePaths
              );

              // Log results
              if (workingDirOutputChannel) {
                const totalIssues = sonarQubeResult?.issues?.length || 0;
                workingDirOutputChannel.appendLine(`[SonarQube] Found ${totalIssues} issue(s) in changed files`);
                if (totalIssues === 0) {
                  workingDirOutputChannel.appendLine(`[SonarQube] No issues found. This could mean:`);
                  workingDirOutputChannel.appendLine(`  - Your code has no issues (great!)`);
                  workingDirOutputChannel.appendLine(`  - SonarQube rules are not configured for these file types`);
                  workingDirOutputChannel.appendLine(`  - The scan needs more time to process`);
                }
              }
            } else {
              if (workingDirOutputChannel) {
                workingDirOutputChannel.appendLine(`[SonarQube] No changed files to analyze`);
              }
            }
          }
        } catch (error) {
          // SonarQube failed, but continue with AI-only
          const errorMessage = error instanceof Error ? error.message : String(error);
          progress?.(`SonarQube analysis failed: ${errorMessage}. Continuing with AI-only...`, 50);
        }
      }

      progress?.('Merging analysis results...', 80);

      // Merge results
      // If no AI result, create empty one (for SonarQube-only mode)
      const aiAnalysisResult = aiResult
        ? {
            fileAnalyses: aiResult.fileAnalyses,
            impactAnalysis: aiResult.impactAnalysis,
          }
        : {
            fileAnalyses: [],
            impactAnalysis: {
              riskLevel: 'low' as const,
              affectedModules: [],
              breakingChanges: [],
              testingRecommendations: [],
              deploymentRisks: [],
              qualityScore: 100,
            },
          };

      const baseResult = aiResult || {
        changeType: 'working-directory' as const,
        summary: { filesChanged: 0, insertions: 0, deletions: 0 },
        fileAnalyses: [],
        impactAnalysis: aiAnalysisResult.impactAnalysis,
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      const mergedResult = this.mergeService.merge(
        aiAnalysisResult,
        sonarQubeResult,
        baseResult
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
    try {
      progress?.('Detecting analysis mode...', 5);

      // Ensure orchestrator is initialized
      if (!this.orchestrator) {
        await this.initializeSonarQube();
      }

      const mode = this.orchestrator?.getMode();
      const analysisMode = this.sonarQubeConfigService.getAnalysisMode();
      
      // Determine actual analysis mode
      let actualMode: AnalysisMode | 'ai-only' = AnalysisMode.AI_ONLY;
      if (mode) {
        if (analysisMode === 'hybrid' && mode === AnalysisMode.HYBRID) {
          actualMode = AnalysisMode.HYBRID;
        } else if (analysisMode === 'sonarqube-only' && mode === AnalysisMode.SONARQUBE_ONLY) {
          actualMode = AnalysisMode.SONARQUBE_ONLY;
        } else if (analysisMode === 'ai-only') {
          actualMode = AnalysisMode.AI_ONLY;
        } else {
          actualMode = mode;
        }
      }

      progress?.('Comparing branches...', 10);

      // Check if user requested sonarqube-only but SonarQube is not available
      if (analysisMode === 'sonarqube-only' && !this.orchestrator?.isSonarQubeAvailable()) {
        throw new Error(
          'SonarQube-only mode selected but SonarQube is not available. ' +
          'Please configure SonarQube connection first using "Goose: Add SonarQube Connection" command, ' +
          'or choose a different analysis mode (ai-only or hybrid).'
        );
      }

      // Perform AI analysis (if needed and AI provider is available)
      let aiResult: ChangeAnalysisResult | undefined;
      if ((actualMode === AnalysisMode.HYBRID || actualMode === AnalysisMode.AI_ONLY) && this.aiProvider) {
        progress?.('Analyzing changes with AI...', 30);

        // Create analyzer for this repo with AI provider
        const analyzer = new ChangeAnalyzer({
          aiProvider: this.aiProvider,
          repoPath: config.workingDirectory,
          maxParallelRequests: config.maxConcurrency || 3,
        });

        aiResult = await analyzer.analyzeBranchComparison(
          config.sourceBranch,
          config.targetBranch,
          {
            checkQuality: config.analysisTypes.includes('quality'),
            checkSecurity: config.analysisTypes.includes('security'),
            checkArchitecture: config.analysisTypes.includes('architecture'),
          }
        );
      } else if ((actualMode === AnalysisMode.HYBRID || actualMode === AnalysisMode.AI_ONLY) && !this.aiProvider) {
        // AI mode requested but AI provider not available
        progress?.('AI provider not available, skipping AI analysis...', 30);
      }

      // Perform SonarQube analysis (if needed and available)
      let sonarQubeResult = undefined;
      if (
        (actualMode === AnalysisMode.HYBRID || actualMode === AnalysisMode.SONARQUBE_ONLY) &&
        this.orchestrator?.isSonarQubeAvailable()
      ) {
        progress?.('Analyzing with SonarQube...', 50);
        try {
          const sqConfig = await this.sonarQubeConfigService.getSonarQubeConfig();
          if (sqConfig) {
            const sqService = new SonarQubeService(sqConfig);
            
            // Get changed files for SonarQube analysis
            const { GitService } = await import('@code-review-goose/git-analyzer');
            const gitService = new GitService(config.workingDirectory);
            const changes = await gitService.compareBranches(
              config.targetBranch,
              config.sourceBranch
            );
            const changedFilePaths = changes.files.map((f: GitFileChange) => f.path);

            // Log to output channel as well
            const branchComparisonOutputChannel = (global as any).gooseOutputChannel;
            if (branchComparisonOutputChannel) {
              branchComparisonOutputChannel.appendLine(`[SonarQube] Found ${changedFilePaths.length} changed files`);
            }

            if (changedFilePaths.length > 0) {
              // Execute SonarQube scan
              progress?.('Running SonarQube scanner...', 55);
              const scanResult = await sqService.executeScan({
                workingDirectory: config.workingDirectory,
              });

              if (!scanResult.success) {
                throw new Error(`SonarQube scan failed: ${scanResult.error}`);
              }

              // Wait for SonarQube server to complete analysis
              progress?.('Waiting for SonarQube to process results...', 60);
              if (scanResult.taskId) {
                console.log(`[Git Analysis] Waiting for SonarQube task ${scanResult.taskId} to complete...`);
                if (branchComparisonOutputChannel) {
                  branchComparisonOutputChannel.appendLine(`[SonarQube] Waiting for analysis task ${scanResult.taskId} to complete...`);
                }
                await sqService.waitForAnalysis(scanResult.taskId, 300000); // 5 minutes timeout
                console.log(`[Git Analysis] SonarQube analysis completed`);
                if (branchComparisonOutputChannel) {
                  branchComparisonOutputChannel.appendLine(`[SonarQube] Analysis completed`);
                }
              } else {
                console.warn('[Git Analysis] No taskId returned from SonarQube scan, waiting 5s as fallback');
                await new Promise(resolve => setTimeout(resolve, 5000));
              }

              // Get analysis results for changed files
              progress?.('Fetching SonarQube results...', 65);
              sonarQubeResult = await this.getSonarQubeResultsForChangedFiles(
                sqConfig,
                changedFilePaths
              );

              // Log results
              if (branchComparisonOutputChannel) {
                const totalIssues = sonarQubeResult?.issues?.length || 0;
                branchComparisonOutputChannel.appendLine(`[SonarQube] Found ${totalIssues} issue(s) in changed files`);
                if (totalIssues === 0) {
                  branchComparisonOutputChannel.appendLine(`[SonarQube] No issues found. This could mean:`);
                  branchComparisonOutputChannel.appendLine(`  - Your code has no issues (great!)`);
                  branchComparisonOutputChannel.appendLine(`  - SonarQube rules are not configured for these file types`);
                  branchComparisonOutputChannel.appendLine(`  - The scan needs more time to process`);
                }
              }
            } else {
              if (branchComparisonOutputChannel) {
                branchComparisonOutputChannel.appendLine(`[SonarQube] No changed files to analyze`);
              }
            }
          }
        } catch (error) {
          // SonarQube failed, but continue with AI-only
          const errorMessage = error instanceof Error ? error.message : String(error);
          progress?.(`SonarQube analysis failed: ${errorMessage}. Continuing with AI-only...`, 50);
        }
      }

      progress?.('Merging analysis results...', 80);

      // Merge results
      // If no AI result, create empty one (for SonarQube-only mode)
      const aiAnalysisResult = aiResult
        ? {
            fileAnalyses: aiResult.fileAnalyses,
            impactAnalysis: aiResult.impactAnalysis,
          }
        : {
            fileAnalyses: [],
            impactAnalysis: {
              riskLevel: 'low' as const,
              affectedModules: [],
              breakingChanges: [],
              testingRecommendations: [],
              deploymentRisks: [],
              qualityScore: 100,
            },
          };

      const baseResult = aiResult || {
        changeType: 'branch-comparison' as const,
        summary: { filesChanged: 0, insertions: 0, deletions: 0 },
        fileAnalyses: [],
        impactAnalysis: aiAnalysisResult.impactAnalysis,
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      const mergedResult = this.mergeService.merge(
        aiAnalysisResult,
        sonarQubeResult,
        baseResult
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
   * Get SonarQube results for changed files only
   */
  private async getSonarQubeResultsForChangedFiles(
    sqConfig: any,
    changedFilePaths: string[]
  ): Promise<any> {
    // Note: sqService is created but not used directly; we make direct API calls instead
    // This is intentional as we need more granular control over the API requests

    // Build component keys for SonarQube API (format: projectKey:filePath)
    const componentKeys = changedFilePaths.map(
      (filePath) => `${sqConfig.projectKey}:${filePath}`
    );

    // Fetch issues for changed files only
    const url = new URL(`${sqConfig.serverUrl}/api/issues/search`);
    url.searchParams.set('componentKeys', componentKeys.join(','));
    url.searchParams.set('resolved', 'false');
    url.searchParams.set('ps', '500'); // Page size

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: sqConfig.token ? `Bearer ${sqConfig.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch SonarQube issues: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { issues: any[] };
    const issues = data.issues || [];

    // Get project metrics (for overall context)
    const metricsUrl = new URL(`${sqConfig.serverUrl}/api/measures/component`);
    metricsUrl.searchParams.set('component', sqConfig.projectKey);
    metricsUrl.searchParams.set(
      'metricKeys',
      'bugs,vulnerabilities,code_smells,security_hotspots,sqale_debt_ratio,coverage,ncloc,duplicated_lines_density'
    );

    const metricsResponse = await fetch(metricsUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: sqConfig.token ? `Bearer ${sqConfig.token}` : '',
      },
    });

    let metrics = {
      bugs: 0,
      vulnerabilities: 0,
      codeSmells: 0,
      securityHotspots: 0,
      technicalDebtRatio: 0,
      coverage: 0,
      linesOfCode: 0,
      duplicatedLinesDensity: 0,
    };

    if (metricsResponse.ok) {
      const metricsData = (await metricsResponse.json()) as {
        component: {
          measures: Array<{ metric: string; value: string }>;
        };
      };
      const measures = metricsData.component.measures || [];
      const getMetricValue = (key: string): number => {
        const measure = measures.find((m) => m.metric === key);
        return measure ? parseFloat(measure.value) : 0;
      };
      metrics = {
        bugs: getMetricValue('bugs'),
        vulnerabilities: getMetricValue('vulnerabilities'),
        codeSmells: getMetricValue('code_smells'),
        securityHotspots: getMetricValue('security_hotspots'),
        technicalDebtRatio: getMetricValue('sqale_debt_ratio'),
        coverage: getMetricValue('coverage'),
        linesOfCode: getMetricValue('ncloc'),
        duplicatedLinesDensity: getMetricValue('duplicated_lines_density'),
      };
    }

    // Get quality gate
    const qgUrl = new URL(`${sqConfig.serverUrl}/api/qualitygates/project_status`);
    qgUrl.searchParams.set('projectKey', sqConfig.projectKey);

    const qgResponse = await fetch(qgUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: sqConfig.token ? `Bearer ${sqConfig.token}` : '',
      },
    });

    let qualityGate: {
      status: string;
      conditions?: Array<{
        metric: string;
        operator: string;
        value: string;
        status: string;
        errorThreshold?: string;
      }>;
    } = {
      status: 'OK',
      conditions: [],
    };

    if (qgResponse.ok) {
      const qgData = (await qgResponse.json()) as {
        projectStatus: {
          status: string;
          conditions?: Array<{
            metricKey: string;
            comparator: string;
            actualValue: string;
            status: string;
            errorThreshold?: string;
          }>;
        };
      };
      qualityGate = {
        status: qgData.projectStatus.status.toUpperCase(),
        conditions:
          qgData.projectStatus.conditions?.map((c) => ({
            metric: c.metricKey,
            operator: c.comparator,
            value: c.actualValue,
            status: c.status.toUpperCase(),
            errorThreshold: c.errorThreshold,
          })) || [],
      };
    }

    // Aggregate issues by severity and type
    const issuesBySeverity: Record<string, number> = {
      BLOCKER: 0,
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      INFO: 0,
    };
    const issuesByType: Record<string, number> = {
      BUG: 0,
      VULNERABILITY: 0,
      CODE_SMELL: 0,
      SECURITY_HOTSPOT: 0,
    };

    for (const issue of issues) {
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    }

    return {
      projectKey: sqConfig.projectKey,
      analysisDate: new Date().toISOString(),
      issues,
      metrics,
      qualityGate,
      issuesBySeverity,
      issuesByType,
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Clean up if needed
  }
}
