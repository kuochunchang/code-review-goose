<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-keyboard" class="mr-2"></v-icon>
        Keyboard Shortcuts
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text class="pa-4">
        <v-list>
          <v-list-item v-for="(shortcut, index) in shortcuts" :key="index" class="px-0">
            <template v-slot:prepend>
              <v-chip color="primary" variant="outlined" size="small" class="font-weight-bold">
                {{ formatShortcut(shortcut) }}
              </v-chip>
            </template>
            <v-list-item-title class="ml-4">
              {{ shortcut.description }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="$emit('update:modelValue', false)"> Close </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { KeyboardShortcut } from '../composables/useKeyboardShortcuts';
import { formatShortcut } from '../composables/useKeyboardShortcuts';

defineProps<{
  modelValue: boolean;
  shortcuts: KeyboardShortcut[];
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>

<style scoped>
.v-list-item {
  min-height: 48px;
}
</style>
