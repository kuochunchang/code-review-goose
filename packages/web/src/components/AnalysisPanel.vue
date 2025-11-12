<template>
  <div class="analysis-panel" data-testid="analysis-panel">
    <v-card elevation="1" class="h-100">
      <v-card-title class="text-subtitle-1 py-2 px-3 d-flex align-center">
        <v-icon icon="mdi-brain" size="small" class="mr-2"></v-icon>
        <span class="flex-grow-1">AI Insights</span>
        <!-- Status indicators based on current tab -->
        <template v-if="currentTab === 'analysis'">
          <span v-if="insightStatus === 'up-to-date'" class="text-caption text-success mr-2">
            <v-icon icon="mdi-check-circle" size="small" color="success" class="mr-1"></v-icon>
            Up to date
          </span>
          <span v-else-if="insightStatus === 'outdated'" class="text-caption text-warning mr-2">
            <v-icon icon="mdi-alert" size="small" color="warning" class="mr-1"></v-icon>
            Code changed
          </span>
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
        </template>
        <template v-else-if="currentTab === 'explain'">
          <span v-if="explainStatus === 'up-to-date'" class="text-caption text-success mr-2">
            <v-icon icon="mdi-check-circle" size="small" color="success" class="mr-1"></v-icon>
            Up to date
          </span>
          <span v-else-if="explainStatus === 'outdated'" class="text-caption text-warning mr-2">
            <v-icon icon="mdi-alert" size="small" color="warning" class="mr-1"></v-icon>
            Code changed
          </span>
          <span v-if="explainAutoSaved" class="text-caption text-success mr-2">
            <v-icon icon="mdi-check-circle" size="small" color="success" class="mr-1"></v-icon>
            Saved
          </span>
          <v-btn
            v-if="currentFile"
            color="primary"
            size="small"
            variant="text"
            prepend-icon="mdi-lightbulb-on"
            @click="runExplain"
            :loading="explaining"
            :disabled="explaining || !isFileAnalyzable"
          >
            Explain
          </v-btn>
        </template>
      </v-card-title>

      <!-- Tabs -->
      <v-tabs v-model="currentTab" class="px-3">
        <v-tab value="analysis">Analysis</v-tab>
        <v-tab value="explain">Explain</v-tab>
      </v-tabs>

      <v-card-text class="pa-0">
        <!-- Common empty/loading states -->
        <div v-if="!currentFile" class="empty-state">
          <v-icon icon="mdi-information-outline" size="48" color="grey-lighten-1"></v-icon>
          <p class="text-grey mt-4 text-center px-4">
            Select a file to get AI-powered insights
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

        <!-- Tab content -->
        <v-window v-else v-model="currentTab">
          <!-- Analysis Tab -->
          <v-window-item value="analysis">
            <div v-if="analyzing" class="analyzing-state" data-testid="analysis-loading">
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
                  <template #append>
                    <v-btn
                      size="x-small"
                      variant="text"
                      color="primary"
                      prepend-icon="mdi-cursor-default-click"
                      @click.stop="emit('jumpToLine', issue.line)"
                    >
                      Line {{ issue.line }}
                    </v-btn>
                  </template>

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
          </v-window-item>

          <!-- Explain Tab -->
          <v-window-item value="explain">
            <div v-if="explaining" class="analyzing-state">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
              <p class="text-grey mt-4">Generating explanation...</p>
            </div>

            <v-alert v-else-if="explainError" type="error" variant="tonal" class="ma-2">
              {{ explainError }}
            </v-alert>

            <div v-else-if="explainResult" class="explain-content" data-testid="explain-results">
              <!-- Outdated warning banner -->
              <v-alert
                v-if="explainStatus === 'outdated'"
                type="warning"
                variant="tonal"
                density="compact"
                class="ma-2 mb-0"
              >
                <template #prepend>
                  <v-icon icon="mdi-alert"></v-icon>
                </template>
                <span class="text-body-2">
                  Code has changed since last explanation. Click "Explain" to refresh.
                </span>
              </v-alert>

              <!-- Overview -->
              <div class="pa-3">
                <h3 class="text-subtitle-2 mb-2 d-flex align-center">
                  <v-icon icon="mdi-text-box-outline" size="small" class="mr-2"></v-icon>
                  Overview
                </h3>
                <p class="text-body-2 text-medium-emphasis">{{ explainResult.overview }}</p>
              </div>

              <v-divider></v-divider>

              <!-- Fields -->
              <div v-if="explainResult.fields && explainResult.fields.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-variable" size="small" class="mr-2"></v-icon>
                  Fields ({{ explainResult.fields.length }})
                </h3>
                <v-list density="compact" class="pa-0">
                  <v-list-item
                    v-for="(field, index) in explainResult.fields"
                    :key="index"
                    class="px-0"
                  >
                    <div class="d-flex align-center w-100">
                      <div class="flex-grow-1">
                        <div class="d-flex align-center mb-1">
                          <v-chip
                            v-if="field.visibility"
                            size="x-small"
                            :color="getVisibilityColor(field.visibility)"
                            class="mr-2"
                          >
                            {{ field.visibility }}
                          </v-chip>
                          <span class="text-subtitle-2 font-weight-bold">{{ field.name }}</span>
                          <span class="text-caption text-medium-emphasis ml-2">: {{ field.type }}</span>
                        </div>
                        <p class="text-caption text-medium-emphasis">{{ field.description }}</p>
                      </div>
                      <v-btn
                        v-if="field.line"
                        size="x-small"
                        variant="text"
                        color="primary"
                        prepend-icon="mdi-cursor-default-click"
                        @click="emit('jumpToLine', field.line)"
                        class="ml-2"
                      >
                        Line {{ field.line }}
                      </v-btn>
                    </div>
                  </v-list-item>
                </v-list>
              </div>

              <v-divider v-if="explainResult.fields && explainResult.fields.length > 0"></v-divider>

              <!-- Main Components -->
              <div v-if="explainResult.mainComponents.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-puzzle-outline" size="small" class="mr-2"></v-icon>
                  Main Components ({{ explainResult.mainComponents.length }})
                </h3>
                <v-row>
                  <v-col
                    v-for="(component, index) in explainResult.mainComponents"
                    :key="index"
                    cols="12"
                    md="6"
                  >
                    <v-card variant="outlined" class="h-100">
                      <v-card-text>
                        <div class="d-flex align-center mb-2">
                          <v-chip size="small" :color="getComponentColor(component.type)" class="mr-2">
                            {{ component.type }}
                          </v-chip>
                          <span class="text-subtitle-2 font-weight-bold flex-grow-1">{{
                            component.name
                          }}</span>
                          <v-btn
                            v-if="component.line"
                            size="x-small"
                            variant="text"
                            color="primary"
                            prepend-icon="mdi-cursor-default-click"
                            @click="emit('jumpToLine', component.line)"
                          >
                            Line {{ component.line }}
                          </v-btn>
                        </div>
                        <p class="text-caption text-medium-emphasis">{{ component.description }}</p>
                        <pre
                          v-if="component.codeSnippet"
                          class="code-snippet mt-2 pa-2 rounded text-caption"
                        >{{ component.codeSnippet }}</pre>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>

              <v-divider></v-divider>

              <!-- Method Dependencies -->
              <div v-if="explainResult.methodDependencies && explainResult.methodDependencies.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-call-split" size="small" class="mr-2"></v-icon>
                  Method Dependencies ({{ explainResult.methodDependencies.length }})
                  <v-spacer></v-spacer>
                  <v-btn
                    size="x-small"
                    variant="text"
                    prepend-icon="mdi-arrow-expand-all"
                    @click="openSequenceDiagramModal"
                  >
                    Enlarge
                  </v-btn>
                </h3>

                <!-- Sequence Diagram Preview -->
                <div class="sequence-diagram-preview mb-3">
                  <div ref="sequenceContainer" class="mermaid-container"></div>
                </div>

                <!-- Original List View -->
                <v-list density="compact">
                  <v-list-item
                    v-for="(dep, index) in explainResult.methodDependencies"
                    :key="index"
                  >
                    <div class="d-flex align-center w-100">
                      <div class="flex-grow-1">
                        <div class="d-flex align-center mb-1">
                          <v-chip size="x-small" color="blue" class="mr-2">
                            {{ dep.caller }}
                          </v-chip>
                          <v-icon size="small" icon="mdi-arrow-right" class="mx-1"></v-icon>
                          <v-chip size="x-small" color="green" class="ml-2">
                            {{ dep.callee }}
                          </v-chip>
                        </div>
                        <p v-if="dep.description" class="text-caption text-medium-emphasis">
                          {{ dep.description }}
                        </p>
                      </div>
                      <div class="d-flex gap-1">
                        <v-btn
                          v-if="dep.callerLine"
                          size="x-small"
                          variant="text"
                          color="blue"
                          prepend-icon="mdi-cursor-default-click"
                          @click="emit('jumpToLine', dep.callerLine)"
                        >
                          {{ dep.caller.substring(0, 10) }}{{ dep.caller.length > 10 ? '...' : '' }}:{{ dep.callerLine }}
                        </v-btn>
                        <v-btn
                          v-if="dep.calleeLine"
                          size="x-small"
                          variant="text"
                          color="green"
                          prepend-icon="mdi-cursor-default-click"
                          @click="emit('jumpToLine', dep.calleeLine)"
                        >
                          {{ dep.callee.substring(0, 10) }}{{ dep.callee.length > 10 ? '...' : '' }}:{{ dep.calleeLine }}
                        </v-btn>
                      </div>
                    </div>
                  </v-list-item>
                </v-list>
              </div>

              <v-divider v-if="explainResult.methodDependencies && explainResult.methodDependencies.length > 0"></v-divider>

              <!-- How It Works -->
              <div v-if="explainResult.howItWorks.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-cog-outline" size="small" class="mr-2"></v-icon>
                  How It Works
                </h3>
                <v-timeline side="end" density="compact">
                  <v-timeline-item
                    v-for="step in explainResult.howItWorks"
                    :key="step.step"
                    dot-color="primary"
                    size="small"
                  >
                    <template #opposite>
                      <span class="text-caption font-weight-bold">Step {{ step.step }}</span>
                    </template>
                    <div>
                      <div class="d-flex align-center mb-1">
                        <div class="text-subtitle-2 flex-grow-1">{{ step.title }}</div>
                        <v-btn
                          v-if="step.line"
                          size="x-small"
                          variant="text"
                          color="primary"
                          prepend-icon="mdi-cursor-default-click"
                          @click="emit('jumpToLine', step.line)"
                        >
                          Line {{ step.line }}
                        </v-btn>
                      </div>
                      <p class="text-caption text-medium-emphasis">{{ step.description }}</p>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </div>

              <v-divider></v-divider>

              <!-- Key Concepts -->
              <div v-if="explainResult.keyConcepts.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-lightbulb-on-outline" size="small" class="mr-2"></v-icon>
                  Key Concepts
                </h3>
                <v-expansion-panels variant="accordion">
                  <v-expansion-panel
                    v-for="(concept, index) in explainResult.keyConcepts"
                    :key="index"
                  >
                    <v-expansion-panel-title>
                      <span class="font-weight-medium">{{ concept.concept }}</span>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <p class="text-body-2">{{ concept.explanation }}</p>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>

              <v-divider></v-divider>

              <!-- Dependencies -->
              <div v-if="explainResult.dependencies.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-package-variant" size="small" class="mr-2"></v-icon>
                  Dependencies
                </h3>
                <v-list density="compact">
                  <v-list-item
                    v-for="(dep, index) in explainResult.dependencies"
                    :key="index"
                    :prepend-icon="dep.isExternal ? 'mdi-cloud-download' : 'mdi-folder'"
                  >
                    <v-list-item-title class="text-body-2">{{ dep.name }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">{{ dep.purpose }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </div>

              <v-divider></v-divider>

              <!-- Notable Features -->
              <div v-if="explainResult.notableFeatures.length > 0" class="pa-3">
                <h3 class="text-subtitle-2 mb-3 d-flex align-center">
                  <v-icon icon="mdi-star-outline" size="small" class="mr-2"></v-icon>
                  Notable Features
                </h3>
                <v-list density="compact">
                  <v-list-item
                    v-for="(feature, index) in explainResult.notableFeatures"
                    :key="index"
                    prepend-icon="mdi-check-circle"
                  >
                    <v-list-item-title class="text-body-2">{{ feature }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </div>
            </div>

            <div v-else class="empty-state">
              <v-icon icon="mdi-lightbulb-outline" size="48" color="grey-lighten-1"></v-icon>
              <p class="text-grey mt-4">No explanation yet</p>
              <p class="text-caption text-medium-emphasis mt-2">
                Click "Explain" to get a detailed explanation of this code
              </p>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Sequence Diagram Modal -->
    <v-dialog v-model="showSequenceDiagram" max-width="90vw" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-chart-gantt" class="mr-2"></v-icon>
          Sequence Diagram - Method Dependencies
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="showSequenceDiagram = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <div ref="sequenceModalContainer" class="mermaid-large-container"></div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { analysisApi, insightsApi } from '../services/api';
import { useProjectStore } from '../stores/project';
import { useMarkdown } from '../composables/useMarkdown';
import { computeHash } from '../utils/hash';
import type { AnalysisResult } from '../types/analysis';
import type { ExplainResult } from '../types/insight';
import mermaid from 'mermaid';

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
const isFileAnalyzable = ref(true);

// Insight status tracking
const insightStatus = ref<'none' | 'up-to-date' | 'outdated'>('none');
const currentCodeHash = ref<string>('');
const insightTimestamp = ref<string>('');

// Explain feature
const currentTab = ref<'analysis' | 'explain'>('analysis');
const explaining = ref(false);
const explainResult = ref<ExplainResult | null>(null);
const explainError = ref<string | null>(null);
const explainAutoSaved = ref(false);
const explainStatus = ref<'none' | 'up-to-date' | 'outdated'>('none');

// Sequence diagram feature
const showSequenceDiagram = ref(false);
const sequenceContainer = ref<HTMLElement | null>(null);
const sequenceModalContainer = ref<HTMLElement | null>(null);

// Unified function to create analysis options
// This must match the backend createAnalysisOptions for consistency
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
  isFileAnalyzable.value = true;
  insightStatus.value = 'none';
  currentCodeHash.value = '';
  insightTimestamp.value = '';
  // Reset explain state
  explainResult.value = null;
  explainError.value = null;
  explainAutoSaved.value = false;
  explainStatus.value = 'none';

  try {
    // Check if file is analyzable
    isFileAnalyzable.value = await analysisApi.isFileAnalyzable(newFilePath);

    // If file is not analyzable, don't try to load insights
    if (!isFileAnalyzable.value) {
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
      // Load analysis if available
      if (checkResult.insight.analysis) {
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

      // Load explain if available
      if (checkResult.insight.explain) {
        explainResult.value = checkResult.insight.explain;

        // Set status based on hash match
        if (checkResult.hashMatched) {
          explainStatus.value = 'up-to-date';
        } else {
          explainStatus.value = 'outdated';
        }
      } else {
        explainStatus.value = 'none';
      }
    } else {
      insightStatus.value = 'none';
      explainStatus.value = 'none';
    }
  } catch (err) {
    console.error('Failed to load insight:', err);
    // Don't show error to user, just no insight available
    insightStatus.value = 'none';
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

const runExplain = async () => {
  if (!currentFile.value) return;

  // Double check if file is analyzable
  if (!isFileAnalyzable.value) {
    explainError.value = 'This file type cannot be analyzed';
    return;
  }

  explaining.value = true;
  explainError.value = null;
  explainAutoSaved.value = false;

  try {
    // Fetch file content
    const content = await projectStore.fetchFileContent(currentFile.value);

    // Compute hash of current code
    const hash = await computeHash(content);
    currentCodeHash.value = hash;

    // Call AI explain API using standardized options
    const result = await analysisApi.explainCode(content, createAnalysisOptions(currentFile.value));

    explainResult.value = result;

    // Save explain to insights
    try {
      await insightsApi.saveExplain(currentFile.value, hash, result);

      // Update explain status
      explainStatus.value = 'up-to-date';

      // Show auto-saved indicator
      explainAutoSaved.value = true;

      // Hide indicator after 3 seconds
      setTimeout(() => {
        explainAutoSaved.value = false;
      }, 3000);
    } catch (saveErr) {
      console.error('Failed to save explain:', saveErr);
      // Don't show error to user, save failure is not critical
    }
  } catch (err) {
    explainError.value = err instanceof Error ? err.message : 'Explanation failed';
    console.error('Explanation failed:', err);
  } finally {
    explaining.value = false;
  }
};

// Helper function to get color for component type chips
const getComponentColor = (
  type: 'class' | 'function' | 'module' | 'interface' | 'constant' | 'type' | 'variable'
): string => {
  const colorMap: Record<string, string> = {
    class: 'blue',
    function: 'green',
    module: 'purple',
    interface: 'orange',
    constant: 'teal',
    type: 'indigo',
    variable: 'cyan',
  };
  return colorMap[type] || 'grey';
};

// Helper function to get color for visibility modifiers
const getVisibilityColor = (visibility: 'public' | 'private' | 'protected'): string => {
  const colorMap: Record<string, string> = {
    public: 'success',
    private: 'error',
    protected: 'warning',
  };
  return colorMap[visibility] || 'grey';
};

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  fontFamily: 'monospace',
});

// Generate Mermaid sequence diagram syntax from methodDependencies
const generateSequenceDiagram = (): string | null => {
  if (!explainResult.value?.methodDependencies || explainResult.value.methodDependencies.length === 0) {
    return null;
  }

  let mermaidCode = 'sequenceDiagram\n';

  explainResult.value.methodDependencies.forEach(dep => {
    const description = dep.description || 'calls';
    mermaidCode += `    ${dep.caller}->>${dep.callee}: ${description}\n`;
  });

  return mermaidCode;
};

// Render sequence diagram in a container
const renderSequenceDiagram = async (container: HTMLElement | null, enlarged: boolean = false) => {
  if (!container) return;

  const mermaidCode = generateSequenceDiagram();
  if (!mermaidCode) return;

  try {
    const id = `sequence-${Date.now()}-${enlarged ? 'modal' : 'preview'}`;
    const { svg } = await mermaid.render(id, mermaidCode);
    container.innerHTML = svg;
  } catch (err) {
    console.error('Failed to render sequence diagram:', err);
    container.innerHTML = '<p class="text-error text-caption">Failed to render sequence diagram</p>';
  }
};

// Open sequence diagram in modal
const openSequenceDiagramModal = async () => {
  showSequenceDiagram.value = true;
  await nextTick();
  renderSequenceDiagram(sequenceModalContainer.value, true);
};

// Watch for explainResult changes to render preview
watch(
  () => [explainResult.value, sequenceContainer.value] as const,
  async ([newResult, container]) => {
    if (newResult?.methodDependencies && newResult.methodDependencies.length > 0 && container) {
      await nextTick();
      renderSequenceDiagram(container, false);
    }
  },
  { immediate: true }
);
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

.analysis-content,
.explain-content {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
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

/* Sequence diagram styles */
.sequence-diagram-preview {
  max-height: 300px;
  overflow: auto;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}

.mermaid-container {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mermaid-large-container {
  min-height: 500px;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
