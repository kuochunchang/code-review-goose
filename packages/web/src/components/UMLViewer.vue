<template>
  <v-card class="uml-viewer" elevation="2" data-testid="uml-viewer">
    <v-toolbar :color="toolbarColor" density="compact">
      <v-btn-toggle
        v-model="selectedType"
        mandatory
        color="primary"
        density="compact"
        class="mr-2"
      >
        <v-btn value="class" size="small">
          <v-icon size="small" class="mr-1">mdi-file-tree</v-icon>
          CLASS
        </v-btn>
        <v-btn value="flowchart" size="small">
          <v-icon size="small" class="mr-1">mdi-chart-timeline</v-icon>
          FLOW
        </v-btn>
        <v-btn value="sequence" size="small" :disabled="!aiAvailable">
          <v-icon size="small" class="mr-1">mdi-chart-gantt</v-icon>
          SEQUENCE
        </v-btn>
        <v-btn value="dependency" size="small" :disabled="!aiAvailable">
          <v-icon size="small" class="mr-1">mdi-graph</v-icon>
          DEPENDENCY
        </v-btn>
      </v-btn-toggle>
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-refresh"
        size="small"
        :loading="loading"
        :disabled="!currentCode"
        @click="generateDiagram(false)"
      >
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent" location="bottom">Refresh (use cache)</v-tooltip>
      </v-btn>
      <v-btn
        icon="mdi-refresh-circle"
        size="small"
        :loading="loading"
        :disabled="!currentCode"
        @click="generateDiagram(true)"
        color="warning"
      >
        <v-icon>mdi-refresh-circle</v-icon>
        <v-tooltip activator="parent" location="bottom">Force Refresh (skip cache)</v-tooltip>
      </v-btn>
      <v-btn
        icon="mdi-download"
        size="small"
        :disabled="!diagram"
        @click="exportDiagram"
      ></v-btn>
      <v-btn
        icon="mdi-close"
        size="small"
        @click="$emit('close')"
      ></v-btn>
    </v-toolbar>

    <v-card-text class="pa-0 diagram-content">
      <div v-if="error" class="error-container pa-4">
        <v-alert type="error" variant="tonal">
          <v-alert-title>Generation Failed</v-alert-title>
          {{ error }}
          <div class="mt-2">
            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="mdi-refresh-circle"
              @click="generateDiagram(true)"
              :loading="loading"
            >
              Try Force Refresh
            </v-btn>
          </div>
        </v-alert>
      </div>

      <div v-else-if="loading" class="loading-container">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Generating {{ selectedType }} diagram...</p>
      </div>

      <div v-else-if="diagram" class="diagram-container">
        <div ref="mermaidContainer" class="mermaid-wrapper"></div>
      </div>

      <div v-else class="empty-state">
        <v-icon size="64" color="grey-lighten-1">mdi-chart-tree</v-icon>
        <p class="mt-4 text-grey">Select code and click refresh to generate UML diagram</p>

        <div v-if="!aiAvailable && (selectedType === 'sequence' || selectedType === 'dependency')" class="mt-4">
          <v-alert type="warning" variant="tonal" density="compact">
            <v-alert-title>AI Required</v-alert-title>
            {{ selectedType }} diagrams require AI configuration. Please configure your AI provider in settings.
          </v-alert>
        </div>

        <div v-if="generationMode" class="mt-4 text-caption text-grey">
          Generation Mode: {{ generationMode }} {{ aiAvailable ? '(AI Available)' : '(Native Only)' }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { useTheme } from 'vuetify';
import mermaid from 'mermaid';
import axios from 'axios';

// Props
interface Props {
  code?: string;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  close: [];
}>();

// State
type DiagramType = 'class' | 'flowchart' | 'sequence' | 'dependency';
const selectedType = ref<DiagramType>('class');
const loading = ref(false);
const error = ref<string | null>(null);
const diagram = ref<string | null>(null);
const currentCode = ref<string>('');
const mermaidContainer = ref<HTMLElement | null>(null);
const aiAvailable = ref(false);
const generationMode = ref<string>('hybrid');
const supportedTypes = ref<any[]>([]);

// Theme
const theme = useTheme();
const toolbarColor = computed(() => {
  return theme.global.current.value.dark ? '#121212' : 'primary';
});

// Initialize Mermaid and fetch supported types
onMounted(async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'monospace',
  });

  // Fetch supported diagram types and AI availability
  await fetchSupportedTypes();
});

// Fetch supported types from API
async function fetchSupportedTypes() {
  try {
    const response = await axios.get('/api/uml/supported-types');
    if (response.data.success) {
      supportedTypes.value = response.data.data.types;
      aiAvailable.value = response.data.data.aiAvailable;
      generationMode.value = response.data.data.generationMode;
    }
  } catch (err) {
    console.error('Failed to fetch supported types:', err);
  }
}

// Watch for code changes
watch(() => props.code, (newCode) => {
  if (newCode) {
    currentCode.value = newCode;
    generateDiagram();
  }
}, { immediate: true });

// Watch for type changes
watch(selectedType, () => {
  if (currentCode.value) {
    generateDiagram();
  }
});

// Watch for diagram changes and render when ready
watch(diagram, async (newDiagram) => {
  if (newDiagram && !loading.value) {
    await renderMermaid();
  }
});

