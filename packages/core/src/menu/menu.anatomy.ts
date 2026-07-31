/**
 * The single source of truth for Menu's part names.
 *
 * Consumed by the stylesheet and the docs site's anatomy table. Renaming a part
 * is a breaking change — consumers style against these strings. See `docs/05` §8.
 *
 * `root` is not in `docs/03`'s original list and is added deliberately: the menu
 * is not portalled in v1, so something has to be the positioning anchor, and
 * that element is also the single scope root the stylesheet keys off — the
 * arrangement Tabs has and Dialog could not have. See `docs/03` §4 decision 4.
 */
export const menuAnatomy = [
  'root',
  'trigger',
  'positioner',
  'content',
  'item',
  'separator',
  'group',
  'group-label',
] as const;

export type MenuPart = (typeof menuAnatomy)[number];
