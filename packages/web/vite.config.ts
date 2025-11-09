import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import path from 'path';
import { readFileSync, existsSync } from 'fs';

// Get backend port from test config file (E2E tests) or environment variable
let backendPort = '3456';

// Try to read from test config file first (for E2E tests)
const testConfigPath = path.join(__dirname, 'e2e/.test-config.json');
if (existsSync(testConfigPath)) {
  try {
    const testConfig = JSON.parse(readFileSync(testConfigPath, 'utf-8'));
    if (testConfig.backendPort) {
      backendPort = String(testConfig.backendPort);
      console.log(`[Vite] Using backend port from test config: ${backendPort}`);
    }
  } catch (error) {
    console.warn('[Vite] Failed to read test config file:', error);
  }
}

// Fall back to environment variable if not in test config
if (!existsSync(testConfigPath) && process.env.BACKEND_PORT) {
  backendPort = process.env.BACKEND_PORT;
}

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
