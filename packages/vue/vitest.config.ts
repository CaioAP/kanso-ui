import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Test against core's source, not its build output — same mapping the
      // root tsconfig `paths` uses. Whether the *published* entry points
      // resolve is a separate question, answered by publint/attw and the
      // clean-directory install check in Phase 1.
      '@caioalfonso/kanso-core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'vue',
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
