import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  target: 'es2022',
  // Peers and workspace siblings must stay external, or the bundle inlines a
  // second copy of React and hooks break at runtime.
  external: ['react', 'react-dom', 'react/jsx-runtime', '@caioalfonso/kanso-core'],
});
