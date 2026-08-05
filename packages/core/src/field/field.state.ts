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
 * Which single message the field is showing beneath its control.
 *
 * A Field has **one** region of text below the control, never two stacked. When
 * a field goes invalid its error replaces the description rather than joining
 * it: two messages competing for the same spot is the layout the user reads as
 * broken, and the second one pushes the first away from the control it belongs
 * to.
 *
 * This is the one ordered list. `fieldDescribedBy` reads it, both adapters read
 * it through `fieldShowsErrorText` / `fieldShowsDescription`, and a third kind
 * of message — a character counter, a pending-validation note — is inserted
 * here and nowhere else. That is the whole reason it is a resolver returning a
 * part name rather than two independent booleans that can disagree.
 *
 * **Noted tradeoff:** a description often carries the rule the error is
 * complaining about ("8 characters or more"), and hiding it mid-correction is a
 * real loss. Recorded rather than hidden; `docs/03` §5 decision 8.
 */
export function fieldMessage(state: FieldState): 'error-text' | 'description' | undefined {
  // Highest priority first. The error wins because it is the newer information
  // and the one the user has to act on.
  if (state.hasErrorText && state.invalid) return 'error-text';
  if (state.hasDescription) return 'description';
  return undefined;
}

/**
 * Compose `aria-describedby` from whichever ids actually point at something.
 *
 * The whole component exists for these few lines, so they are worth stating
 * exactly:
 *
 * - At most **one** of the description and the error is referenced, because at
 *   most one of them is rendered — `fieldMessage` decides which, so the
 *   attribute cannot drift from the markup. Referencing a description that the
 *   field no longer renders is a dangling idref; referencing one that is
 *   rendered but visually replaced is worse, because it is a claim only a
 *   screen-reader user can be misled by.
 * - The error is chosen only while **invalid**, because that is when its
 *   element has any text in it. An idref pointing at an empty element is not a
 *   crash, but it is a claim about a description that is not there.
 * - The consumer's own ids come last, appended rather than replaced.
 * - With nothing to say the result is `undefined`, never `''`. An empty
 *   `aria-describedby` is not the same as no `aria-describedby`, and the naive
 *   test for it (`toBe('')`) passes on the broken version.
 */
export function fieldDescribedBy(state: FieldState, consumerIds?: string): string | undefined {
  const ids: string[] = [];

  const message = fieldMessage(state);
  if (message === 'description') ids.push(state.ids.description);
  if (message === 'error-text') ids.push(state.ids.errorText);

  // Split on any run of whitespace: an idref list is whitespace-separated, and a
  // consumer who writes `"a  b"` or a newline between ids means two ids.
  const extra = consumerIds?.trim();
  if (extra !== undefined && extra !== '') ids.push(...extra.split(/\s+/));

  return ids.length === 0 ? undefined : ids.join(' ');
}
