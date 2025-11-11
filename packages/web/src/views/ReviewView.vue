<template>
  <v-container fluid class="pa-0 review-view">
    <!-- Desktop Layout: Three-column with Resizable Panels -->
    <div v-if="$vuetify.display.mdAndUp" class="desktop-layout">
      <!-- Toggle File Tree Button (shown when file tree is hidden) -->
      <v-btn
        v-if="!showFileTree"
        icon="mdi-menu"
        color="primary"
        class="file-tree-toggle-btn"
        @click="toggleFileTree"
        size="small"
        elevation="2"
      >
        <v-icon>mdi-menu</v-icon>
        <v-tooltip activator="parent" location="right"> Show File Tree (⌘B) </v-tooltip>
      </v-btn>

      <Splitpanes :dbl-click-splitter="false">
        <!-- Left: File Tree -->
        <Pane v-if="showFileTree" :size="20" :min-size="10" :max-size="40">
          <div class="panel-content">
            <FileTree @select-file="handleSelectFile" @collapse="toggleFileTree" />
          </div>
        </Pane>

        <!-- Middle: Code Viewer -->
        <Pane :size="showFileTree ? 50 : 60" :min-size="30">
          <div class="panel-content">
            <CodeViewer :file-path="selectedFile" ref="codeViewerRef" />
          </div>
        </Pane>

        <!-- Right: Analysis Panel -->
        <Pane :size="showFileTree ? 30 : 40" :min-size="15" :max-size="50">
          <div class="panel-content">
            <AnalysisPanel :file-path="selectedFile" @jump-to-line="handleJumpToLine" />
          </div>
        </Pane>
      </Splitpanes>
    </div>

    <!-- Mobile/Tablet Layout: Drawer + Tabs -->
    <div v-else class="mobile-layout">
      <!-- Mobile Navigation Drawer for File Tree -->
      <v-navigation-drawer v-model="mobileDrawer" location="left" temporary width="300">
        <FileTree @select-file="handleMobileSelectFile" />
      </v-navigation-drawer>

      <!-- Mobile FAB for File Tree -->
      <v-btn
        v-if="!mobileDrawer"
        icon="mdi-menu"
        color="primary"
        class="mobile-fab"
        @click="mobileDrawer = true"
        size="large"
        elevation="4"
      ></v-btn>

      <!-- Mobile Tabs for Code and Analysis -->
      <v-tabs v-model="mobileTab" bg-color="primary" class="mobile-tabs">
        <v-tab value="code">
          <v-icon icon="mdi-code-tags" class="mr-2"></v-icon>
          Code
        </v-tab>
        <v-tab value="analysis">
          <v-icon icon="mdi-clipboard-text" class="mr-2"></v-icon>
          Analysis
        </v-tab>
      </v-tabs>

      <v-window v-model="mobileTab" class="mobile-window">
        <v-window-item value="code">
          <CodeViewer :file-path="selectedFile" ref="codeViewerRef" />
        </v-window-item>
        <v-window-item value="analysis">
          <AnalysisPanel :file-path="selectedFile" @jump-to-line="handleJumpToLine" />
        </v-window-item>
      </v-window>
    </div>

    <!-- Top Toolbar (Optional) -->
    <v-app-bar color="grey-darken-3" density="compact" class="app-bar">
      <v-toolbar-title>
        <v-icon icon="mdi-duck" class="mr-2"></v-icon>
        Goose Code Review
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-tooltip text="Search" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-magnify" @click="openSearch" v-bind="props" class="mr-2"></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="UML Diagram" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-chart-tree" @click="openUMLViewer" v-bind="props" class="mr-2"></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="uiStore.theme === 'light' ? 'Dark Mode' : 'Light Mode'" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn
            :icon="uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
            @click="uiStore.toggleTheme()"
            v-bind="props"
            class="mr-2"
          ></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Settings" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-cog" @click="openSettings" v-bind="props" class="mr-2"></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Keyboard Shortcuts" location="bottom">
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-keyboard" @click="shortcutsDialog = true" v-bind="props"></v-btn>
        </template>
      </v-tooltip>
    </v-app-bar>

    <!-- Settings Dialog -->
    <SettingsDialog v-model="settingsDialog" @saved="handleSettingsSaved" />

    <!-- Search Dialog -->
    <SearchDialog v-model="searchDialog" @select-match="handleSelectMatch" />

    <!-- Keyboard Shortcuts Help Dialog -->
    <KeyboardShortcutsDialog v-model="shortcutsDialog" :shortcuts="keyboardShortcuts" />

    <!-- App Footer -->
    <AppFooter :current-file="currentFileInfo.path" :line-count="currentFileInfo.lineCount" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { Splitpanes, Pane } from 'splitpanes';
