import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/types/**',
        'dist/**',
        'node_modules/**',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['src/**/*.test.ts'],
    // Fix workspace package resolution for Vitest
    server: {
      deps: {
        inline: [
          '@code-review-goose/analysis-parser-common',
          '@code-review-goose/analysis-parser-typescript',
          '@code-review-goose/analysis-parser-java',
          '@code-review-goose/analysis-parser-python',
        ],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
