<template>
  <v-dialog v-model="dialog" max-width="600" persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6">Settings</span>
        <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <v-alert v-if="statusMessage" :type="statusType" variant="tonal" class="mb-4">
          {{ statusMessage }}
        </v-alert>

        <!-- AI Provider Selection -->
        <v-select
          v-model="localConfig.aiProvider"
          label="AI Provider"
          :items="providers"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
          class="mb-4"
        ></v-select>

        <!-- OpenAI Configuration -->
        <div v-if="localConfig.aiProvider === 'openai' && localConfig.openai">
          <v-text-field
            v-model="localConfig.openai.apiKey"
            label="OpenAI API Key"
            :type="showApiKey ? 'text' : 'password'"
            :append-inner-icon="showApiKey ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showApiKey = !showApiKey"
            variant="outlined"
            density="comfortable"
            hint="Your API key will be stored locally"
            persistent-hint
            class="mb-3"
          ></v-text-field>

          <v-select
            v-model="localConfig.openai.model"
            label="Model"
            :items="openaiModels"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          ></v-select>

          <v-text-field
            v-model.number="localConfig.openai.timeout"
            label="Request Timeout (ms)"
            type="number"
            variant="outlined"
            density="comfortable"
            hint="Request timeout in milliseconds. Recommended: 60000 for GPT-4, 120000+ for GPT-5"
            persistent-hint
            :min="10000"
            :max="300000"
            :step="1000"
            class="mb-4"
          ></v-text-field>

          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            Get your API key from
            <a href="https://platform.openai.com/api-keys" target="_blank" class="text-primary">
              OpenAI Platform
            </a>
          </v-alert>
        </div>

        <!-- Claude Configuration (Placeholder) -->
        <div v-if="localConfig.aiProvider === 'claude'">
          <v-alert type="warning" variant="tonal" class="mb-4">
            Claude provider is not yet implemented. Coming soon!
          </v-alert>
        </div>

        <!-- Gemini Configuration (Placeholder) -->
        <div v-if="localConfig.aiProvider === 'gemini'">
          <v-alert type="warning" variant="tonal" class="mb-4">
            Gemini provider is not yet implemented. Coming soon!
          </v-alert>
        </div>

        <!-- Configuration Status -->
        <v-card variant="outlined" class="mt-4">
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon
                :icon="isConfigured ? 'mdi-check-circle' : 'mdi-alert-circle'"
                :color="isConfigured ? 'success' : 'warning'"
                class="mr-2"
              ></v-icon>
              <span class="text-body-2">
                Status: {{ isConfigured ? 'Configured' : 'Not Configured' }}
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-btn
          variant="text"
          @click="testConnection"
          :loading="testing"
          :disabled="!hasApiKey"
        >
          Test Connection
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="save"
          :loading="saving"
          :disabled="!hasChanges"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { analysisApi, configApi } from '../services/api';
import type { ProjectConfig } from '../types/analysis';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'saved': [];
}>();

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const providers = [
  { title: 'OpenAI', value: 'openai' },
  { title: 'Claude (Coming Soon)', value: 'claude', disabled: true },
  { title: 'Gemini (Coming Soon)', value: 'gemini', disabled: true },
  { title: 'Ollama (Coming Soon)', value: 'ollama', disabled: true },
];

const openaiModels = [
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-5-pro',
  'gpt-5-codex',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano'
];

const localConfig = ref<ProjectConfig>({
  aiProvider: 'openai',
  openai: {
    apiKey: '',
    model: 'gpt-4',
    timeout: 60000,
  },
});

const originalConfig = ref<ProjectConfig | null>(null);
const showApiKey = ref(false);
const saving = ref(false);
const testing = ref(false);
const isConfigured = ref(false);
const statusMessage = ref('');
const statusType = ref<'success' | 'error' | 'warning' | 'info'>('info');

const hasApiKey = computed(() => {
  if (localConfig.value.aiProvider === 'openai') {
    return !!localConfig.value.openai?.apiKey;
  }
  return false;
});

const hasChanges = computed(() => {
  if (!originalConfig.value) return false;
  return JSON.stringify(localConfig.value) !== JSON.stringify(originalConfig.value);
});

const loadConfig = async () => {
  try {
    const config = await configApi.getConfig();
    localConfig.value = {
      ...config,
      openai: {
        apiKey: config.openai?.apiKey || '',
        model: config.openai?.model || 'gpt-4',
        timeout: config.openai?.timeout || 60000,
      },
    };
    originalConfig.value = JSON.parse(JSON.stringify(localConfig.value));

    // Check status
    const status = await analysisApi.getStatus();
    isConfigured.value = status.configured;
  } catch (error) {
    console.error('Failed to load config:', error);
    statusMessage.value = 'Failed to load configuration';
    statusType.value = 'error';
  }
};

const save = async () => {
  saving.value = true;
  statusMessage.value = '';

  try {
    await configApi.updateConfig(localConfig.value);
    originalConfig.value = JSON.parse(JSON.stringify(localConfig.value));

    // Update status
    const status = await analysisApi.getStatus();
    isConfigured.value = status.configured;

    statusMessage.value = 'Configuration saved successfully';
    statusType.value = 'success';

    emit('saved');

    // Close dialog after a short delay
    setTimeout(() => {
      close();
    }, 1000);
  } catch (error) {
    console.error('Failed to save config:', error);
    statusMessage.value = error instanceof Error ? error.message : 'Failed to save configuration';
    statusType.value = 'error';
  } finally {
    saving.value = false;
  }
};

const testConnection = async () => {
  testing.value = true;
  statusMessage.value = '';

  try {
    // First save the config if there are changes
    if (hasChanges.value) {
      await configApi.updateConfig(localConfig.value);
    }

    // Try a simple analysis to test the connection
    const testCode = 'console.log("test");';
    await analysisApi.analyzeCode(testCode, {
      language: 'javascript',
      checkQuality: false,
      checkSecurity: false,
      checkPerformance: false,
      checkBestPractices: false,
      checkBugs: false,
    });

    statusMessage.value = 'Connection successful!';
    statusType.value = 'success';
    isConfigured.value = true;
  } catch (error) {
    console.error('Connection test failed:', error);
    statusMessage.value = error instanceof Error ? error.message : 'Connection test failed';
    statusType.value = 'error';
  } finally {
    testing.value = false;
  }
};

const close = () => {
  dialog.value = false;
  statusMessage.value = '';

  // Reset to original config if not saved
  if (originalConfig.value) {
    localConfig.value = JSON.parse(JSON.stringify(originalConfig.value));
  }
};

// Load config when dialog opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    loadConfig();
  }
}, { immediate: true });
</script>

<style scoped>
.v-card-text {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
