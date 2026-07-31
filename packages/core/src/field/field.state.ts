import type { FieldIds, FieldState, FieldStateInit } from './field.types';

/**
 * Derive every id from the one the framework supplied.
 *
 * Pure string concatenation, deliberately. Core must never generate an id — a
 * counter or `Math.random()` produces a different value on the server than on
 * the client, and React/Vue report that as a hydration mismatch. See
 * `CLAUDE.md` rule 3.
 */
export function fieldIds(id: string): FieldIds {
  // The root takes the supplied id verbatim, so a consumer who passes
  // `id="email"` can select `#email` and get what they expect. Everything else
  // is a suffix of it.
  return {
    root: id,
    label: `${id}-label`,
    control: `${id}-control`,
    description: `${id}-description`,
    errorText: `${id}-error`,
  };
}

/**
 * There is no reducer below this — Field has no transitions of its own.
 *
 * Every field of the state is a prop the consumer owns, so adapters call this
 * on every render and the result is always current. `docs/03` §6 decision 1.
 */
export function initialFieldState(init: FieldStateInit): FieldState {
  return {
    invalid: init.invalid ?? false,
    disabled: init.disabled ?? false,
    readOnly: init.readOnly ?? false,
    required: init.required ?? false,
    hasLabel: init.hasLabel ?? false,
    hasDescription: init.hasDescription ?? false,
    hasErrorText: init.hasErrorText ?? false,
    ids: fieldIds(init.id),
  };
}

/**
 * Compose `aria-describedby` from whichever ids actually point at something.
 *
 * The whole component exists for these four lines, so they are worth stating
 * exactly:
 *
 * - The description is included whenever it is rendered.
 * - The error is included only while **invalid**, because that is when the
 *   element has any text in it. An idref pointing at an empty element is not a
 *   crash, but it is a claim about a description that is not there.
 * - The consumer's own ids come last, appended rather than replaced.
 * - With nothing to say the result is `undefined`, never `''`. An empty
 *   `aria-describedby` is not the same as no `aria-describedby`, and the naive
 *   test for it (`toBe('')`) passes on the broken version.
 */
export function fieldDescribedBy(state: FieldState, consumerIds?: string): string | undefined {
  const ids: string[] = [];

  if (state.hasDescription) ids.push(state.ids.description);
  if (state.hasErrorText && state.invalid) ids.push(state.ids.errorText);

  // Split on any run of whitespace: an idref list is whitespace-separated, and a
  // consumer who writes `"a  b"` or a newline between ids means two ids.
  const extra = consumerIds?.trim();
  if (extra !== undefined && extra !== '') ids.push(...extra.split(/\s+/));

  return ids.length === 0 ? undefined : ids.join(' ');
}
