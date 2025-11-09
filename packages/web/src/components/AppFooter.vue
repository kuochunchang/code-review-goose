<template>
  <v-footer app class="footer" height="auto">
    <v-container fluid class="py-2 px-4">
      <v-row align="center" no-gutters class="footer-content">
        <!-- Left: Project Path -->
        <v-col cols="auto" class="footer-section">
          <v-tooltip text="Project Path" location="top">
            <template v-slot:activator="{ props }">
              <div v-bind="props" class="d-flex align-center">
                <v-icon icon="mdi-folder-outline" size="small" class="mr-2"></v-icon>
                <span class="text-caption font-weight-medium">{{ projectPath }}</span>
              </div>
            </template>
          </v-tooltip>
        </v-col>

        <v-divider vertical class="mx-4"></v-divider>

        <!-- Center: Current File Info -->
        <v-col cols="auto" class="footer-section">
          <v-tooltip :text="fileTooltip" location="top">
            <template v-slot:activator="{ props }">
              <div v-bind="props" class="d-flex align-center">
                <v-icon icon="mdi-file-document-outline" size="small" class="mr-2"></v-icon>
                <span class="text-caption">{{ fileInfo }}</span>
              </div>
            </template>
          </v-tooltip>
        </v-col>

        <v-spacer></v-spacer>

        <!-- Right: Version -->
        <v-col cols="auto" class="footer-section">
          <v-tooltip text="Goose Code Review Tool Version" location="top">
            <template v-slot:activator="{ props }">
              <div v-bind="props" class="d-flex align-center">
                <v-icon icon="mdi-information-outline" size="small" class="mr-2"></v-icon>
                <span class="text-caption font-weight-medium">v{{ version }}</span>
              </div>
            </template>
          </v-tooltip>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

interface Props {
  currentFile?: string;
  lineCount?: number;
}

const props = defineProps<Props>();

const projectPath = ref<string>('Loading...');
const version = ref<string>('1.0.0');

// Fetch project info
const fetchProjectInfo = async () => {
  try {
    const response = await axios.get('/api/project/info');
    if (response.data.success) {
      projectPath.value = response.data.data.path;
    }
  } catch (error) {
    console.error('Failed to fetch project info:', error);
    projectPath.value = 'Unknown';
  }
};

// Computed properties for file info
const fileInfo = computed(() => {
  if (!props.currentFile) {
    return 'No file selected';
  }

  const fileName = props.currentFile.split('/').pop() || props.currentFile;
  if (props.lineCount !== undefined) {
    return `${fileName} • ${props.lineCount} lines`;
  }
  return fileName;
});

const fileTooltip = computed(() => {
  if (!props.currentFile) {
    return 'No file selected';
  }
  return `Current file: ${props.currentFile}`;
});

onMounted(() => {
  fetchProjectInfo();
});
</script>

<style scoped>
.footer {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background-color: rgb(var(--v-theme-surface));
  z-index: 999;
}

.v-theme--dark .footer {
  border-top-color: rgba(255, 255, 255, 0.12);
}

.footer-content {
  font-size: 0.75rem;
}

.footer-section {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-caption {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.font-weight-medium {
  font-weight: 500;
}
</style>
