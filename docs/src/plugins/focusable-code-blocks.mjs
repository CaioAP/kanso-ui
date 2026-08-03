/**
 * Make every code block keyboard-scrollable.
 *
 * Expressive Code renders `<pre>` with `overflow-x: auto` and no `tabindex`, so
 * a block whose longest line exceeds the column is a scrollable region a
 * keyboard user cannot reach. axe reports it as `scrollable-region-focusable`,
 * serious, and it is a real WCAG 2.1.1 failure: the content is there and there
 * is no way to get to it without a pointer.
 *
 * This repo has found the same defect three times — on the Switch page, on a
 * Menu embed and on the Card page — and fixed it each time by shortening the
 * example. That works and it does not scale: whether a block overflows depends
 * on the viewport, so at 360px every realistic code sample overflows and no
 * amount of shortening helps. Hence a structural fix rather than a stylistic
 * one. Shortening lines is still worth doing; it is just not the guarantee.
 *
 * The cost is one tab stop per code block. That is the intended trade — the
 * alternative is content reachable only by mouse.
 *
 * WHY TWO PLUGINS FOR ONE ATTRIBUTE. Starlight runs Expressive Code through two
 * separate configuration paths, and they do not share a config object:
 *
 *   - The `<Code>` component — what ComponentPreview renders — reads
 *     `ec.config.mjs`, and *only* that file. Passing the same options inline in
 *     astro.config.mjs fails the build outright, because that path serialises
 *     its config to JSON and a plugin is a function.
 *   - Markdown and MDX code fences go through the integration, which does not
 *     read `ec.config.mjs` at all.
 *
 * So the EC plugin below covers the component, and the rehype plugin covers the
 * fences by editing the final HTML tree after Expressive Code has produced it.
 * Either one alone leaves half the site's code blocks unreachable, which is
 * exactly the state the guides were in when this was written.
 */

/** @param {import('hast').Element} node */
function findPre(node) {
  if (node.tagName === 'pre') return node;
  for (const child of node.children ?? []) {
    if (child.type !== 'element') continue;
    const found = findPre(child);
    if (found) return found;
  }
  return undefined;
}

/** @param {import('hast').Element} pre */
function makeFocusable(pre) {
  // hast property names are camelCase — a lowercase `tabindex` key is dropped
  // on serialisation and the block builds looking exactly like one that worked.
  pre.properties = { ...pre.properties, tabIndex: 0 };
}

/**
 * For the `<Code>` component. Configured in ec.config.mjs.
 *
 * @returns {import('@expressive-code/core').ExpressiveCodePlugin}
 */
export function focusableCodeBlocks() {
  return {
    name: 'focusable-code-blocks',
    hooks: {
      postprocessRenderedBlock: ({ renderData }) => {
        const pre = findPre(renderData.blockAst);
        if (pre) makeFocusable(pre);
      },
    },
  };
}

/**
 * For markdown and MDX code fences. Configured in astro.config.mjs, where it
 * must run after Expressive Code — user rehype plugins do.
 */
export function rehypeFocusableCodeBlocks() {
  /** @param {import('hast').Root} tree */
  return (tree) => {
    /** @param {import('hast').Root | import('hast').Element} node */
    const walk = (node) => {
      for (const child of node.children ?? []) {
        if (child.type !== 'element') continue;
        if (child.tagName === 'pre') makeFocusable(child);
        else walk(child);
      }
    };
    walk(tree);
  };
}
