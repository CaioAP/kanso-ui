/**
 * The single source of truth for Field's part names.
 *
 * Consumed by the stylesheet and the docs site's anatomy table. Renaming a part
 * is a breaking change — consumers style against these strings. See `docs/05` §8.
 *
 * `error-text` is hyphenated where `docs/03` §5 wrote `errorText`, because these
 * strings are attribute values rather than identifiers and every other part in
 * the library is lowercase (`group-label`, `hidden-input`).
 */
export const fieldAnatomy = ['root', 'label', 'control', 'description', 'error-text'] as const;

export type FieldPart = (typeof fieldAnatomy)[number];
