<template>
  <div class="uml-page">
    <div class="uml-content">
      <UMLViewer :code="currentCode" @close="handleClose" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import UMLViewer from '../components/UMLViewer.vue';

const currentCode = ref<string>('');

onMounted(() => {
  // Get code from sessionStorage set by the parent window
  const code = sessionStorage.getItem('uml_code');
  if (code) {
    currentCode.value = code;
  } else {
    console.warn('No code found in sessionStorage');
  }
});

const handleClose = () => {
  window.close();
};
</script>

<style scoped>
.uml-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #fafafa;
}

.uml-content {
  flex: 1;
  overflow: hidden;
  padding: 8px;
}

.uml-content :deep(.uml-viewer) {
  height: 100%;
  border-radius: 4px;
}
</style>