// Generate UML diagram
async function generateDiagram(forceRefresh = false) {
  if (!currentCode.value) {
    return;
  }

  loading.value = true;
  error.value = null;
  diagram.value = null;

  try {
    const response = await axios.post('/api/uml/generate', {
      code: currentCode.value,
      type: selectedType.value,
      forceRefresh,
    });

    if (response.data.success) {
      diagram.value = response.data.data.mermaidCode;
      // Rendering will be triggered by the watch

      // Show notification if this was a forced refresh
      if (forceRefresh && response.data.data.forceRefreshed) {
        console.log('UML diagram forcefully regenerated, cache updated');
      }
    } else {
      error.value = response.data.error || 'Failed to generate diagram';
    }
  } catch (err) {
    console.error('UML generation error:', err);
    error.value = err instanceof Error ? err.message : 'Failed to generate diagram';
  } finally {
    loading.value = false;
  }
}

// Render Mermaid diagram
async function renderMermaid() {
  if (!diagram.value) {
    error.value = 'No diagram data available';
    return;
  }

  // Wait for DOM to update
  await nextTick();

  // Sometimes we need to wait a bit longer for the dialog to fully render
  await new Promise(resolve => setTimeout(resolve, 100));

  // Check if container is ready (with retry)
  let retries = 0;
  const maxRetries = 5;

  while (!mermaidContainer.value && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (!mermaidContainer.value) {
    error.value = 'Failed to render diagram: container not ready';
    return;
  }

  try {
    // Clear previous diagram
    mermaidContainer.value.innerHTML = '';

    // Generate unique ID for this diagram
    const id = `mermaid-${Date.now()}`;

    // Render diagram
    const { svg } = await mermaid.render(id, diagram.value);

    // Insert SVG
    mermaidContainer.value.innerHTML = svg;

    // Add zoom functionality
    addZoomControls();
  } catch (err) {
    console.error('Mermaid render error:', err);
    error.value = `Failed to render diagram: ${(err as Error).message}`;
  }
}

// Add zoom and pan controls
function addZoomControls() {
  if (!mermaidContainer.value) return;

  const svg = mermaidContainer.value.querySelector('svg');
  if (!svg) return;

  // Get the parent container for scrolling
  const container = mermaidContainer.value.parentElement;
  if (!container) return;

  let scale = 1;
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  // Set viewBox for proper scaling
  const bbox = svg.getBBox();
  svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

  // Set initial size to fit content
  svg.style.width = `${bbox.width}px`;
  svg.style.height = `${bbox.height}px`;

  // Mouse wheel zoom
  mermaidContainer.value.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= delta;
    scale = Math.max(0.1, Math.min(5, scale));

    // Apply transform and update size
    svg.style.transform = `scale(${scale})`;
    svg.style.transformOrigin = 'top left';

    // Update wrapper size to accommodate scaled SVG
    const wrapper = mermaidContainer.value;
    if (wrapper) {
      // Calculate scaled dimensions with padding
      const scaledWidth = bbox.width * scale + 40; // 20px padding on each side
      const scaledHeight = bbox.height * scale + 40;
      wrapper.style.width = `${scaledWidth}px`;
      wrapper.style.height = `${scaledHeight}px`;
    }
  });

  // Pan with mouse drag
  const handleMouseDown = (e: MouseEvent) => {
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    svg.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPanning) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    container.scrollLeft = scrollLeft - dx;
    container.scrollTop = scrollTop - dy;
  };

  const handleMouseUp = () => {
    if (isPanning) {
      isPanning = false;
      svg.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    if (isPanning) {
      isPanning = false;
      svg.style.cursor = 'grab';
    }
  };

  // Add event listeners
  svg.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  svg.addEventListener('mouseleave', handleMouseLeave);

  svg.style.cursor = 'grab';
}

// Export diagram
async function exportDiagram() {
  if (!mermaidContainer.value || !diagram.value) {
    return;
  }

  const svg = mermaidContainer.value.querySelector('svg');
  if (!svg) return;

  try {
    // Get SVG as string
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    // Create download link
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedType.value}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
    error.value = 'Failed to export diagram';
  }
}
</script>

<style scoped>
.uml-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.diagram-content {
  flex: 1 !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.diagram-container {
  height: 100%;
  overflow: auto;
  background: #f5f5f5;
  position: relative;
}

.mermaid-wrapper {
  min-height: 100%;
  min-width: 100%;
  display: block;
  padding: 20px;
  overflow: visible;
}

.mermaid-wrapper :deep(svg) {
  display: block;
  max-width: none;
  transition: transform 0.1s ease;
  transform-origin: top left;
}

.loading-container {
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: rgba(0, 0, 0, 0.6);
}

.error-container {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* Mermaid diagram styling */
:deep(.mermaid) {
  background: white;
  padding: 20px;
  border-radius: 4px;
}

/* Class diagram styling */
:deep(.classGroup rect) {
  fill: #e3f2fd !important;
  stroke: #1976d2 !important;
}

:deep(.classGroup text) {
  fill: #000 !important;
  font-family: monospace !important;
}

/* Flowchart styling */
:deep(.flowchart-link) {
  stroke: #1976d2 !important;
}

:deep(.node rect),
:deep(.node circle),
:deep(.node polygon) {
  fill: #e3f2fd !important;
  stroke: #1976d2 !important;
}
</style>
