import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    name: 'react',
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
