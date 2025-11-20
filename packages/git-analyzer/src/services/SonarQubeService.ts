/**
 * SonarQubeService
 *
 * Service for integrating with SonarQube server for static code analysis.
 * Provides scanning, issue retrieval, quality gate checks, and metrics collection.
 */

import scanner from 'sonarqube-scanner';
import {
  SonarQubeMode,
  SonarQubeSeverity,
  SonarQubeIssueType,
  type SonarQubeConfig,
  type SonarQubeConnectionTest,
  type ScannerExecutionOptions,
  type ScannerExecutionResult,
  type SonarQubeAnalysisResult,
  type SonarQubeIssue,
  type SonarQubeMetrics,
  type QualityGateResult,
  type QualityGateStatus,
} from '../types/sonarqube.types.js';

/**
 * Service for SonarQube integration
 */
export class SonarQubeService {
  private config: SonarQubeConfig;
  private mode: SonarQubeMode;

  constructor(config: SonarQubeConfig) {
    this.config = config;
    this.mode = SonarQubeMode.DISABLED; // Default to disabled until connection is verified
  }

  /**
   * Test connection to SonarQube server
   * @returns Connection test result
   */
  async testConnection(): Promise<SonarQubeConnectionTest> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.serverUrl}/api/system/status`, {
        method: 'GET',
        headers: {
          Authorization: this.config.token ? `Bearer ${this.config.token}` : '',
        },
        signal: AbortSignal.timeout(this.config.timeout || 3000),
      });

      const responseTime = this.getElapsedTime(startTime);

      if (!response.ok) {
        return {
          success: false,
          error: `Server returned status ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }

      const data = (await response.json()) as { status: string; version?: string };

      if (data.status === 'UP') {
        this.mode = SonarQubeMode.SERVER;
        return {
          success: true,
          version: data.version,
          responseTime,
        };
      }

      return {
        success: false,
        error: `Server status is ${data.status}`,
        responseTime,
      };
    } catch (error) {
      const responseTime = this.getElapsedTime(startTime);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      };
    }
  }

  /**
   * Get current operation mode
   * @returns Current SonarQube mode
   */
  getMode(): SonarQubeMode {
    return this.mode;
  }

  /**
   * Check if SonarQube is available
   * @returns True if server mode is active
   */
  isAvailable(): boolean {
    return this.mode === SonarQubeMode.SERVER;
  }

  /**
   * Execute SonarQube scanner
   * @param _options Scanner execution options
   * @returns Scanner execution result
   */
  async executeScan(_options: ScannerExecutionOptions): Promise<ScannerExecutionResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'SonarQube server is not available',
        executionTime: 0,
      };
    }

    const startTime = Date.now();

    try {
      const scannerConfig = {
        serverUrl: this.config.serverUrl,
        token: this.config.token || '',
        options: {
          'sonar.projectKey': this.config.projectKey,
          'sonar.projectName': this.config.projectName || this.config.projectKey,
          'sonar.projectVersion': this.config.projectVersion || '1.0',
          'sonar.sources': this.config.sources || '.',
          'sonar.exclusions': this.config.exclusions || 'node_modules/**,dist/**,build/**,coverage/**',
          'sonar.sourceEncoding': this.config.sourceEncoding || 'UTF-8',
          ...this.config.additionalProperties,
        },
      };

      return await new Promise<ScannerExecutionResult>((resolve, reject) => {
        scanner(
          scannerConfig,
          (error?: unknown) => {
            const executionTime = this.getElapsedTime(startTime);
            
            if (error) {
              // Error callback
              resolve({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                executionTime,
              });
            } else {
              // Success callback
              resolve({
                success: true,
                executionTime,
              });
            }
          }
        );
      });
    } catch (error) {
      const executionTime = this.getElapsedTime(startTime);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during scan',
        executionTime,
      };
    }
  }

  /**
   * Calculate elapsed time ensuring a minimum of 1ms when an operation completes synchronously.
   */
  private getElapsedTime(startTime: number): number {
    const elapsed = Date.now() - startTime;
    return elapsed > 0 ? elapsed : 1;
  }

  /**
   * Get analysis results from SonarQube server
   * @param projectKey Project key to retrieve results for
   * @returns Analysis result with issues, metrics, and quality gate
   */
  async getAnalysisResult(projectKey: string): Promise<SonarQubeAnalysisResult> {
    if (!this.isAvailable()) {
      throw new Error('SonarQube server is not available');
    }

    // Fetch issues, metrics, and quality gate in parallel
    const [issues, metrics, qualityGate] = await Promise.all([
      this.getIssues(projectKey),
      this.getMetrics(projectKey),
      this.getQualityGate(projectKey),
    ]);

    // Aggregate issues by severity and type
    const issuesBySeverity = this.aggregateIssuesBySeverity(issues);
    const issuesByType = this.aggregateIssuesByType(issues);

    return {
      projectKey,
      analysisDate: new Date().toISOString(),
      issues,
      metrics,
      qualityGate,
      issuesBySeverity,
      issuesByType,
    };
  }

  /**
   * Get issues for a project
   * @param projectKey Project key
   * @returns Array of SonarQube issues
   */
  private async getIssues(projectKey: string): Promise<SonarQubeIssue[]> {
    const url = new URL(`${this.config.serverUrl}/api/issues/search`);
    url.searchParams.set('componentKeys', projectKey);
    url.searchParams.set('resolved', 'false');
    url.searchParams.set('ps', '500'); // Page size

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: this.config.token ? `Bearer ${this.config.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { issues: SonarQubeIssue[] };
    return data.issues || [];
  }

  /**
   * Get metrics for a project
   * @param projectKey Project key
   * @returns Project metrics
   */
  private async getMetrics(projectKey: string): Promise<SonarQubeMetrics> {
    const metricKeys = [
      'bugs',
      'vulnerabilities',
      'code_smells',
      'security_hotspots',
      'sqale_debt_ratio',
      'coverage',
      'ncloc',
      'duplicated_lines_density',
    ];

    const url = new URL(`${this.config.serverUrl}/api/measures/component`);
    url.searchParams.set('component', projectKey);
    url.searchParams.set('metricKeys', metricKeys.join(','));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: this.config.token ? `Bearer ${this.config.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      component: {
        measures: Array<{ metric: string; value: string }>;
      };
    };

    const measures = data.component.measures || [];
    const getMetricValue = (key: string): number => {
      const measure = measures.find((m) => m.metric === key);
      return measure ? parseFloat(measure.value) : 0;
    };

    return {
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

  /**
   * Get quality gate status for a project
   * @param projectKey Project key
   * @returns Quality gate result
   */
  private async getQualityGate(projectKey: string): Promise<QualityGateResult> {
    const url = new URL(`${this.config.serverUrl}/api/qualitygates/project_status`);
    url.searchParams.set('projectKey', projectKey);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: this.config.token ? `Bearer ${this.config.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quality gate: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
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

    const status = data.projectStatus.status.toUpperCase() as QualityGateStatus;
    const conditions = data.projectStatus.conditions?.map((c) => ({
      metric: c.metricKey,
      operator: c.comparator,
      value: c.actualValue,
      status: c.status.toUpperCase() as QualityGateStatus,
      errorThreshold: c.errorThreshold,
    }));

    return {
      status,
      conditions,
    };
  }

  /**
   * Aggregate issues by severity
   * @param issues Array of issues
   * @returns Count by severity
   */
  private aggregateIssuesBySeverity(
    issues: SonarQubeIssue[],
  ): Record<SonarQubeSeverity, number> {
    const result: Record<SonarQubeSeverity, number> = {
      [SonarQubeSeverity.BLOCKER]: 0,
      [SonarQubeSeverity.CRITICAL]: 0,
      [SonarQubeSeverity.MAJOR]: 0,
      [SonarQubeSeverity.MINOR]: 0,
      [SonarQubeSeverity.INFO]: 0,
    };

    for (const issue of issues) {
      result[issue.severity]++;
    }

    return result;
  }

  /**
   * Aggregate issues by type
   * @param issues Array of issues
   * @returns Count by type
   */
  private aggregateIssuesByType(issues: SonarQubeIssue[]): Record<SonarQubeIssueType, number> {
    const result: Record<SonarQubeIssueType, number> = {
      [SonarQubeIssueType.BUG]: 0,
      [SonarQubeIssueType.VULNERABILITY]: 0,
      [SonarQubeIssueType.CODE_SMELL]: 0,
      [SonarQubeIssueType.SECURITY_HOTSPOT]: 0,
    };

    for (const issue of issues) {
      result[issue.type]++;
    }

    return result;
  }

  /**
   * Wait for analysis to complete on server
   * @param taskId Task ID from scanner execution
   * @param timeout Timeout in milliseconds
   * @returns True if analysis completed successfully
   */
  async waitForAnalysis(taskId: string, timeout: number = 300000): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('SonarQube server is not available');
    }

    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < timeout) {
      const url = new URL(`${this.config.serverUrl}/api/ce/task`);
      url.searchParams.set('id', taskId);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: this.config.token ? `Bearer ${this.config.token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check task status: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        task: {
          status: string;
          errorMessage?: string;
        };
      };

      if (data.task.status === 'SUCCESS') {
        return true;
      }

      if (data.task.status === 'FAILED' || data.task.status === 'CANCELED') {
        throw new Error(`Analysis failed: ${data.task.errorMessage || data.task.status}`);
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Analysis timeout: Task did not complete within the specified time');
  }
}
