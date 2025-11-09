/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}

declare module 'splitpanes' {
  import { DefineComponent } from 'vue';

  export const Splitpanes: DefineComponent<{
    horizontal?: boolean;
    pushOtherPanes?: boolean;
    dblClickSplitter?: boolean;
    rtl?: boolean;
  }>;

  export const Pane: DefineComponent<{
    size?: number;
    minSize?: number;
    maxSize?: number;
  }>;
}
