<template>
  <v-dialog v-model="dialog" max-width="1200px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-history" class="mr-2"></v-icon>
        Review History
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="dialog = false"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <!-- Filter and Stats Row -->
      <v-card-text class="pa-4">
        <v-row>
          <!-- Stats Cards -->
          <v-col cols="12" md="8">
            <v-row dense>
              <v-col cols="3">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ stats?.total || 0 }}</div>
                    <div class="text-caption">Total Reviews</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="3">
                <v-card variant="tonal" color="warning">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ stats?.unresolved || 0 }}</div>
                    <div class="text-caption">Unresolved</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="3">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ stats?.resolved || 0 }}</div>
                    <div class="text-caption">Resolved</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="3">
                <v-card variant="tonal" color="orange">
                  <v-card-text class="text-center">
                    <div class="text-h5">{{ stats?.bookmarked || 0 }}</div>
                    <div class="text-caption">Bookmarked</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>

          <!-- Action Buttons -->
          <v-col cols="12" md="4" class="d-flex align-center justify-end">
            <v-btn
              color="primary"
              prepend-icon="mdi-refresh"
              @click="loadReviews"
              :loading="loading"
              class="mr-2"
            >
              Refresh
            </v-btn>
            <v-btn
              color="secondary"
              prepend-icon="mdi-download"
              @click="exportDialog = true"
            >
              Export
            </v-btn>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <!-- Filters -->
        <v-expansion-panels v-model="filterPanelOpen">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon icon="mdi-filter" class="mr-2"></v-icon>
              Filters
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.searchText"
                    label="Search"
                    prepend-icon="mdi-magnify"
                    density="compact"
                    clearable
                    @update:model-value="debouncedLoadReviews"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="filters.filePath"
                    label="File Path"
                    prepend-icon="mdi-file"
                    density="compact"
                    clearable
                    @update:model-value="debouncedLoadReviews"
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-select
                    v-model="filters.severity"
                    :items="severityOptions"
                    label="Severity"
                    prepend-icon="mdi-alert"
                    density="compact"
                    multiple
                    clearable
                    @update:model-value="loadReviews"
                  ></v-select>
                </v-col>

                <v-col cols="12" md="4">
                  <v-select
                    v-model="filters.resolved"
                    :items="resolvedOptions"
                    label="Status"
                    prepend-icon="mdi-check-circle"
                    density="compact"
                    clearable
                    @update:model-value="loadReviews"
                  ></v-select>
                </v-col>

                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="filters.bookmarked"
                    label="Bookmarked only"
                    density="compact"
                    @update:model-value="loadReviews"
                  ></v-checkbox>
                </v-col>

                <v-col cols="12" class="d-flex justify-end">
                  <v-btn @click="clearFilters" size="small">Clear Filters</v-btn>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-divider></v-divider>

      <!-- Review List -->
      <v-card-text style="max-height: 600px; overflow-y: auto">
        <div v-if="loading && reviews.length === 0" class="text-center py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <div class="mt-2">Loading reviews...</div>
        </div>

        <div v-else-if="reviews.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-inbox</v-icon>
          <div class="text-h6 mt-2">No reviews found</div>
          <div class="text-caption">Try adjusting your filters</div>
        </div>

        <v-list v-else>
          <template v-for="(review, index) in reviews" :key="review.id">
            <v-list-item
              class="review-item"
              @click="selectReview(review)"
            >
              <template v-slot:prepend>
                <v-icon
                  :icon="review.bookmarked ? 'mdi-star' : 'mdi-star-outline'"
                  :color="review.bookmarked ? 'orange' : 'grey'"
                  @click.stop="toggleBookmark(review)"
                  class="mr-2"
                ></v-icon>
              </template>

              <v-list-item-title>
                <v-chip size="small" class="mr-2" :color="getMaxSeverityColor(review)">
                  {{ getMaxSeverity(review) }}
                </v-chip>
                {{ review.fileName }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <div class="d-flex align-center mt-1">
                  <v-icon size="small" class="mr-1">mdi-folder</v-icon>
                  <span class="text-caption">{{ review.filePath }}</span>
                </div>
                <div class="d-flex align-center mt-1">
                  <v-icon size="small" class="mr-1">mdi-clock</v-icon>
                  <span class="text-caption">{{ formatDate(review.timestamp) }}</span>
                  <v-chip
                    v-if="review.resolved"
                    size="x-small"
                    color="success"
                    class="ml-2"
                  >
                    Resolved
                  </v-chip>
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  @click.stop="deleteReview(review)"
                ></v-btn>
              </template>
            </v-list-item>

            <v-divider v-if="index < reviews.length - 1"></v-divider>
          </template>
        </v-list>

        <!-- Pagination -->
        <div v-if="total > limit" class="d-flex justify-center mt-4">
          <v-pagination
            v-model="currentPage"
            :length="Math.ceil(total / limit)"
            @update:model-value="onPageChange"
          ></v-pagination>
        </div>
      </v-card-text>
    </v-card>

    <!-- Export Dialog -->
    <v-dialog v-model="exportDialog" max-width="500px">
      <v-card>
        <v-card-title>Export Reviews</v-card-title>
        <v-card-text>
          <v-radio-group v-model="exportFormat" label="Format">
            <v-radio label="Markdown (.md)" value="markdown"></v-radio>
            <v-radio label="HTML (.html)" value="html"></v-radio>
            <v-radio label="JSON (.json)" value="json"></v-radio>
          </v-radio-group>

          <v-checkbox
            v-model="exportIncludeResolved"
            label="Include resolved reviews"
          ></v-checkbox>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="exportDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="handleExport" :loading="exporting">Export</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { reviewApi } from '../services/api';
import type { ReviewRecord, ReviewFilter, ReviewStats } from '../types/review';
import type { IssueSeverity } from '../types/analysis';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select-review', review: ReviewRecord): void;
}>();

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Data
const reviews = ref<ReviewRecord[]>([]);
const stats = ref<ReviewStats | null>(null);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const limit = ref(20);

