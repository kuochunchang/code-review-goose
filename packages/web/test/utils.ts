import { mount, VueWrapper } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

/**
 * Create a test wrapper for Vue components with Vuetify and Pinia
 */
export function createWrapper(component: any, options: any = {}): VueWrapper {
  const vuetify = createVuetify({
    components,
    directives,
  });
  const pinia = createPinia();

  return mount(component, {
    global: {
      plugins: [vuetify, pinia],
      stubs: options.stubs || {},
    },
    ...options,
  });
}

/**
 * Wait for the next tick
 */
export const nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create a mock file tree for testing
 */
export function createMockFileTree() {
  return {
    name: 'src',
    type: 'directory',
    path: 'src',
    children: [
      {
        name: 'index.ts',
        type: 'file',
        path: 'src/index.ts',
        size: 1024,
      },
      {
        name: 'utils',
        type: 'directory',
        path: 'src/utils',
        children: [
          {
            name: 'helpers.ts',
            type: 'file',
            path: 'src/utils/helpers.ts',
            size: 512,
          },
        ],
      },
    ],
  };
}
