/**
 * The single source of truth for Dialog's part names.
 *
 * Consumed by the stylesheet and the docs site's anatomy table. Renaming a part
 * is a breaking change — consumers style against these strings. See `docs/05` §8.
 *
 * Note the nesting these names imply, which is a decision rather than a
 * convention: `backdrop` renders *inside* `positioner`, not beside it. A
 * separately portalled backdrop is a sibling of the content, so the focus trap
 * marks it `inert` — and an inert element receives no pointer events, which
 * silently kills click-outside-to-close. See `docs/03` §3 decision 11.
 */
export const dialogAnatomy = [
  'trigger',
  'positioner',
  'backdrop',
  'content',
  'title',
  'description',
  'close',
] as const;

export type DialogPart = (typeof dialogAnatomy)[number];
