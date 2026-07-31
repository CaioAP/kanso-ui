/**
 * The single source of truth for Card's part names.
 *
 * Consumed by the stylesheet and the docs site's anatomy table. Renaming a part
 * is a breaking change — consumers style against these strings. See `docs/05` §8.
 */
export const cardAnatomy = ['root', 'header', 'body', 'footer'] as const;

export type CardPart = (typeof cardAnatomy)[number];
