<template>
  <v-app :theme="uiStore.theme">
    <router-view />

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="uiStore.snackbar.show"
      :color="uiStore.snackbar.color"
      :timeout="uiStore.snackbar.timeout"
      location="top"
    >
      {{ uiStore.snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="uiStore.hideSnackbar()"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUIStore } from './stores/ui';

const uiStore = useUIStore();

onMounted(() => {
  uiStore.loadTheme();
});
</script>

<style scoped>
/* App styles */
</style>