// Filters
const filterPanelOpen = ref<number | undefined>(undefined);
const filters = ref<ReviewFilter>({});

const severityOptions = ['critical', 'high', 'medium', 'low', 'info'];
const resolvedOptions = [
  { title: 'All', value: undefined },
  { title: 'Resolved', value: true },
  { title: 'Unresolved', value: false },
];

// Export
const exportDialog = ref(false);
const exportFormat = ref<'markdown' | 'html' | 'json'>('markdown');
const exportIncludeResolved = ref(false);
const exporting = ref(false);

// Methods
const loadReviews = async () => {
  loading.value = true;
  try {
    const result = await reviewApi.listReviews({
      filter: filters.value,
      sort: { field: 'timestamp', order: 'desc' },
      limit: limit.value,
      offset: (currentPage.value - 1) * limit.value,
    });

    reviews.value = result.reviews;
    total.value = result.total;
  } catch (error) {
    console.error('Failed to load reviews:', error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    stats.value = await reviewApi.getStats();
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
};

// Debounced load for search
let debounceTimeout: number | null = null;
const debouncedLoadReviews = () => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = window.setTimeout(() => {
    currentPage.value = 1;
    loadReviews();
  }, 300);
};

const clearFilters = () => {
  filters.value = {};
  currentPage.value = 1;
  loadReviews();
};

const onPageChange = () => {
  loadReviews();
};

const selectReview = (review: ReviewRecord) => {
  emit('select-review', review);
};

const toggleBookmark = async (review: ReviewRecord) => {
  try {
    await reviewApi.updateReview(review.id, {
      bookmarked: !review.bookmarked,
    });
    await Promise.all([loadReviews(), loadStats()]);
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);
  }
};

const deleteReview = async (review: ReviewRecord) => {
  if (confirm(`Delete review for ${review.fileName}?`)) {
    try {
      await reviewApi.deleteReview(review.id);
      await Promise.all([loadReviews(), loadStats()]);
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  }
};

const handleExport = async () => {
  exporting.value = true;
  try {
    const blob = await reviewApi.exportReviews(exportFormat.value, {
      includeResolved: exportIncludeResolved.value,
      ...filters.value,
    });

    // Download file
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-review-${Date.now()}.${exportFormat.value === 'markdown' ? 'md' : exportFormat.value}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    exportDialog.value = false;
  } catch (error) {
    console.error('Failed to export:', error);
    alert('Export failed. Please try again.');
  } finally {
    exporting.value = false;
  }
};

const getMaxSeverity = (review: ReviewRecord): IssueSeverity => {
  const severityOrder: IssueSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
  for (const severity of severityOrder) {
    if (review.analysis.issues.some((i) => i.severity === severity)) {
      return severity;
    }
  }
  return 'info';
};

const getMaxSeverityColor = (review: ReviewRecord): string => {
  const severity = getMaxSeverity(review);
  const colors: Record<IssueSeverity, string> = {
    critical: 'error',
    high: 'orange',
    medium: 'warning',
    low: 'info',
    info: 'grey',
  };
  return colors[severity];
};

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Watch dialog open
watch(dialog, (isOpen) => {
  if (isOpen) {
    loadReviews();
    loadStats();
  }
});

onMounted(() => {
  if (dialog.value) {
    loadReviews();
    loadStats();
  }
});
</script>

<style scoped>
.review-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.review-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
