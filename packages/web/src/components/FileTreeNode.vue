<template>
  <div class="file-tree-node">
    <div
      class="node-content"
      :class="{ 'node-selected': isSelected, 'node-file': isFile }"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      :data-testid="isFile ? 'file-tree-item' : 'file-tree-directory'"
      @click="handleClick"
    >
      <v-icon
        v-if="isDirectory"
        :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        size="small"
        class="expand-icon"
      ></v-icon>
      <v-icon
        :icon="nodeIcon"
        size="small"
        class="node-icon"
        :class="iconClass"
      ></v-icon>
      <span class="node-name">{{ node.name }}</span>
      <span v-if="isFile && node.size" class="node-size text-caption text-grey">
        {{ formatSize(node.size) }}
      </span>
    </div>
    <div v-if="isDirectory && expanded" class="node-children">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :level="level + 1"
        @select-file="$emit('selectFile', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

interface Props {
  node: FileNode;
  level: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  selectFile: [filePath: string]
}>();

const expanded = ref(props.level === 0); // Root directory expanded by default
const isSelected = ref(false);

const isDirectory = computed(() => props.node.type === 'directory');
const isFile = computed(() => props.node.type === 'file');

const nodeIcon = computed(() => {
  if (isDirectory.value) {
    return expanded.value ? 'mdi-folder-open' : 'mdi-folder';
  }

  // Return different icons based on file extension
  const ext = props.node.name.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    'ts': 'mdi-language-typescript',
    'js': 'mdi-language-javascript',
    'vue': 'mdi-vuejs',
    'json': 'mdi-code-json',
    'md': 'mdi-language-markdown',
    'css': 'mdi-language-css3',
    'scss': 'mdi-sass',
    'html': 'mdi-language-html5',
    'py': 'mdi-language-python',
    'java': 'mdi-language-java',
    'go': 'mdi-language-go',
    'rs': 'mdi-language-rust',
  };

  return iconMap[ext || ''] || 'mdi-file-outline';
});

const iconClass = computed(() => {
  const ext = props.node.name.split('.').pop()?.toLowerCase();
  const classMap: Record<string, string> = {
    'ts': 'text-blue',
    'js': 'text-yellow-darken-2',
    'vue': 'text-green',
    'json': 'text-grey-darken-1',
    'md': 'text-blue-grey',
  };
  return classMap[ext || ''] || '';
});

const handleClick = () => {
  if (isDirectory.value) {
    expanded.value = !expanded.value;
  } else {
    isSelected.value = true;
    emit('selectFile', props.node.path);
  }
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
</script>

<style scoped>
.file-tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 32px;
}

.node-content:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.node-selected {
  background-color: rgba(25, 118, 210, 0.12);
}

.node-selected:hover {
  background-color: rgba(25, 118, 210, 0.16);
}

.expand-icon {
  margin-right: 2px;
  flex-shrink: 0;
}

.node-icon {
  margin-right: 8px;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.node-size {
  margin-left: 8px;
  flex-shrink: 0;
}

.node-children {
  /* Children will have their own padding via level prop */
}
</style>