import FileTree from '../components/FileTree.vue';
import CodeViewer from '../components/CodeViewer.vue';
import AnalysisPanel from '../components/AnalysisPanel.vue';
import SettingsDialog from '../components/SettingsDialog.vue';
import SearchDialog from '../components/SearchDialog.vue';
import KeyboardShortcutsDialog from '../components/KeyboardShortcutsDialog.vue';
import AppFooter from '../components/AppFooter.vue';
import { useUIStore } from '../stores/ui';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import type { KeyboardShortcut } from '../composables/useKeyboardShortcuts';
import axios from 'axios';
import { useDisplay } from 'vuetify';
import { projectApi } from '../services/api';

const uiStore = useUIStore();
const { mdAndUp } = useDisplay();

const selectedFile = ref<string | undefined>(undefined);
const codeViewerRef = ref<InstanceType<typeof CodeViewer> | null>(null);
const settingsDialog = ref(false);
const searchDialog = ref(false);
const shortcutsDialog = ref(false);
const currentCode = ref<string>('');
const mobileDrawer = ref(false);
const mobileTab = ref('code');
const currentFileInfo = ref<{ path?: string; lineCount?: number }>({});
const showFileTree = ref(true);

// Toggle file tree visibility
const toggleFileTree = () => {
  showFileTree.value = !showFileTree.value;
};

// Define keyboard shortcuts
const keyboardShortcuts: KeyboardShortcut[] = [
  {
    key: 'b',
    ctrl: true,
    description: 'Toggle File Tree',
    handler: () => {
      toggleFileTree();
    },
  },
  {
    key: 'k',
    ctrl: true,
    description: 'Open Search',
    handler: () => {
      searchDialog.value = true;
    },
  },
  {
    key: 'u',
    ctrl: true,
    description: 'Open UML Diagram',
    handler: () => {
      openUMLViewer();
    },
  },
  {
    key: ',',
    ctrl: true,
    description: 'Open Settings',
    handler: () => {
      settingsDialog.value = true;
    },
  },
  {
    key: 'd',
    ctrl: true,
    description: 'Toggle Theme (Light/Dark)',
    handler: () => {
      uiStore.toggleTheme();
    },
  },
  {
    key: '/',
    ctrl: true,
    description: 'Show Keyboard Shortcuts',
    handler: () => {
      shortcutsDialog.value = true;
    },
  },
];

// Initialize keyboard shortcuts
useKeyboardShortcuts(keyboardShortcuts);

// Watch for file selection changes to update footer info
watch(selectedFile, async (newFile) => {
  if (newFile) {
    await nextTick();
    currentFileInfo.value = {
      path: newFile,
      lineCount: codeViewerRef.value?.lineCount || undefined,
    };
  } else {
    currentFileInfo.value = {};
  }
});

// Watch for line count changes in CodeViewer
watch(
  () => codeViewerRef.value?.lineCount,
  (newLineCount) => {
    if (currentFileInfo.value.path) {
      currentFileInfo.value = {
        ...currentFileInfo.value,
        lineCount: newLineCount,
      };
    }
  }
);

const handleSelectFile = async (filePath: string) => {
  selectedFile.value = filePath;
  // Load file content for UML generation
  try {
    const response = await axios.get('/api/file/content', {
      params: { path: filePath },
    });
    if (response.data.success) {
      currentCode.value = response.data.data.content;
    }
  } catch (error) {
    console.error('Failed to load file content:', error);
  }
};

