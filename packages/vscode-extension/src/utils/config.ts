/**
 * Configuration utility
 * Reads VS Code extension settings
 */

import * as vscode from 'vscode';

export interface ExtensionConfig {
  analysisDepth: number;
  analysisMode: string;
  showPrivateMembers: boolean;
  autoRefresh: boolean;
}

/**
 * Get extension configuration from VS Code settings
 */
export function getConfiguration(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('gooseCodeReview');

  return {
    analysisDepth: config.get<number>('analysisDepth', 2),
    analysisMode: config.get<string>('analysisMode', 'focused'),
    showPrivateMembers: config.get<boolean>('showPrivateMembers', false),
    autoRefresh: config.get<boolean>('autoRefresh', true),
  };
}

/**
 * Update extension configuration
 */
export async function updateConfiguration(
  key: keyof ExtensionConfig,
  value: any,
  global = false
): Promise<void> {
  const config = vscode.workspace.getConfiguration('gooseCodeReview');
  await config.update(key, value, global);
}
