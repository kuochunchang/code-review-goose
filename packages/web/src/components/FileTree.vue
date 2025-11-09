<template>
  <div class="file-tree" data-testid="file-tree">
    <v-card elevation="1" class="h-100">
      <v-card-title class="text-subtitle-1 py-2 px-3 d-flex align-center">
        <v-icon icon="mdi-folder-outline" size="small" class="mr-2"></v-icon>
        Files
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          size="small"
          @click="$emit('collapse')"
          class="ml-2"
        >
          <v-icon>mdi-chevron-left</v-icon>
          <v-tooltip activator="parent" location="bottom">
            Hide File Tree (⌘B)
          </v-tooltip>
        </v-btn>
      </v-card-title>
      <v-card-text class="pa-0">
        <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
        <v-alert v-else-if="error" type="error" variant="tonal" class="ma-2">
          {{ error }}
        </v-alert>
        <div v-else class="file-tree-content">
          <FileTreeNode
            v-if="fileTree"
            :node="fileTree"
            :level="0"
            @select-file="handleSelectFile"
          />
          <v-alert v-else type="info" variant="tonal" class="ma-2">
            No files found
          </v-alert>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useProjectStore } from '../stores/project';
import FileTreeNode from './FileTreeNode.vue';

const projectStore = useProjectStore();
const loading = ref(false);
const error = ref<string | null>(null);
const fileTree = ref<any>(null);

const emit = defineEmits<{
  selectFile: [filePath: string];
  collapse: []
}>();

onMounted(async () => {
  await loadFileTree();
});

const loadFileTree = async () => {
  loading.value = true;
  error.value = null;
  try {
    fileTree.value = await projectStore.fetchFileTree();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load file tree';
    console.error('Failed to load file tree:', err);
  } finally {
    loading.value = false;
  }
};

const handleSelectFile = (filePath: string) => {
  emit('selectFile', filePath);
};
</script>

<style scoped>
.file-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-tree-content {
  overflow-y: auto;
  max-height: calc(100vh - 150px);
}

.h-100 {
  height: 100%;
}
</style>
