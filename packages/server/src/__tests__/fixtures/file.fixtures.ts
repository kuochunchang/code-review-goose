/**
 * 基础文件信息
 */
export const mockFileInfo = {
  size: 1024,
  isLargeFile: false,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: false,
  name: 'test.ts',
};

/**
 * 大文件信息
 */
export const mockLargeFileInfo = {
  size: 10485760, // 10MB
  isLargeFile: true,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: false,
  name: 'large-file.ts',
};

/**
 * 小文件信息
 */
export const mockSmallFileInfo = {
  size: 256,
  isLargeFile: false,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: false,
  name: 'small.ts',
};

/**
 * 目录信息
 */
export const mockDirectoryInfo = {
  size: 0,
  isLargeFile: false,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: true,
  name: 'src',
};

/**
 * 基础文件内容 - TypeScript测试代码
 */
export const mockFileContent = `import { describe, it, expect } from 'vitest';

describe('Test Suite', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});`;

/**
 * Vue组件内容
 */
export const mockVueFileContent = `<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('Hello World');

const handleClick = () => {
  console.log('Button clicked');
};
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>`;

/**
 * JavaScript文件内容
 */
export const mockJsFileContent = `export function calculateSum(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export default {
  calculateSum,
  multiply,
};`;

/**
 * 文件块（用于大文件分块读取）
 */
export const mockFileChunk = {
  content: 'chunk content line 1\nchunk content line 2\nchunk content line 3',
  offset: 1024,
  totalSize: 10240,
  hasMore: true,
  isLargeFile: true,
};

/**
 * 第一块文件内容
 */
export const mockFirstChunk = {
  content: 'First chunk of the file...',
  offset: 0,
  totalSize: 5120,
  hasMore: true,
  isLargeFile: true,
};

/**
 * 最后一块文件内容
 */
export const mockLastChunk = {
  content: 'Last chunk of the file...',
  offset: 4096,
  totalSize: 5120,
  hasMore: false,
  isLargeFile: true,
};

/**
 * 完整文件（非大文件）
 */
export const mockCompleteFile = {
  content: mockFileContent,
  offset: 0,
  totalSize: mockFileContent.length,
  hasMore: false,
  isLargeFile: false,
};
