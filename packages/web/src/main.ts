import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
import router from './router';

import '@mdi/font/css/materialdesignicons.css';
import 'splitpanes/dist/splitpanes.css';
import './styles/main.scss';

// Configure Monaco Editor environment for single-process mode
// This prevents Web Worker errors in testing environments
(self as any).MonacoEnvironment = {
  getWorker(_moduleId: string, _label: string) {
    // Disable workers completely in single-process mode
    // Monaco will fall back to synchronous mode
    return undefined as any;
  },
};

// Also set on window for compatibility
(window as any).MonacoEnvironment = (self as any).MonacoEnvironment;

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(vuetify);

app.mount('#app');
