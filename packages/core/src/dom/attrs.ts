/**
 * Emit a data attribute only when the condition holds.
 *
 * `data-disabled=""` renders as a bare `data-disabled` and matches
 * `[data-disabled]` in CSS; `undefined` removes the attribute entirely. The
 * difference matters — `data-disabled="false"` would still match the selector.
 */
export const dataAttr = (cond: boolean | undefined): '' | undefined => (cond ? '' : undefined);

/**
 * Emit an ARIA attribute only when the condition holds.
 *
 * Absent is not the same as `false` for every ARIA state, and an attribute that
 * does not apply is better left off than set to a default.
 */
export const ariaAttr = (cond: boolean | undefined): true | undefined => (cond ? true : undefined);
