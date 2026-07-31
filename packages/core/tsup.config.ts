import { defineConfig } from 'tsup';

export default defineConfig({
  // One entry per component, plus the barrel. This is what lets a consumer who
  // imports Switch avoid pulling in every other component. See docs/01 §10.
  entry: {
    index: 'src/index.ts',
    switch: 'src/switch/index.ts',
    tabs: 'src/tabs/index.ts',
    dialog: 'src/dialog/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
});
