<template>
  <div class="analysis-panel" data-testid="analysis-panel">
    <v-card elevation="1" class="h-100">
      <v-card-title class="text-subtitle-1 py-2 px-3 d-flex align-center">
        <v-icon icon="mdi-brain" size="small" class="mr-2"></v-icon>
        <span class="flex-grow-1">AI Analysis</span>
        <!-- Insight status indicator -->
        <span v-if="insightStatus === 'up-to-date'" class="text-caption text-success mr-2">
          <v-icon icon="mdi-check-circle" size="small" color="success" class="mr-1"></v-icon>
          Up to date
        </span>
        <span v-else-if="insightStatus === 'outdated'" class="text-caption text-warning mr-2">
          <v-icon icon="mdi-alert" size="small" color="warning" class="mr-1"></v-icon>
          Code changed
        </span>
        <!-- Auto-save status indicator -->
        <span v-if="autoSaved" class="text-caption text-success mr-2">
          <v-icon icon="mdi-check-circle" size="small" color="success" class="mr-1"></v-icon>
          Saved
        </span>
        <v-btn
          v-if="analysisResult && currentFile"
          :color="copied ? 'success' : 'info'"
          size="small"
          variant="text"
          :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
          @click="copyToClipboard"
          :disabled="copying"
          class="mr-1"
        >
          {{ copied ? 'Copied' : 'Copy' }}
        </v-btn>
        <v-btn
          v-if="currentFile"
          color="primary"
          size="small"
          variant="text"
          prepend-icon="mdi-play"
          data-testid="analyze-button"
          @click="runAnalysis"
          :loading="analyzing"
          :disabled="analyzing || !isFileAnalyzable"
        >
          Analyze
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <div v-if="!currentFile" class="empty-state">
          <v-icon icon="mdi-information-outline" size="48" color="grey-lighten-1"></v-icon>
          <p class="text-grey mt-4 text-center px-4">
            Select a file and click "Analyze" to get AI-powered code review
          </p>
        </div>

        <div v-else-if="currentFile && !isFileAnalyzable" class="empty-state">
          <v-icon icon="mdi-file-cancel-outline" size="48" color="warning"></v-icon>
          <p class="text-grey mt-4 text-center px-4">This file type cannot be analyzed</p>
          <p class="text-caption text-grey-darken-1 text-center px-4">
            Only source code files can be analyzed. You can configure analyzable file extensions in
            settings.
          </p>
        </div>

        <div v-else-if="loadingCache" class="analyzing-state">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          <p class="text-grey mt-4">Loading cached analysis...</p>
        </div>

        <div v-else-if="analyzing" class="analyzing-state" data-testid="analysis-loading">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          <p class="text-grey mt-4">Analyzing code...</p>
        </div>

        <v-alert v-else-if="error" type="error" variant="tonal" class="ma-2">
          {{ error }}
        </v-alert>

        <div v-else-if="analysisResult" class="analysis-content" data-testid="analysis-results">
          <!-- Outdated warning banner -->
          <v-alert
            v-if="insightStatus === 'outdated'"
            type="warning"
            variant="tonal"
            density="compact"
            class="ma-2 mb-0"
          >
            <template #prepend>
              <v-icon icon="mdi-alert"></v-icon>
            </template>
            <span class="text-body-2">
              Code has changed since last analysis. Click "Analyze" to refresh insights.
            </span>
          </v-alert>

          <!-- Summary -->
          <div class="summary-section pa-3">
            <h3 class="text-subtitle-2 mb-2">Summary</h3>
            <div
              class="text-body-2 markdown-content"
              v-html="renderMarkdown(analysisResult.summary)"
            ></div>
          </div>

          <v-divider></v-divider>

          <!-- Issues List -->
          <div class="issues-section">
            <div class="pa-3 d-flex align-center">
              <h3 class="text-subtitle-2 flex-grow-1">Issues ({{ filteredIssues.length }})</h3>
              <!-- Severity Filter -->
              <v-btn-toggle v-model="severityFilter" multiple size="small" density="compact">
                <v-btn value="critical" size="x-small">
                  <v-icon icon="mdi-alert-circle" color="error" size="small"></v-icon>
                </v-btn>
                <v-btn value="high" size="x-small">
                  <v-icon icon="mdi-alert" color="warning" size="small"></v-icon>
                </v-btn>
                <v-btn value="medium" size="x-small">
                  <v-icon icon="mdi-information" color="info" size="small"></v-icon>
                </v-btn>
                <v-btn value="low" size="x-small">
                  <v-icon icon="mdi-minus-circle" color="grey" size="small"></v-icon>
                </v-btn>
              </v-btn-toggle>
            </div>

            <v-list v-if="filteredIssues.length > 0" class="py-0">
              <template v-for="(issue, index) in filteredIssues" :key="index">
                <v-list-item class="issue-item" @click="toggleIssue(index)">
                  <template #prepend>
                    <v-icon
                      :icon="getSeverityIcon(issue.severity)"
                      :color="getSeverityColor(issue.severity)"
                      size="small"
                    ></v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">
                    {{ issue.message }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    Line {{ issue.line }}{{ issue.column ? `:${issue.column}` : '' }} ·
                    {{ issue.category }}
                  </v-list-item-subtitle>

                  <!-- Expanded Details -->
                  <v-expand-transition>
                    <div v-if="expandedIssues.includes(index)" class="issue-details mt-2">
                      <div class="suggestion-box pa-2 bg-blue-lighten-5 rounded">
                        <p class="text-caption font-weight-bold mb-1">Suggestion:</p>
                        <div
                          class="text-caption markdown-content"
                          v-html="renderMarkdown(issue.suggestion)"
                        ></div>
                      </div>

                      <!-- Code Example -->
                      <div v-if="issue.codeExample" class="code-example mt-2">
                        <div class="pa-2 bg-red-lighten-5 rounded mb-1">
                          <p class="text-caption font-weight-bold mb-1">Before:</p>
                          <pre class="text-caption">{{ issue.codeExample.before }}</pre>
                        </div>
                        <div class="pa-2 bg-green-lighten-5 rounded">
                          <p class="text-caption font-weight-bold mb-1">After:</p>
                          <pre class="text-caption">{{ issue.codeExample.after }}</pre>
                        </div>
                      </div>

                      <v-btn
                        size="small"
                        variant="text"
                        prepend-icon="mdi-arrow-right"
                        @click.stop="jumpToLine(issue.line)"
                        class="mt-2"
                      >
                        Jump to line
                      </v-btn>
                    </div>
                  </v-expand-transition>
                </v-list-item>
                <v-divider v-if="index < filteredIssues.length - 1"></v-divider>
              </template>
            </v-list>

            <div v-else class="pa-3 text-center text-grey">
              No issues found matching the selected filters
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <v-icon icon="mdi-file-search-outline" size="48" color="grey-lighten-1"></v-icon>
          <p class="text-grey mt-4">No analysis yet</p>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { analysisApi, insightsApi } from '../services/api';
import { useProjectStore } from '../stores/project';
import { useMarkdown } from '../composables/useMarkdown';
import { computeHash } from '../utils/hash';
import type { AnalysisResult } from '../types/analysis';

interface Props {
  filePath?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  jumpToLine: [line: number];
  reviewSaved: [];
}>();

const projectStore = useProjectStore();
const { renderMarkdown } = useMarkdown();
const currentFile = computed(() => props.filePath);
const analyzing = ref(false);
const autoSaved = ref(false);
const copying = ref(false);
const copied = ref(false);
const error = ref<string | null>(null);
const analysisResult = ref<AnalysisResult | null>(null);
const expandedIssues = ref<number[]>([]);
const severityFilter = ref<string[]>(['critical', 'high', 'medium', 'low', 'info']);
const loadingCache = ref(false);
const isFileAnalyzable = ref(true);

// Insight status tracking
const insightStatus = ref<'none' | 'up-to-date' | 'outdated'>('none');
const currentCodeHash = ref<string>('');
const insightTimestamp = ref<string>('');

// Unified function to create analysis options
// This must match the backend createAnalysisOptions to ensure cache key consistency
const createAnalysisOptions = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    vue: 'javascript',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
  };
  const language = languageMap[ext] || 'unknown';

  return {
    language,
    filePath,
    checkQuality: true,
    checkSecurity: true,
    checkPerformance: true,
    checkBestPractices: true,
    checkBugs: true,
  };
};

