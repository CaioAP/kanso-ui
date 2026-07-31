/**
 * Field — the shape of its state and the ids it needs.
 *
 * See `docs/03` §5. Note what is not here: **no event union, no reducer, no
 * `send`**. Every input is a prop the consumer owns, so there is nothing for a
 * state machine to hold. `docs/03` §6 decision 1 records why the signature is
 * allowed to say that rather than inventing a transition to look symmetrical.
 */

/**
 * Every id the component needs, derived from one framework-supplied id.
 *
 * Pure and total: the same input always produces the same output, which is what
 * makes the server render and the client render agree. Core never generates an
 * id (`CLAUDE.md` rule 3).
 */
export interface FieldIds {
  root: string;
  label: string;
  control: string;
  description: string;
  errorText: string;
}

export interface FieldState {
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  /**
   * Whether the adapter renders each optional part. Known **during render**,
   * from the props and slots the consumer passed — never from a child
   * registering after it mounts.
   *
   * This is the decision the whole component is built around. A registration
   * would mean the server sends a control with no `aria-describedby` and the
   * attribute appears once JavaScript arrives, so a form that works without
   * JavaScript ships without its description association. `docs/03` §5
   * decision 1.
   */
  hasLabel: boolean;
  hasDescription: boolean;
  hasErrorText: boolean;
  ids: FieldIds;
}

/** What an adapter passes in to build the state. */
export interface FieldStateInit {
  /** Framework-stable id. React 19 `useId()`, Vue 3.5+ `useId()`, or a user id. */
  id: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  hasLabel?: boolean;
  hasDescription?: boolean;
  hasErrorText?: boolean;
}

/** Options for the control prop getters, shared by `<input>` and `<textarea>`. */
export interface FieldControlOptions {
  /**
   * The consumer's own `aria-describedby`, if they wrote one.
   *
   * It is composed with the field's ids rather than replaced by them. Adapters
   * apply core's props last so core wins, which would otherwise drop a
   * consumer's association silently — the exact defect class this component
   * exists to prevent. `docs/03` §5 decision 2.
   */
  describedBy?: string;
}
