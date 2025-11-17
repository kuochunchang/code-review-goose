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
        size="small"
        elevation="2"
        @click="toggleFileTree"
      >
        <v-icon>mdi-menu</v-icon>
        <v-tooltip activator="parent" location="right"> Show File Tree (⌘B) </v-tooltip>
      </v-btn>

      <Splitpanes :dbl-click-splitter="false">
        <!-- Left: File Tree -->
        <Pane v-if="showFileTree" :size="20" :min-size="10" :max-size="40">
          <div class="panel-content">
            <FileTree
              :selected-file-path="selectedFile"
              @select-file="handleSelectFile"
              @collapse="toggleFileTree"
            />
          </div>
        </Pane>

        <!-- Middle: Code Viewer with optional UML Panel -->
        <Pane :size="getPaneSize('code')" :min-size="20">
          <div class="panel-content">
            <!-- Nested vertical split when UML is visible (side-by-side) -->
            <Splitpanes v-if="showUMLPanel" :dbl-click-splitter="false">
              <Pane :size="50" :min-size="30">
                <CodeViewer ref="codeViewerRef" :file-path="selectedFile" />
              </Pane>
              <Pane :size="50" :min-size="20">
                <UMLViewer
                  :code="umlCode"
                  :file-path="umlFilePath"
                  @close="closeUMLPanel"
                />
              </Pane>
            </Splitpanes>
            <!-- Single code viewer when UML is hidden -->
            <CodeViewer
              v-else
              ref="codeViewerRef"
              :file-path="selectedFile"
              @open-uml="handleOpenUML"
            />
          </div>
        </Pane>

        <!-- Right: Analysis Panel -->
        <Pane :size="getPaneSize('analysis')" :min-size="15" :max-size="50">
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
        <FileTree :selected-file-path="selectedFile" @select-file="handleMobileSelectFile" />
      </v-navigation-drawer>

      <!-- Mobile FAB for File Tree -->
      <v-btn
        v-if="!mobileDrawer"
        icon="mdi-menu"
        color="primary"
        class="mobile-fab"
        size="large"
        elevation="4"
        @click="mobileDrawer = true"
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
          <CodeViewer ref="codeViewerRef" :file-path="selectedFile" />
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
        <template #activator="{ props }">
          <v-btn icon="mdi-magnify" v-bind="props" class="mr-2" @click="openSearch"></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip :text="uiStore.theme === 'light' ? 'Dark Mode' : 'Light Mode'" location="bottom">
        <template #activator="{ props }">
          <v-btn
            :icon="uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
            v-bind="props"
            class="mr-2"
            @click="uiStore.toggleTheme()"
          ></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Settings" location="bottom">
        <template #activator="{ props }">
          <v-btn icon="mdi-cog" v-bind="props" class="mr-2" @click="openSettings"></v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Keyboard Shortcuts" location="bottom">
        <template #activator="{ props }">
          <v-btn icon="mdi-keyboard" v-bind="props" @click="shortcutsDialog = true"></v-btn>
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
import UMLViewer from '../components/UMLViewer.vue';
import SettingsDialog from '../components/SettingsDialog.vue';
import SearchDialog from '../components/SearchDialog.vue';
import KeyboardShortcutsDialog from '../components/KeyboardShortcutsDialog.vue';
import AppFooter from '../components/AppFooter.vue';
import { useUIStore } from '../stores/ui';
import { useProjectStore } from '../stores/project';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';
import type { KeyboardShortcut } from '../composables/useKeyboardShortcuts';
import axios from 'axios';
import { useDisplay } from 'vuetify';
import { projectApi } from '../services/api';

const uiStore = useUIStore();
const projectStore = useProjectStore();
const { mdAndUp } = useDisplay();

const selectedFile = ref<string | undefined>(undefined);
const codeViewerRef = ref<InstanceType<typeof CodeViewer> | null>(null);
const settingsDialog = ref(false);
const searchDialog = ref(false);
const shortcutsDialog = ref(false);
const mobileDrawer = ref(false);
const mobileTab = ref('code');
const currentFileInfo = ref<{ path?: string; lineCount?: number }>({});
const showFileTree = ref(true);
const showUMLPanel = ref(false);
const umlCode = ref<string>('');
const umlFilePath = ref<string>('');

