/**
 * SonarQube Configuration Service
 * Manages SonarQube connections, project bindings, and secure token storage
 */

import * as vscode from 'vscode';
import type { SonarQubeConfig } from '@code-review-goose/git-analyzer';

/**
 * SonarQube connection configuration
 */
export interface SonarQubeConnection {
  connectionId: string;
  serverUrl: string;
  organizationKey?: string;
  disableTelemetry?: boolean;
}

/**
 * SonarQube project binding
 */
export interface SonarQubeProjectBinding {
  connectionId: string;
  projectKey: string;
  projectName?: string;
}

/**
 * Service for managing SonarQube configuration
 */
export class SonarQubeConfigService {
  private static readonly SECRET_STORAGE_KEY_PREFIX = 'sonarqube.token.';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get all configured connections
   */
  getConnections(): SonarQubeConnection[] {
    const config = vscode.workspace.getConfiguration('gooseCodeReview.sonarqube');
    return config.get<SonarQubeConnection[]>('connections', []);
  }

  /**
   * Get project binding for current workspace
   */
  getProjectBinding(): SonarQubeProjectBinding | null {
    const config = vscode.workspace.getConfiguration('gooseCodeReview.sonarqube');
    return config.get<SonarQubeProjectBinding | null>('projectBinding', null);
  }

  /**
   * Get token for a connection (from Secret Storage)
   */
  async getToken(connectionId: string): Promise<string | undefined> {
    const secretKey = `${SonarQubeConfigService.SECRET_STORAGE_KEY_PREFIX}${connectionId}`;
    return await this.context.secrets.get(secretKey);
  }

  /**
   * Store token securely (in Secret Storage)
   */
  async storeToken(connectionId: string, token: string): Promise<void> {
    const secretKey = `${SonarQubeConfigService.SECRET_STORAGE_KEY_PREFIX}${connectionId}`;
    await this.context.secrets.store(secretKey, token);
  }

  /**
   * Delete stored token
   */
  async deleteToken(connectionId: string): Promise<void> {
    const secretKey = `${SonarQubeConfigService.SECRET_STORAGE_KEY_PREFIX}${connectionId}`;
    await this.context.secrets.delete(secretKey);
  }

  /**
   * Add a new connection
   */
  async addConnection(connection: SonarQubeConnection, token: string): Promise<void> {
    const connections = this.getConnections();
    
    // Check if connectionId already exists
    if (connections.some(c => c.connectionId === connection.connectionId)) {
      throw new Error(`Connection with ID "${connection.connectionId}" already exists`);
    }

    // Add connection
    connections.push(connection);
    await vscode.workspace
      .getConfiguration('gooseCodeReview.sonarqube')
      .update('connections', connections, vscode.ConfigurationTarget.Global);

    // Store token securely
    await this.storeToken(connection.connectionId, token);
  }

  /**
   * Remove a connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    const connections = this.getConnections().filter(c => c.connectionId !== connectionId);
    await vscode.workspace
      .getConfiguration('gooseCodeReview.sonarqube')
      .update('connections', connections, vscode.ConfigurationTarget.Global);

    // Delete stored token
    await this.deleteToken(connectionId);

    // Clear project binding if it uses this connection
    const binding = this.getProjectBinding();
    if (binding?.connectionId === connectionId) {
      await this.clearProjectBinding();
    }
  }

  /**
   * Update project binding
   */
  async setProjectBinding(binding: SonarQubeProjectBinding): Promise<void> {
    // Verify connection exists
    const connections = this.getConnections();
    if (!connections.some(c => c.connectionId === binding.connectionId)) {
      throw new Error(`Connection "${binding.connectionId}" not found`);
    }

    await vscode.workspace
      .getConfiguration('gooseCodeReview.sonarqube')
      .update('projectBinding', binding, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Clear project binding
   */
  async clearProjectBinding(): Promise<void> {
    await vscode.workspace
      .getConfiguration('gooseCodeReview.sonarqube')
      .update('projectBinding', null, vscode.ConfigurationTarget.Workspace);
  }

  /**
   * Get complete SonarQube configuration for git-analyzer
   */
  async getSonarQubeConfig(): Promise<SonarQubeConfig | null> {
    const binding = this.getProjectBinding();
    if (!binding) {
      return null;
    }

    const connections = this.getConnections();
    const connection = connections.find(c => c.connectionId === binding.connectionId);
    if (!connection) {
      return null;
    }

    const token = await this.getToken(connection.connectionId);
    if (!token) {
      return null;
    }

    const timeout = vscode.workspace
      .getConfiguration('gooseCodeReview.sonarqube')
      .get<number>('timeout', 3000);

    return {
      serverUrl: connection.serverUrl,
      token,
      projectKey: binding.projectKey,
      projectName: binding.projectName || binding.projectKey,
      timeout,
      skipCertVerification: false,
    };
  }

  /**
   * Check if SonarQube is enabled
   */
  isEnabled(): boolean {
    return vscode.workspace
      .getConfiguration('gooseCodeReview.sonarqube')
      .get<boolean>('enabled', true);
  }

  /**
   * Get analysis mode preference
   */
  getAnalysisMode(): 'hybrid' | 'ai-only' | 'sonarqube-only' {
    return vscode.workspace
      .getConfiguration('gooseCodeReview.gitAnalysis')
      .get<'hybrid' | 'ai-only' | 'sonarqube-only'>('mode', 'hybrid');
  }
}

