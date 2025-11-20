/**
 * Test SonarQube Scanner Command
 * Simple command to test if the scanner actually executes
 */

import * as vscode from 'vscode';
import { SonarQubeService } from '@code-review-goose/git-analyzer';
import { SonarQubeConfigService } from '../services/sonarqube-config-service.js';

/**
 * Execute test SonarQube scanner command
 */
export async function testSonarQubeScanner(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('SonarQube Test');
  outputChannel.show();

  try {
    outputChannel.appendLine('=== SonarQube Scanner Test ===\n');

    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }

    const workingDirectory = workspaceFolder.uri.fsPath;
    outputChannel.appendLine(`Working directory: ${workingDirectory}\n`);

    // Get SonarQube config
    const configService = new SonarQubeConfigService(context);
    const sqConfig = await configService.getSonarQubeConfig();

    if (!sqConfig) {
      vscode.window.showErrorMessage('SonarQube not configured. Please add a connection first.');
      outputChannel.appendLine('ERROR: SonarQube not configured');
      return;
    }

    outputChannel.appendLine('Configuration:');
    outputChannel.appendLine(`  Server URL: ${sqConfig.serverUrl}`);
    outputChannel.appendLine(`  Project Key: ${sqConfig.projectKey}`);
    outputChannel.appendLine(`  Sources: ${sqConfig.sources || '.'}`);
    outputChannel.appendLine('');

    // Create service
    const sqService = new SonarQubeService(sqConfig);

    // Step 1: Test connection
    outputChannel.appendLine('Step 1: Testing connection...');
    const connectionTest = await sqService.testConnection();
    
    if (!connectionTest.success) {
      vscode.window.showErrorMessage(`Connection failed: ${connectionTest.error}`);
      outputChannel.appendLine(`ERROR: ${connectionTest.error}`);
      return;
    }

    outputChannel.appendLine(`✓ Connected (v${connectionTest.version}, ${connectionTest.responseTime}ms)\n`);

    // Step 2: Execute scan
    outputChannel.appendLine('Step 2: Executing scanner...');
    outputChannel.appendLine('This may take 10-60 seconds depending on project size...');
    
    const startTime = Date.now();
    const scanResult = await sqService.executeScan({
      workingDirectory,
    });
    const duration = Date.now() - startTime;

    outputChannel.appendLine('');
    outputChannel.appendLine('=== Scan Result ===');
    outputChannel.appendLine(`Success: ${scanResult.success}`);
    outputChannel.appendLine(`Duration: ${duration}ms`);
    
    if (scanResult.error) {
      outputChannel.appendLine(`Error: ${scanResult.error}`);
      vscode.window.showErrorMessage(`Scanner failed: ${scanResult.error}`);
      return;
    }

    if (duration < 1000) {
      outputChannel.appendLine('');
      outputChannel.appendLine('⚠️ WARNING: Scan completed in less than 1 second!');
      outputChannel.appendLine('This is unusually fast and may indicate the scanner did not actually execute.');
      outputChannel.appendLine('Please check:');
      outputChannel.appendLine('  1. sonar.sources configuration');
      outputChannel.appendLine('  2. sonar.projectBaseDir setting');
      outputChannel.appendLine('  3. SonarQube server logs');
    } else {
      outputChannel.appendLine('');
      outputChannel.appendLine('✓ Scanner execution time looks normal');
    }

    // Step 3: Get results
    outputChannel.appendLine('');
    outputChannel.appendLine('Step 3: Fetching analysis results...');
    outputChannel.appendLine('Waiting 2 seconds for server to process...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const analysisResult = await sqService.getAnalysisResult(sqConfig.projectKey);
      
      outputChannel.appendLine('');
      outputChannel.appendLine('=== Analysis Result ===');
      outputChannel.appendLine(`Project: ${analysisResult.projectKey}`);
      outputChannel.appendLine(`Analysis Date: ${analysisResult.analysisDate}`);
      outputChannel.appendLine(`Total Issues: ${analysisResult.issues.length}`);
      outputChannel.appendLine(`Quality Gate: ${analysisResult.qualityGate.status}`);
      outputChannel.appendLine('');
      outputChannel.appendLine('Issues by Severity:');
      Object.entries(analysisResult.issuesBySeverity).forEach(([severity, count]) => {
        outputChannel.appendLine(`  ${severity}: ${count}`);
      });
      outputChannel.appendLine('');
      outputChannel.appendLine('Issues by Type:');
      Object.entries(analysisResult.issuesByType).forEach(([type, count]) => {
        outputChannel.appendLine(`  ${type}: ${count}`);
      });

      vscode.window.showInformationMessage(
        `Scanner test completed! Found ${analysisResult.issues.length} issues. Check Output panel for details.`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine('');
      outputChannel.appendLine(`ERROR fetching results: ${errorMsg}`);
      outputChannel.appendLine('');
      outputChannel.appendLine('This may be because:');
      outputChannel.appendLine('  1. Analysis is still processing on the server');
      outputChannel.appendLine('  2. Project was not created in SonarQube');
      outputChannel.appendLine('  3. Scanner did not upload results');
      
      vscode.window.showWarningMessage(
        `Scanner executed but could not fetch results: ${errorMsg}`
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine('');
    outputChannel.appendLine(`FATAL ERROR: ${errorMessage}`);
    vscode.window.showErrorMessage(`Test failed: ${errorMessage}`);
  }
}

