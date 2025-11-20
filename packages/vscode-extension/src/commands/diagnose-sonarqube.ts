/**
 * Diagnostic command for SonarQube integration
 * Helps troubleshoot issues with SonarQube analysis
 */

import * as vscode from 'vscode';
import { SonarQubeConfigService } from '../services/sonarqube-config-service.js';
import { SonarQubeService } from '@code-review-goose/git-analyzer';
import { GitService } from '@code-review-goose/git-analyzer';
import type { GitFileChange } from '@code-review-goose/git-analyzer';

/**
 * Diagnose SonarQube configuration and connectivity
 */
export async function diagnoseSonarQube(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('Goose: SonarQube Diagnostics');
  outputChannel.show();

  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('SonarQube Diagnostic Report');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('');

  try {
    // 1. Check workspace folder
    outputChannel.appendLine('1. Checking workspace folder...');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      outputChannel.appendLine('   ✗ No workspace folder open');
      return;
    }
    outputChannel.appendLine(`   ✓ Workspace: ${workspaceFolder.uri.fsPath}`);
    outputChannel.appendLine('');

    // 2. Check SonarQube configuration
    outputChannel.appendLine('2. Checking SonarQube configuration...');
    const configService = new SonarQubeConfigService(context);
    const config = await configService.getSonarQubeConfig();

    if (!config) {
      outputChannel.appendLine('   ✗ No SonarQube configuration found');
      outputChannel.appendLine('   → Run "Goose: Add SonarQube Connection" to configure');
      return;
    }

    outputChannel.appendLine(`   ✓ Server URL: ${config.serverUrl}`);
    outputChannel.appendLine(`   ✓ Project Key: ${config.projectKey}`);
    outputChannel.appendLine(`   ✓ Project Name: ${config.projectName || 'Not set'}`);
    outputChannel.appendLine(`   ✓ Analysis Mode: ${configService.getAnalysisMode()}`);
    outputChannel.appendLine('');

    // 3. Test SonarQube connection
    outputChannel.appendLine('3. Testing SonarQube server connection...');
    const sqService = new SonarQubeService(config);
    const connectionTest = await sqService.testConnection();

    if (!connectionTest.success) {
      outputChannel.appendLine(`   ✗ Connection failed: ${connectionTest.error}`);
      return;
    }

    outputChannel.appendLine(`   ✓ Connected successfully`);
    outputChannel.appendLine(`   ✓ Version: ${connectionTest.version || 'Unknown'}`);
    outputChannel.appendLine(`   ✓ Response time: ${connectionTest.responseTime}ms`);
    outputChannel.appendLine('');

    // 4. Check Git repository status
    outputChannel.appendLine('4. Checking Git repository...');
    const gitService = new GitService(workspaceFolder.uri.fsPath);

    try {
      const currentBranch = await gitService.getCurrentBranch();
      outputChannel.appendLine(`   ✓ Current branch: ${currentBranch}`);

      const isClean = await gitService.isClean();
      outputChannel.appendLine(`   ✓ Working directory clean: ${isClean ? 'Yes' : 'No'}`);

      const changes = await gitService.getWorkingDirectoryChanges();
      outputChannel.appendLine(`   ✓ Changed files: ${changes.files.length}`);

      if (changes.files.length > 0) {
        outputChannel.appendLine('   Changed files:');
        changes.files.slice(0, 10).forEach((file: GitFileChange) => {
          outputChannel.appendLine(`     - ${file.path} (${file.status})`);
        });
        if (changes.files.length > 10) {
          outputChannel.appendLine(`     ... and ${changes.files.length - 10} more`);
        }
      } else {
        outputChannel.appendLine('   ℹ No changed files in working directory');
        outputChannel.appendLine('   → Make some changes to files or switch to branch comparison mode');
      }
      outputChannel.appendLine('');
    } catch (error) {
      outputChannel.appendLine(`   ✗ Git error: ${error instanceof Error ? error.message : String(error)}`);
      outputChannel.appendLine('');
    }

    // 5. Test SonarQube scanner
    outputChannel.appendLine('5. Testing SonarQube scanner...');
    outputChannel.appendLine('   (This may take 30-60 seconds)');

    const scanResult = await sqService.executeScan({
      workingDirectory: workspaceFolder.uri.fsPath,
    });

    if (!scanResult.success) {
      outputChannel.appendLine(`   ✗ Scanner failed: ${scanResult.error}`);
      return;
    }

    outputChannel.appendLine(`   ✓ Scanner executed successfully`);
    outputChannel.appendLine(`   ✓ Execution time: ${scanResult.executionTime}ms`);
    outputChannel.appendLine('');

    // 6. Fetch SonarQube issues
    outputChannel.appendLine('6. Fetching SonarQube analysis results...');
    outputChannel.appendLine('   (Waiting 2 seconds for server processing...)');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysisResult = await sqService.getAnalysisResult(config.projectKey);

    outputChannel.appendLine(`   ✓ Analysis date: ${analysisResult.analysisDate}`);
    outputChannel.appendLine(`   ✓ Total issues: ${analysisResult.issues.length}`);
    outputChannel.appendLine('');

    outputChannel.appendLine('   Issues by severity:');
    outputChannel.appendLine(`     - BLOCKER: ${analysisResult.issuesBySeverity.BLOCKER || 0}`);
    outputChannel.appendLine(`     - CRITICAL: ${analysisResult.issuesBySeverity.CRITICAL || 0}`);
    outputChannel.appendLine(`     - MAJOR: ${analysisResult.issuesBySeverity.MAJOR || 0}`);
    outputChannel.appendLine(`     - MINOR: ${analysisResult.issuesBySeverity.MINOR || 0}`);
    outputChannel.appendLine(`     - INFO: ${analysisResult.issuesBySeverity.INFO || 0}`);
    outputChannel.appendLine('');

    outputChannel.appendLine('   Issues by type:');
    outputChannel.appendLine(`     - BUG: ${analysisResult.issuesByType.BUG || 0}`);
    outputChannel.appendLine(`     - VULNERABILITY: ${analysisResult.issuesByType.VULNERABILITY || 0}`);
    outputChannel.appendLine(`     - CODE_SMELL: ${analysisResult.issuesByType.CODE_SMELL || 0}`);
    outputChannel.appendLine(`     - SECURITY_HOTSPOT: ${analysisResult.issuesByType.SECURITY_HOTSPOT || 0}`);
    outputChannel.appendLine('');

    outputChannel.appendLine('   Metrics:');
    outputChannel.appendLine(`     - Lines of code: ${analysisResult.metrics.linesOfCode}`);
    outputChannel.appendLine(`     - Coverage: ${(analysisResult.metrics.coverage ?? 0).toFixed(1)}%`);
    outputChannel.appendLine(`     - Technical debt ratio: ${(analysisResult.metrics.technicalDebtRatio ?? 0).toFixed(1)}%`);
    outputChannel.appendLine(`     - Duplicated lines: ${(analysisResult.metrics.duplicatedLinesDensity ?? 0).toFixed(1)}%`);
    outputChannel.appendLine('');

    outputChannel.appendLine('   Quality Gate:');
    outputChannel.appendLine(`     - Status: ${analysisResult.qualityGate.status}`);
    outputChannel.appendLine('');

    // 7. Sample issues
    if (analysisResult.issues.length > 0) {
      outputChannel.appendLine('   Sample issues (first 5):');
      analysisResult.issues.slice(0, 5).forEach((issue: any, index: number) => {
        outputChannel.appendLine(`   ${index + 1}. [${issue.severity}] ${issue.message}`);
        outputChannel.appendLine(`      File: ${issue.component}`);
        outputChannel.appendLine(`      Line: ${(issue as any).line || 'N/A'}`);
        outputChannel.appendLine(`      Type: ${issue.type}`);
        outputChannel.appendLine('');
      });
    } else {
      outputChannel.appendLine('   ℹ No issues found');
      outputChannel.appendLine('   This could mean:');
      outputChannel.appendLine('     1. Your code has no issues (great!)');
      outputChannel.appendLine('     2. SonarQube rules are not configured');
      outputChannel.appendLine('     3. The project was not scanned properly');
      outputChannel.appendLine('');
    }

    // 8. Summary
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('Diagnostic Summary');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('✓ SonarQube configuration: OK');
    outputChannel.appendLine('✓ Server connection: OK');
    outputChannel.appendLine('✓ Scanner execution: OK');
    outputChannel.appendLine('✓ Analysis results retrieved: OK');
    outputChannel.appendLine('');
    outputChannel.appendLine('If you see 0 issues in the Git change analysis:');
    outputChannel.appendLine('  1. Make sure you have uncommitted changes in your working directory');
    outputChannel.appendLine('  2. Or use "Goose: Analyze Branch Comparison" instead');
    outputChannel.appendLine('  3. SonarQube only reports issues for changed files');
    outputChannel.appendLine('');

    vscode.window.showInformationMessage('SonarQube diagnostic completed. Check output channel for details.');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine('');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('ERROR');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine(errorMsg);
    outputChannel.appendLine('');

    if (error instanceof Error && error.stack) {
      outputChannel.appendLine('Stack trace:');
      outputChannel.appendLine(error.stack);
    }

    vscode.window.showErrorMessage(`Diagnostic failed: ${errorMsg}`);
  }
}
