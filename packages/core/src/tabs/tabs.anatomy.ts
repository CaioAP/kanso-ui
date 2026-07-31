/**
 * The single source of truth for Tabs' part names.
 *
 * Consumed by the stylesheet and the docs site's anatomy table. Renaming a part
 * is a breaking change — consumers style against these strings. See `docs/05` §8.
 *
 * `indicator` appears in `docs/03`'s prose but is deliberately not a v1 part:
 * positioning one element under whichever trigger is selected needs element
 * measurement, and the selected trigger draws its own rule in CSS instead.
 * `docs/03` §2 decision 5.
 */
export const tabsAnatomy = ['root', 'list', 'trigger', 'content'] as const;

export type TabsPart = (typeof tabsAnatomy)[number];
