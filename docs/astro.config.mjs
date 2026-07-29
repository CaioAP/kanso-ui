import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';

// Static output only. Never add an SSR adapter and never add wrangler.jsonc —
// Cloudflare Pages uploads dist/, and the Workers flow would rebuild for a
// runtime this site does not target. See docs/05 §10.
export default defineConfig({
  site: 'https://kanso-ui.pages.dev',
  integrations: [
    starlight({
      title: 'kanso-ui',
      description:
        'Headless, accessible components for Vue 3 and React 19, built on one framework-agnostic core.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/CaioAP/kanso-ui' }],
      sidebar: [
        {
          label: 'Getting started',
          items: [{ label: 'Introduction', slug: 'getting-started/introduction' }],
        },
      ],
    }),
    // Both integrations are required: one docs page mounts a Vue island and a
    // React island side by side, and that pairing is the whole thesis.
    // Forgetting either gives a cryptic build error.
    vue(),
    react(),
  ],
});
