/**
 * Switch — the shape of its state, its events, and the ids it needs.
 *
 * See docs/01 §8 and docs/03 §1. Note what is not here: no id generation, no
 * framework types, no DOM references. Ids arrive as input (CLAUDE.md rule 3).
 */

/**
 * Every id the component needs, derived from one framework-supplied id.
 *
 * Pure and total: the same input always produces the same output, which is what
 * makes the server render and the client render agree. A counter or a random
 * value here is the single most common headless-library bug.
 */
export interface SwitchIds {
  root: string;
  control: string;
  label: string;
  hiddenInput: string;
}

export interface SwitchState {
  checked: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  /** Set to enable form participation; the adapter renders the hidden input. */
  name?: string;
  /** Submitted value when checked. Defaults to "on", matching a native checkbox. */
  value: string;
  /**
   * Whether the adapter actually renders a `<label>`. Drives `aria-labelledby`:
   * pointing it at an element that does not exist is worse than omitting it,
   * because the control then announces as nameless rather than falling back.
   */
  hasLabel: boolean;
  ids: SwitchIds;
}

/**
 * `TOGGLE` is the user asking; `SET_CHECKED` is the consumer telling.
 *
 * Only `TOGGLE` respects `disabled` / `readOnly` — those describe what a user may
 * do, not what a controlled parent may write.
 */
export type SwitchEvent = { type: 'TOGGLE' } | { type: 'SET_CHECKED'; value: boolean };

export type SwitchSend = (event: SwitchEvent) => void;

/** What an adapter passes in to build the initial state. */
export interface SwitchStateInit {
  /** Framework-stable id. React 19 `useId()`, Vue 3.5+ `useId()`, or a user id. */
  id: string;
  checked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  hasLabel?: boolean;
}
