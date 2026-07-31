/**
 * The single source of truth for Button's part names.
 *
 * Consumed by the stylesheet and the docs site's anatomy table. Renaming a part
 * is a breaking change — consumers style against these strings. See `docs/05` §8.
 *
 * `label` exists for one reason: `visibility: hidden` and `display: none` both
 * remove an element from the accessibility tree, so the obvious way to swap a
 * label for a spinner also deletes the button's accessible name. Fading with
 * `opacity` keeps the name, and fading needs something to fade that is not the
 * button itself. `docs/03` §6 decision 4.
 */
export const buttonAnatomy = ['root', 'label'] as const;

export type ButtonPart = (typeof buttonAnatomy)[number];
