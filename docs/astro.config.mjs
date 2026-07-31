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
      // Starlight already flips data-theme on <html>, and the kanso tokens key
      // off the same attribute — so the previews follow the site theme for free.
      customCss: ['@caioalfonso/kanso-styles'],
      sidebar: [
        {
          label: 'Getting started',
          items: [{ label: 'Introduction', slug: 'getting-started/introduction' }],
        },
        {
          label: 'Components',
          // Build order, not alphabetical — it is the order docs/03 teaches.
          items: [
            { label: 'Switch', slug: 'components/switch' },
            { label: 'Tabs', slug: 'components/tabs' },
            { label: 'Dialog', slug: 'components/dialog' },
            { label: 'Menu', slug: 'components/menu' },
            { label: 'Field', slug: 'components/field' },
            { label: 'Button', slug: 'components/button' },
            { label: 'Card', slug: 'components/card' },
          ],
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