// Watch for file changes and auto-load insights
watch(currentFile, async (newFilePath, oldFilePath) => {
  if (!newFilePath || newFilePath === oldFilePath) return;

  // Reset state when switching files
  analysisResult.value = null;
  error.value = null;
  expandedIssues.value = [];
  autoSaved.value = false;
  loadingCache.value = true;
  isFileAnalyzable.value = true;
  insightStatus.value = 'none';
  currentCodeHash.value = '';
  insightTimestamp.value = '';

  try {
    // Check if file is analyzable
    isFileAnalyzable.value = await analysisApi.isFileAnalyzable(newFilePath);

    // If file is not analyzable, don't try to load insights
    if (!isFileAnalyzable.value) {
      loadingCache.value = false;
      return;
    }

    // Fetch file content
    const content = await projectStore.fetchFileContent(newFilePath);

    // Compute hash of current code
    const hash = await computeHash(content);
    currentCodeHash.value = hash;

    // Check if insight exists and whether hash matches
    const checkResult = await insightsApi.checkInsight(newFilePath, hash);

    if (checkResult.hasRecord && checkResult.insight) {
      // Display the insight
      analysisResult.value = checkResult.insight.analysis;
      insightTimestamp.value = checkResult.insight.timestamp;

      // Set status based on hash match
      if (checkResult.hashMatched) {
        insightStatus.value = 'up-to-date';
      } else {
        insightStatus.value = 'outdated';
      }
    } else {
      insightStatus.value = 'none';
    }
  } catch (err) {
    console.error('Failed to load insight:', err);
    // Don't show error to user, just no insight available
    insightStatus.value = 'none';
  } finally {
    loadingCache.value = false;
  }
});

