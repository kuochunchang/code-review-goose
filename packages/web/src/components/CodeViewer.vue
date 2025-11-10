<template>
  <div class="code-viewer" data-testid="code-viewer">
    <v-card elevation="1" class="h-100">
      <v-card-title class="text-subtitle-1 py-2 px-3 d-flex align-center">
        <v-icon icon="mdi-file-code-outline" size="small" class="mr-2"></v-icon>
        <span class="flex-grow-1">{{ currentFile || 'No file selected' }}</span>
        <v-btn
          v-if="currentFile"
          icon="mdi-refresh"
          size="small"
          variant="text"
          @click="reloadFile"
        ></v-btn>
      </v-card-title>
      <v-card-text class="pa-0 position-relative">
        <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
        <v-alert v-if="error" type="error" variant="tonal" class="ma-2">
          {{ error }}
        </v-alert>
        <div v-if="!currentFile && !loading && !error" class="empty-state">
          <pre class="ascii-art">
  _____  ____   ____   _____ ______
 / ____|/ __ \ / __ \ / ____|  ____|
| |  __| |  | | |  | | (___ | |__
| | |_ | |  | | |  | |\___ \|  __|
| |__| | |__| | |__| |____) | |____
 \_____|\____/ \____/|_____/|______|</pre
          >

          <p class="text-body-2 text-grey mt-8">Project: {{ projectInfo?.path || 'Loading...' }}</p>
          <p class="text-body-2 text-grey-lighten-1 mt-4">
            Select a file from the left panel to start reviewing
          </p>
        </div>
        <!-- Markdown Viewer -->
        <div v-if="isMarkdownFile && !error && currentFile" class="markdown-container">
          <div class="markdown-content" v-html="markdownHtml"></div>
        </div>
        <!-- Code Editor -->
        <div
          ref="editorContainer"
          class="editor-container"
          :style="{ display: currentFile && !error && !isMarkdownFile ? 'block' : 'none' }"
        ></div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useMarkdown } from '../composables/useMarkdown';
import { useProjectStore } from '../stores/project';
import { useUIStore } from '../stores/ui';

interface Props {
  filePath?: string;
}

const props = defineProps<Props>();

const projectStore = useProjectStore();
const uiStore = useUIStore();
const { renderMarkdown } = useMarkdown();
const editorContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const currentFile = ref<string | null>(null);
const fileContent = ref<string>('');
const projectInfo = ref<any>(null);
const lineCount = ref<number>(0);

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

// Compute Monaco theme based on app theme
const monacoTheme = computed(() => {
  return uiStore.theme === 'light' ? 'vs' : 'vs-dark';
});

const isMarkdownFile = computed(() => {
  if (!currentFile.value) return false;
  const ext = currentFile.value.split('.').pop()?.toLowerCase();
  return ext === 'md';
});

const markdownHtml = computed(() => {
  if (!isMarkdownFile.value) return '';
  return renderMarkdown(fileContent.value);
});

onMounted(async () => {
  // Load project info
  try {
    projectInfo.value = await projectStore.fetchProjectInfo();
  } catch (err) {
    console.error('Failed to load project info:', err);
  }
  // Monaco Editor will be initialized when file is loaded
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
    editor = null;
  }
});

watch(
  () => props.filePath,
  async (newFilePath) => {
    if (newFilePath) {
      await loadFile(newFilePath);
    }
  }
);

// Watch theme changes and update Monaco editor
watch(
  () => uiStore.theme,
  (newTheme) => {
    if (editor && !isMarkdownFile.value) {
      const theme = newTheme === 'light' ? 'vs' : 'vs-dark';
      editor.updateOptions({ theme });
    }
  }
);

const loadFile = async (filePath: string) => {
  loading.value = true;
  error.value = null;

  try {
    const content = await projectStore.fetchFileContent(filePath);
    currentFile.value = filePath;
    fileContent.value = content;

    // Calculate line count
    lineCount.value = content.split('\n').length;

    // If markdown file, no need to initialize editor
    if (isMarkdownFile.value) {
      if (editor) {
        editor.dispose();
        editor = null;
      }
      return;
    }

    await nextTick();

    if (!editorContainer.value) {
      throw new Error('Editor container not found');
    }

    // If editor already exists, update content
    if (editor) {
      editor.setValue(content);
      updateLanguage(filePath);
    } else {
      // Create new editor instance
      editor = monaco.editor.create(editorContainer.value, {
        value: content,
        language: detectLanguage(filePath),
        theme: monacoTheme.value, // Dynamic theme
        readOnly: true, // Read-only mode
        automaticLayout: true,
        fontSize: 14,
        minimap: {
          enabled: true,
        },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 4,
      });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load file';
    console.error('Failed to load file:', err);
  } finally {
    loading.value = false;
  }
};

const updateLanguage = (filePath: string) => {
  if (editor) {
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, detectLanguage(filePath));
    }
  }
};

