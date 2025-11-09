<template>
  <v-dialog v-model="dialog" max-width="1400px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-magnify" class="mr-2"></v-icon>
        Code Search
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <!-- Search Input -->
      <v-card-text class="pa-4">
        <v-row dense>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="searchQuery"
              label="Search query"
              prepend-icon="mdi-magnify"
              clearable
              autofocus
              @keyup.enter="executeSearch"
              :loading="searching"
              :disabled="searching"
              hint="Enter text or regex pattern to search"
              persistent-hint
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn
              color="primary"
              @click="executeSearch"
              :loading="searching"
              :disabled="!searchQuery || searching"
              prepend-icon="mdi-magnify"
              block
            >
              Search
            </v-btn>
          </v-col>
        </v-row>

        <!-- Options -->
        <v-row dense class="mt-2">
          <v-col cols="auto">
            <v-checkbox
              v-model="caseSensitive"
              label="Case sensitive"
              density="compact"
              hide-details
            ></v-checkbox>
          </v-col>
          <v-col cols="auto">
            <v-checkbox
              v-model="useRegex"
              label="Use regex"
              density="compact"
              hide-details
            ></v-checkbox>
          </v-col>
          <v-col cols="auto">
            <v-checkbox
              v-model="showContext"
              label="Show context"
              density="compact"
              hide-details
            ></v-checkbox>
          </v-col>
        </v-row>

        <!-- Advanced Options (Collapsible) -->
        <v-expansion-panels v-model="advancedPanelOpen" class="mt-2">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon icon="mdi-tune" class="mr-2"></v-icon>
              Advanced Options
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="filePattern"
                    label="File pattern"
                    hint="e.g., *.ts, *.vue"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="maxResults"
                    label="Max results"
                    type="number"
                    density="compact"
                    :min="1"
                    :max="10000"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <v-divider class="my-4"></v-divider>

        <!-- Results Summary -->
        <div v-if="searchResult" class="mb-2">
          <v-chip size="small" class="mr-2">
            <v-icon icon="mdi-file-document-multiple" start size="small"></v-icon>
            {{ searchResult.totalFiles }} files
          </v-chip>
          <v-chip size="small" class="mr-2">
            <v-icon icon="mdi-file-find" start size="small"></v-icon>
            {{ searchResult.totalMatches }} matches
          </v-chip>
          <v-chip size="small" class="mr-2">
            <v-icon icon="mdi-clock-outline" start size="small"></v-icon>
            {{ searchResult.searchTime }}ms
          </v-chip>
          <v-chip v-if="searchResult.truncated" size="small" color="warning">
            Results truncated
          </v-chip>
        </div>

        <!-- Search Results -->
        <div v-if="searching" class="text-center py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2">Searching...</div>
        </div>

        <v-alert v-else-if="searchError" type="error" variant="tonal">
          {{ searchError }}
        </v-alert>

        <div v-else-if="searchResult && searchResult.totalFiles === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-file-search</v-icon>
          <div class="text-h6 mt-2">No results found</div>
          <div class="text-caption">Try adjusting your search query or options</div>
        </div>

        <div v-else-if="searchResult" style="max-height: 600px; overflow-y: auto">
          <v-expansion-panels v-model="expandedFiles" multiple>
            <v-expansion-panel
              v-for="(fileResult, fileIndex) in searchResult.files"
              :key="fileIndex"
              :value="fileIndex"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center w-100">
                  <v-icon icon="mdi-file-code" class="mr-2" size="small"></v-icon>
                  <span class="font-weight-medium">{{ fileResult.fileName }}</span>
                  <v-spacer></v-spacer>
                  <v-chip size="x-small" class="mr-2">
                    {{ fileResult.totalMatches }} matches
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text>
                <div class="text-caption text-grey mb-2">{{ fileResult.filePath }}</div>

                <v-list density="compact">
                  <v-list-item
                    v-for="(match, matchIndex) in fileResult.matches"
                    :key="matchIndex"
                    @click="handleMatchClick(fileResult.filePath, match.line)"
                    class="match-item"
                  >
                    <template #prepend>
                      <v-chip size="x-small" variant="tonal" color="primary" class="mr-2">
                        {{ match.line }}
                      </v-chip>
                    </template>

                    <v-list-item-title>
                      <code class="match-text" v-html="highlightMatch(match)"></code>
                    </v-list-item-title>

                    <template v-if="showContext && isMatchWithContext(match)">
                      <v-list-item-subtitle class="mt-2">
                        <div v-if="match.contextBefore.length > 0" class="context-lines">
                          <div v-for="(line, i) in match.contextBefore" :key="`before-${i}`" class="context-line">
                            <span class="line-number">{{ match.line - match.contextBefore.length + i }}:</span>
                            <code>{{ line }}</code>
                          </div>
                        </div>
                        <div v-if="match.contextAfter.length > 0" class="context-lines mt-1">
                          <div v-for="(line, i) in match.contextAfter" :key="`after-${i}`" class="context-line">
                            <span class="line-number">{{ match.line + i + 1 }}:</span>
                            <code>{{ line }}</code>
                          </div>
                        </div>
                      </v-list-item-subtitle>
                    </template>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { searchApi } from '../services/api';
