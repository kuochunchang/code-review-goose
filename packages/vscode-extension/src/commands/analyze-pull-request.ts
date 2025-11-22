/**
 * Analyze Pull Request Command
 * Analyzes GitHub pull requests with AI and SonarQube
 */

import * as vscode from 'vscode';
import type { GitAnalysisService } from '../services/git-analysis-service.js';
import {
    executeAnalysisWithProgress,
    getWorkspaceFolder,
    handleAnalysisError,
    selectAnalysisTypes,
    showAnalyzingPanel,
    showCompletionMessage,
    updatePanelWithResults,
} from '../utils/git-analysis-helpers.js';

/**
 * Analyze Pull Request
 */
export async function analyzePullRequest(
    context: vscode.ExtensionContext,
    gitAnalysisService: GitAnalysisService
): Promise<void> {
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
        return;
    }

    const workingDirectory = workspaceFolder.uri.fsPath;

    try {
        // Step 1: Try to auto-detect GitHub repository
        let repository = await gitAnalysisService.getGitHubRepository(workingDirectory);

        // Step 2: Prompt for repository if not detected
        if (!repository) {
            const repoInput = await vscode.window.showInputBox({
                prompt: 'Enter GitHub repository (format: owner/repo)',
                placeHolder: 'e.g., microsoft/vscode',
                validateInput: (value) => {
                    if (!value || !value.match(/^[\w-]+\/[\w-]+$/)) {
                        return 'Invalid format. Please use: owner/repo';
                    }
                    return null;
                },
            });

            if (!repoInput) {
                return; // User cancelled
            }

            const [owner, repo] = repoInput.split('/');
            repository = { owner, repo };
        } else {
            // Let user confirm or override detected repository
            const confirm = await vscode.window.showQuickPick(
                [
                    {
                        label: `$(check) Use detected repository: ${repository.owner}/${repository.repo}`,
                        value: 'use',
                    },
                    {
                        label: '$(edit) Enter different repository',
                        value: 'change',
                    },
                ],
                {
                    placeHolder: 'Confirm GitHub repository',
                }
            );

            if (!confirm) {
                return; // User cancelled
            }

            if (confirm.value === 'change') {
                const repoInput = await vscode.window.showInputBox({
                    prompt: 'Enter GitHub repository (format: owner/repo)',
                    placeHolder: 'e.g., microsoft/vscode',
                    value: `${repository.owner}/${repository.repo}`,
                    validateInput: (value) => {
                        if (!value || !value.match(/^[\w-]+\/[\w-]+$/)) {
                            return 'Invalid format. Please use: owner/repo';
                        }
                        return null;
                    },
                });

                if (!repoInput) {
                    return; // User cancelled
                }

                const [owner, repo] = repoInput.split('/');
                repository = { owner, repo };
            }
        }

        // Step 3: Prompt for PR number
        const prNumberInput = await vscode.window.showInputBox({
            prompt: `Enter Pull Request number for ${repository.owner}/${repository.repo}`,
            placeHolder: 'e.g., 12345',
            validateInput: (value) => {
                if (!value || !value.match(/^\d+$/)) {
                    return 'Please enter a valid PR number';
                }
                return null;
            },
        });

        if (!prNumberInput) {
            return; // User cancelled
        }

        const prNumber = parseInt(prNumberInput, 10);

        // Step 4: Get GitHub token from secret storage
        let githubToken = await context.secrets.get('gooseCodeReview.githubToken');

        if (!githubToken) {
            // Prompt user to enter GitHub token
            const tokenInput = await vscode.window.showInputBox({
                prompt: 'Enter your GitHub Personal Access Token',
                placeHolder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.length < 10) {
                        return 'Please enter a valid GitHub token';
                    }
                    return null;
                },
            });

            if (!tokenInput) {
                vscode.window.showErrorMessage(
                    'GitHub token is required for PR analysis. Please try again.'
                );
                return;
            }

            // Store token in secret storage
            await context.secrets.store('gooseCodeReview.githubToken', tokenInput);
            githubToken = tokenInput;
        }

        // Step 5: Select analysis types
        const analysisTypes = await selectAnalysisTypes(context);
        if (!analysisTypes) {
            return; // User cancelled
        }

        // Step 6: Show panel immediately
        showAnalyzingPanel(context.extensionUri, {
            changeSource: 'pull-request',
            workingDirectory,
            pullRequestNumber: prNumber,
            pullRequestTitle: undefined, // Will be filled after fetching PR
            repository,
        });

        // Step 7: Execute PR analysis
        const result = await executeAnalysisWithProgress(
            `Pull Request #${prNumber} Analysis`,
            async (progressCallback) => {
                return gitAnalysisService.analyzePullRequest(
                    {
                        workingDirectory,
                        repository,
                        prNumber,
                        analysisTypes,
                        githubToken,
                    },
                    progressCallback
                );
            }
        );

        // Step 8: Update panel with results
        // Note: We could fetch the PR title from the result if needed
        updatePanelWithResults(context.extensionUri, result, {
            changeSource: 'pull-request',
            workingDirectory,
            pullRequestNumber: prNumber,
            pullRequestTitle: `Pull Request`, // Could extract from result if needed
            repository,
        });

        showCompletionMessage(result);
    } catch (error) {
        handleAnalysisError(
            error,
            'Pull request analysis failed',
            {
                changeSource: 'pull-request',
                workingDirectory,
            }
        );
    }
}