// Toggle file tree visibility
const toggleFileTree = () => {
  showFileTree.value = !showFileTree.value;
};

// Calculate pane sizes based on visible panels
const getPaneSize = (panel: 'code' | 'analysis') => {
  if (panel === 'code') {
    return showFileTree.value ? 50 : 60;
  } else {
    // analysis panel
    return showFileTree.value ? 30 : 40;
  }
};

// Handle opening UML panel
const handleOpenUML = async (code: string, filePath: string) => {
  // If code is not provided, fetch it from the codeViewerRef
  if (!code && codeViewerRef.value?.currentFile) {
    try {
      const content = await projectStore.fetchFileContent(codeViewerRef.value.currentFile);
      code = content;
      filePath = codeViewerRef.value.currentFile;
    } catch (err) {
      console.error('Failed to fetch file content for UML:', err);
      uiStore.showSnackbar('Failed to load file content', 'error');
      return;
    }
  }

  umlCode.value = code;
  umlFilePath.value = filePath;
  showUMLPanel.value = true;
};

// Close UML panel
const closeUMLPanel = () => {
  showUMLPanel.value = false;
  umlCode.value = '';
  umlFilePath.value = '';
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
    description: 'Toggle UML Diagram',
    handler: () => {
      if (showUMLPanel.value) {
        closeUMLPanel();
      } else if (codeViewerRef.value && codeViewerRef.value.currentFile) {
        codeViewerRef.value.openUMLViewer();
      }
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
  // Save last opened file to localStorage
  try {
    localStorage.setItem('lastOpenedFile', filePath);
  } catch (error) {
    console.warn('Failed to save last opened file to localStorage:', error);
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

const handleSelectMatch = (filePath: string, line: number) => {
  // Load the file and jump to line
  selectedFile.value = filePath;
  // TODO: Implement jump to specific line in CodeViewer
  console.log(`Jump to ${filePath}:${line}`);
};

const handleSettingsSaved = () => {
  console.log('Settings saved successfully');
};

// Auto-open last opened file on mount, or README as fallback
onMounted(async () => {
  try {
    // First, try to load the last opened file from localStorage
    const lastOpenedFile = localStorage.getItem('lastOpenedFile');

    if (lastOpenedFile) {
      // Verify the file still exists before opening it
      try {
        const response = await axios.get('/api/file/content', {
          params: { path: lastOpenedFile },
        });
        if (response.data.success) {
          // File exists, open it
          await handleSelectFile(lastOpenedFile);
          return;
        }
      } catch (error) {
        // File no longer exists, clear it from localStorage
        console.log('Last opened file no longer exists:', lastOpenedFile);
        localStorage.removeItem('lastOpenedFile');
      }
    }

    // Fallback: try to open README file if no last opened file or if it doesn't exist
    const readmePath = await projectApi.findReadme();
    if (readmePath) {
      await handleSelectFile(readmePath);
    }
  } catch (error) {
    // Silently fail if both last file and README detection fail
    console.log('No file to auto-open:', error);
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
  z-index: 10;
  border: none !important;
}

/* Vertical splitter (default - for left/right panels) */
.desktop-layout :deep(.splitpanes__splitter:not(.splitpanes__splitter-horizontal)) {
  width: 4px !important;
  min-width: 4px !important;
  cursor: col-resize !important;
}

.desktop-layout :deep(.splitpanes__splitter:not(.splitpanes__splitter-horizontal)::before) {
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

.desktop-layout :deep(.splitpanes__splitter:not(.splitpanes__splitter-horizontal):hover::before) {
  width: 3px;
  background-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 4px rgba(var(--v-theme-primary), 0.3);
}

/* Horizontal splitter (for code/UML split) */
.desktop-layout :deep(.splitpanes__splitter-horizontal) {
  height: 4px !important;
  min-height: 4px !important;
  cursor: row-resize !important;
}

.desktop-layout :deep(.splitpanes__splitter-horizontal::before) {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: rgba(0, 0, 0, 0.12);
  transform: translateY(-50%);
  transition: all 0.2s ease;
}

.desktop-layout :deep(.splitpanes__splitter-horizontal:hover::before) {
  height: 3px;
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
