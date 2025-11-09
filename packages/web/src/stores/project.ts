import { defineStore } from 'pinia';
import { ref } from 'vue';
import { projectApi, fileApi } from '../services/api';
import type { ProjectInfo, FileNode } from '../types/project';

export const useProjectStore = defineStore('project', () => {
  const projectInfo = ref<ProjectInfo | null>(null);
  const fileTree = ref<FileNode | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjectInfo() {
    loading.value = true;
    error.value = null;
    try {
      projectInfo.value = await projectApi.getProjectInfo();
      return projectInfo.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchFileTree() {
    loading.value = true;
    error.value = null;
    try {
      fileTree.value = await projectApi.getFileTree();
      return fileTree.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchFileContent(filePath: string): Promise<string> {
    loading.value = true;
    error.value = null;
    try {
      const content = await fileApi.getFileContent(filePath);
      return content;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    projectInfo,
    fileTree,
    loading,
    error,
    fetchProjectInfo,
    fetchFileTree,
    fetchFileContent,
  };
});
