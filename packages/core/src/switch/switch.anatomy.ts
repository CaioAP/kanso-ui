/**
 * The single source of truth for Switch's part names.
 *
 * Consumed by the stylesheet (which `data-part` values exist) and the docs site
 * (which renders the anatomy table). Renaming a part is a breaking change —
 * consumers style against these strings. See docs/05 §8.
 */
export const switchAnatomy = ['root', 'control', 'thumb', 'label', 'hidden-input'] as const;

export type SwitchPart = (typeof switchAnatomy)[number];