const filteredIssues = computed(() => {
  if (!analysisResult.value) return [];
  return analysisResult.value.issues.filter((issue) =>
    severityFilter.value.includes(issue.severity)
  );
});

const runAnalysis = async () => {
  if (!currentFile.value) return;

  // Double check if file is analyzable
  if (!isFileAnalyzable.value) {
    error.value = 'This file type cannot be analyzed';
    return;
  }

  analyzing.value = true;
  error.value = null;
  autoSaved.value = false;

  try {
    // Fetch file content
    const content = await projectStore.fetchFileContent(currentFile.value);

    // Compute hash of current code
    const hash = await computeHash(content);
    currentCodeHash.value = hash;

    // Call AI analysis API using standardized options
    const result = await analysisApi.analyzeCode(content, createAnalysisOptions(currentFile.value));

    analysisResult.value = result;

    // Reset expanded issues when new analysis is done
    expandedIssues.value = [];

    // Save insight with hash
    try {
      await insightsApi.saveInsight(currentFile.value, hash, result);

      // Update insight status
      insightStatus.value = 'up-to-date';
      insightTimestamp.value = new Date().toISOString();

      // Show auto-saved indicator
      autoSaved.value = true;
      emit('reviewSaved');

      // Hide indicator after 3 seconds
      setTimeout(() => {
        autoSaved.value = false;
      }, 3000);
    } catch (saveErr) {
      console.error('Failed to save insight:', saveErr);
      // Don't show error to user, save failure is not critical
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Analysis failed';
    console.error('Analysis failed:', err);
  } finally {
    analyzing.value = false;
  }
};

const toggleIssue = (index: number) => {
  const idx = expandedIssues.value.indexOf(index);
  if (idx > -1) {
    expandedIssues.value.splice(idx, 1);
  } else {
    expandedIssues.value.push(index);
  }
};

const jumpToLine = (line: number) => {
  emit('jumpToLine', line);
};

const getSeverityIcon = (severity: string): string => {
  const icons: Record<string, string> = {
    critical: 'mdi-alert-circle',
    high: 'mdi-alert',
    medium: 'mdi-information',
    low: 'mdi-minus-circle',
    info: 'mdi-information-outline',
  };
  return icons[severity] || 'mdi-information';
};

const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'grey',
    info: 'blue-grey',
  };
  return colors[severity] || 'grey';
};

const copyToClipboard = async () => {
  if (!currentFile.value || !analysisResult.value) return;

  copying.value = true;
  try {
    // Format the content to copy as JSON
    const jsonContent = {
      filePath: currentFile.value,
      fileName: currentFile.value.split('/').pop() || '',
      summary: analysisResult.value.summary,
      timestamp: analysisResult.value.timestamp,
      totalIssues: analysisResult.value.issues.length,
      issues: analysisResult.value.issues.map((issue) => ({
        severity: issue.severity,
        category: issue.category,
        message: issue.message,
        location: {
          line: issue.line,
          column: issue.column || null,
        },
        suggestion: issue.suggestion,
        codeExample: issue.codeExample
          ? {
              before: issue.codeExample.before,
              after: issue.codeExample.after,
            }
          : null,
      })),
    };

    // Convert to formatted JSON string
    const content = JSON.stringify(jsonContent, null, 2);

    // Copy to clipboard
    await navigator.clipboard.writeText(content);

    // Show success state
    copied.value = true;

    // Reset after 2 seconds
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    alert('Failed to copy to clipboard. Please try again.');
  } finally {
    copying.value = false;
  }
};
</script>

<style scoped>
.analysis-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.h-100 {
  height: 100%;
}

.empty-state,
.analyzing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 150px);
}

.analysis-content {
  overflow-y: auto;
  max-height: calc(100vh - 150px);
}

.issue-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.issue-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.issue-details {
  padding-left: 40px;
}

.suggestion-box {
  border-left: 3px solid #2196f3;
}

.code-example pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
}

/* Markdown content styles */
.markdown-content {
  line-height: 1.6;
}

.markdown-content p {
  margin: 0.5em 0;
}

.markdown-content p:first-child {
  margin-top: 0;
}

.markdown-content p:last-child {
  margin-bottom: 0;
}

.markdown-content strong {
  font-weight: 600;
}

.markdown-content em {
  font-style: italic;
}

.markdown-content code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
}

.markdown-content ul,
.markdown-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content li {
  margin: 0.25em 0;
}

.markdown-content blockquote {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  margin: 0.5em 0;
  color: #666;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin: 0.75em 0 0.5em;
  font-weight: 600;
}

.markdown-content h1:first-child,
.markdown-content h2:first-child,
.markdown-content h3:first-child,
.markdown-content h4:first-child,
.markdown-content h5:first-child,
.markdown-content h6:first-child {
  margin-top: 0;
}

.markdown-content a {
  color: #2196f3;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}
</style>
