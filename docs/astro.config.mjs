import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import { defineConfig } from 'astro/config';
import { rehypeFocusableCodeBlocks } from './src/plugins/focusable-code-blocks.mjs';

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
      // Expressive Code is configured in ec.config.mjs, not here — see that
      // file for why it cannot live inline.
      // Starlight already flips data-theme on <html>, and the kanso tokens key
      // off the same attribute — so the previews follow the site theme for free.
      // Order matters: the theme file reads --kanso-* and must come after the
      // stylesheet that defines them. See the header of starlight.css.
      customCss: ['@caioalfonso/kanso-styles', './src/styles/starlight.css'],
      sidebar: [
        {
          label: 'Getting started',
          items: [{ label: 'Introduction', slug: 'getting-started/introduction' }],
        },
        {
          label: 'Guides',
          // Accessibility first: it is the reason the library exists, and the
          // one page a reader should not have to go looking for.
          items: [
            { label: 'Accessibility', slug: 'guides/accessibility' },
            { label: 'Architecture', slug: 'guides/architecture' },
            { label: 'Theming', slug: 'guides/theming' },
            { label: 'Server rendering', slug: 'guides/ssr' },
          ],
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
  // Runs after Expressive Code, on the tree it produced. See the plugin's
  // header for why the same fix also has to be repeated in ec.config.mjs.
  //
  // Astro 7 deprecates `markdown.rehypePlugins` in favour of
  // `processor: unified({ rehypePlugins })`, and this stays on the old field
  // deliberately: Starlight registers Expressive Code by *pushing* onto
  // `processor.options.rehypePlugins`, so a plugin passed to `unified()` runs
  // before it — against the original `<pre><code>` that Expressive Code then
  // throws away. The deprecated field is the one that runs last. Revisit when
  // Astro removes it, and check the ordering with a build, not by reading.
  markdown: { rehypePlugins: [rehypeFocusableCodeBlocks] },
});