const handleMobileSelectFile = async (filePath: string) => {
  await handleSelectFile(filePath);
  mobileDrawer.value = false;
  mobileTab.value = 'code';
};

const handleJumpToLine = (line: number) => {
  // Switch to code tab on mobile devices
  if (!mdAndUp.value) {
    mobileTab.value = 'code';
  }

  // Call CodeViewer's jumpToLine method
  if (codeViewerRef.value) {
    codeViewerRef.value.jumpToLine(line);
  } else {
    console.warn('CodeViewer ref not available');
  }
};

const openSettings = () => {
  settingsDialog.value = true;
};

const openSearch = () => {
  searchDialog.value = true;
};

const openUMLViewer = () => {
  if (!currentCode.value || !selectedFile.value) {
    uiStore.showSnackbar('Please select a file first', 'warning');
    return;
  }
  // Store code and filePath in sessionStorage to pass to new window
  sessionStorage.setItem('uml_code', currentCode.value);
  sessionStorage.setItem('uml_filePath', selectedFile.value);
  // Open UML viewer in a new window
  const width = 1400;
  const height = 900;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  window.open('/uml', 'UML_Viewer', `width=${width},height=${height},left=${left},top=${top}`);
};

const handleSelectMatch = (filePath: string, line: number) => {
  // Load the file and jump to line
  selectedFile.value = filePath;
  // TODO: Implement jump to specific line in CodeViewer
  console.log(`Jump to ${filePath}:${line}`);
};

const handleSettingsSaved = () => {
  console.log('Settings saved successfully');
};

// Auto-open README file on mount if it exists
onMounted(async () => {
  try {
    const readmePath = await projectApi.findReadme();
    if (readmePath) {
      // Automatically select and open the README file
      await handleSelectFile(readmePath);
    }
  } catch (error) {
    // Silently fail if README detection fails, user can still browse files manually
    console.log('No README file found or error detecting README:', error);
  }
});
</script>

<style scoped>
.review-view {
  height: 100vh;
  overflow: hidden;
}

.app-bar {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

/* Desktop Layout with Resizable Panels */
.desktop-layout {
  height: calc(100vh - 48px);
  margin-top: 48px;
  position: relative;
}

.desktop-layout :deep(.splitpanes) {
  height: 100%;
  width: 100%;
}

.desktop-layout :deep(.splitpanes__pane) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content {
  height: 100%;
  width: 100%;
  overflow: hidden;
  flex: 1;
  position: relative;
}

/* Mobile Layout */
.mobile-layout {
  height: calc(100vh - 48px);
  margin-top: 48px;
  display: flex;
  flex-direction: column;
}

.mobile-tabs {
  flex-shrink: 0;
}

.mobile-window {
  flex: 1;
  overflow: hidden;
}

.mobile-window :deep(.v-window-item) {
  height: 100%;
}

.mobile-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
}

/* Customize Splitpanes Theme */
.desktop-layout :deep(.splitpanes__splitter) {
  background-color: transparent !important;
  position: relative;
  transition: all 0.2s ease;
  width: 4px !important;
  min-width: 4px !important;
  cursor: col-resize !important;
  z-index: 10;
  border: none !important;
}

.desktop-layout :deep(.splitpanes__splitter::before) {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: rgba(0, 0, 0, 0.12);
  transform: translateX(-50%);
  transition: all 0.2s ease;
}

.desktop-layout :deep(.splitpanes__splitter:hover::before) {
  width: 3px;
  background-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 4px rgba(var(--v-theme-primary), 0.3);
}

/* Dark theme adjustments */
.v-theme--dark .desktop-layout :deep(.splitpanes__splitter::before) {
  background-color: rgba(255, 255, 255, 0.12);
}

.v-theme--dark .desktop-layout :deep(.splitpanes__splitter:hover::before) {
  background-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 4px rgba(var(--v-theme-primary), 0.5);
}

/* File Tree Toggle Button */
.file-tree-toggle-btn {
  position: fixed;
  top: 60px;
  left: 12px;
  z-index: 100;
  transition: all 0.2s ease;
}

.file-tree-toggle-btn:hover {
  transform: scale(1.1);
}
</style>