const detectLanguage = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    vue: 'html', // Vue SFC includes HTML
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    xml: 'xml',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
  };

  return languageMap[ext || ''] || 'plaintext';
};

const reloadFile = async () => {
  if (currentFile.value) {
    await loadFile(currentFile.value);
  }
};

// Jump to specified line
const jumpToLine = (lineNumber: number) => {
  if (!editor) {
    console.warn('Editor not initialized');
    return;
  }

  // Scroll to line and center
  editor.revealLineInCenter(lineNumber);

  // Set cursor position
  editor.setPosition({ lineNumber, column: 1 });

  // Focus editor
  editor.focus();

  // Highlight the line (optional)
  const model = editor.getModel();
  if (model) {
    // Add temporary decoration (highlight effect)
    const decorations = editor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
          options: {
            isWholeLine: true,
            className: 'highlighted-line',
            inlineClassName: 'highlighted-line-text',
          },
        },
      ]
    );

    // Remove highlight after 2 seconds
    setTimeout(() => {
      editor?.deltaDecorations(decorations, []);
    }, 2000);
  }
};

// Expose to parent component
defineExpose({
  currentFile,
  lineCount,
  jumpToLine,
});
</script>

<style scoped>
.code-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.h-100 {
  height: 100%;
}

.editor-container {
  height: calc(100vh - 150px);
  width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 150px);
}

.ascii-art {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1rem;
  line-height: 1.2;
  color: #1976d2;
  margin: 0;
  text-align: left;
}

.markdown-container {
  height: calc(100vh - 150px);
  width: 100%;
  overflow-y: auto;
  padding: 24px;
  background-color: #ffffff;
}

.markdown-content {
  max-width: 900px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  color: #24292e;
  line-height: 1.6;
}

/* Markdown Styling */
.markdown-content :deep(h1) {
  font-size: 2em;
  font-weight: 600;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin: 0.67em 0;
}

.markdown-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin: 0.75em 0;
}

.markdown-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0;
}

.markdown-content :deep(h4) {
  font-size: 1em;
  font-weight: 600;
  margin: 1.33em 0;
}

.markdown-content :deep(h5) {
  font-size: 0.875em;
  font-weight: 600;
  margin: 1.67em 0;
}

.markdown-content :deep(h6) {
  font-size: 0.85em;
  font-weight: 600;
  color: #6a737d;
  margin: 2.33em 0;
}

.markdown-content :deep(p) {
  margin: 0 0 1em 0;
}

.markdown-content :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 2em;
  margin: 0 0 1em 0;
}

.markdown-content :deep(li) {
  margin: 0.5em 0;
}

.markdown-content :deep(code) {
  background-color: #f6f8fa;
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.markdown-content :deep(pre) {
  background-color: #f6f8fa;
  padding: 1em;
  border-radius: 6px;
  overflow: auto;
  margin: 0 0 1em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  margin: 0;
  font-size: 100%;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding: 0 1em;
  color: #6a737d;
  margin: 0 0 1em 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

.markdown-content :deep(table tr) {
  border-top: 1px solid #ddd;
}

.markdown-content :deep(table th),
.markdown-content :deep(table td) {
  border: 1px solid #ddd;
  padding: 0.5em 1em;
  text-align: left;
}

.markdown-content :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 2px solid #eaecef;
  margin: 2em 0;
}

/* Highlighted line styles for jump-to-line feature */
:deep(.highlighted-line) {
  background-color: rgba(33, 150, 243, 0.15) !important;
  animation: fadeOutHighlight 2s ease-in-out;
}

:deep(.highlighted-line-text) {
  background-color: rgba(33, 150, 243, 0.1) !important;
}

@keyframes fadeOutHighlight {
  0% {
    background-color: rgba(33, 150, 243, 0.3);
  }
  100% {
    background-color: rgba(33, 150, 243, 0.15);
  }
}
</style>
