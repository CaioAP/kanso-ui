import { focusableCodeBlocks } from './src/plugins/focusable-code-blocks.mjs';

/**
 * Expressive Code lives in its own file rather than inline in astro.config.mjs
 * because ComponentPreview renders the `<Code>` component, and that path
 * serialises the config to JSON — a plugin is a function and does not survive
 * the trip. Astro says so explicitly if you try.
 *
 * See src/plugins/focusable-code-blocks.mjs for why the plugin exists.
 */
export default {
  plugins: [focusableCodeBlocks()],
};
