// The styles package has no bundler by design (docs/05 §4): plain CSS, copied.
// `@import` paths stay valid because src/ and dist/ are flat and identical.
import { cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = resolve(root, 'src');
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await cp(src, dist, { recursive: true });

console.log('kanso-styles: copied src -> dist');
