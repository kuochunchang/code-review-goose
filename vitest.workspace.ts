import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/cli/vitest.config.ts',
  'packages/server/vitest.config.ts',
  'packages/web/vitest.config.ts',
]);