import type { SearchResult, SearchMatch, SearchMatchWithContext } from '../types/search';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select-match', filePath: string, line: number): void;
}>();

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Search options
const searchQuery = ref('');
const caseSensitive = ref(false);
const useRegex = ref(false);
const showContext = ref(true);
const filePattern = ref('');
const maxResults = ref(1000);

// UI state
const searching = ref(false);
const searchError = ref<string | null>(null);
const searchResult = ref<SearchResult | { files: any[]; totalFiles: number; totalMatches: number; searchTime: number; truncated: boolean } | null>(null);
const advancedPanelOpen = ref<number | undefined>(undefined);
const expandedFiles = ref<number[]>([]);

const executeSearch = async () => {
  if (!searchQuery.value) return;

  searching.value = true;
  searchError.value = null;
  searchResult.value = null;

  try {
    const options = {
      query: searchQuery.value,
      caseSensitive: caseSensitive.value,
      useRegex: useRegex.value,
      filePattern: filePattern.value || undefined,
      maxResults: maxResults.value,
      contextLines: showContext.value ? 2 : 0,
    };

    if (showContext.value) {
      const result = await searchApi.searchWithContext(options);
      searchResult.value = result;
    } else {
      const result = await searchApi.search(options);
      searchResult.value = result;
    }

    // Auto-expand first file
    if (searchResult.value.files.length > 0) {
      expandedFiles.value = [0];
    }
  } catch (error) {
    console.error('Search failed:', error);
    searchError.value = error instanceof Error ? error.message : 'Search failed';
  } finally {
    searching.value = false;
  }
};

const highlightMatch = (match: SearchMatch): string => {
  const text = match.text;
  const before = text.substring(0, match.matchStart);
  const matched = text.substring(match.matchStart, match.matchEnd);
  const after = text.substring(match.matchEnd);

  return `${escapeHtml(before)}<mark class="search-highlight">${escapeHtml(matched)}</mark>${escapeHtml(after)}`;
};

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

const isMatchWithContext = (match: SearchMatch): match is SearchMatchWithContext => {
  return 'contextBefore' in match && 'contextAfter' in match;
};

const handleMatchClick = (filePath: string, line: number) => {
  emit('select-match', filePath, line);
  dialog.value = false;
};
</script>

<style scoped>
.match-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.match-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.match-text {
  font-family: monospace;
  font-size: 0.9em;
  white-space: pre-wrap;
  word-break: break-all;
}

.match-text :deep(.search-highlight) {
  background-color: #ffeb3b;
  padding: 2px 0;
  font-weight: bold;
}

.context-lines {
  font-family: monospace;
  font-size: 0.85em;
  color: #666;
  padding-left: 40px;
}

.context-line {
  margin: 2px 0;
}

.line-number {
  display: inline-block;
  width: 40px;
  text-align: right;
  margin-right: 8px;
  color: #999;
}
</style>
