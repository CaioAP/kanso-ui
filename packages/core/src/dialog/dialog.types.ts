/**
 * Dialog — state, events, ids.
 *
 * See `docs/03` §3, whose "Decisions taken before implementation" block settles
 * the questions this file encodes. Same rules as Switch and Tabs: no id
 * generation, no framework types, no DOM references (CLAUDE.md rule 3) — the
 * DOM work lives in `dialog.dom.ts`, invoked by adapters from a lifecycle hook.
 */

/**
 * `alertdialog` is a prop rather than a separate component: the only
 * differences are this attribute and the guidance about what to focus, and a
 * second component would duplicate seven parts to change one string.
 * See `docs/03` §3 decision 9.
 */
export type DialogRole = 'dialog' | 'alertdialog';

/**
 * Only the four ids that are actually referenced by something.
 *
 * Notably absent is anything for `aria-controls` on the trigger. The content is
 * unmounted while closed, so an `aria-controls` on the trigger would dangle
 * whenever the dialog is shut — which is most of the time. `aria-haspopup` and
 * `aria-expanded` say what a dialog trigger needs to say, and neither is an
 * idref.
 */
export interface DialogIds {
  trigger: string;
  content: string;
  title: string;
  description: string;
}

export interface DialogState {
  open: boolean;
  /** Modal traps focus and locks scrolling. Non-modal does neither. */
  modal: boolean;
  role: DialogRole;
  closeOnEscape: boolean;
  closeOnInteractOutside: boolean;
  /**
   * Whether a `Title` part is mounted. Registered by the child rather than
   * assumed, because `aria-labelledby` pointing at an element that was never
   * rendered is worse than no label at all — the third occurrence of that
   * defect class in this repo. See `docs/03` §3 decision 3.
   */
  hasTitle: boolean;
  hasDescription: boolean;
  /** A consumer's own `aria-label` on the content wins over the title idref. */
  hasAriaLabel: boolean;
  ids: DialogIds;
}

/**
 * `OPEN` / `CLOSE` are what the user does — the trigger, `Escape`, a press
 * outside, the close button. `SET_OPEN` is how a controlled consumer writes the
 * value. They are kept apart for the same reason Switch separates `TOGGLE` from
 * `SET_CHECKED`: it leaves room for a future guard on the user-driven path
 * (`closeOnEscape` is one already, applied where the listener is attached)
 * without constraining what a consumer may write.
 */
export type DialogEvent =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SET_OPEN'; value: boolean };

export type DialogSend = (event: DialogEvent) => void;

/** What an adapter passes in to build the initial state. */
export interface DialogStateInit {
  /** Framework-stable id. React 19 `useId()`, Vue 3.5+ `useId()`, or a user id. */
  id: string;
  open?: boolean;
  modal?: boolean;
  role?: DialogRole;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  hasTitle?: boolean;
  hasDescription?: boolean;
  hasAriaLabel?: boolean;
}
