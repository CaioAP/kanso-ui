/**
 * Menu — state, events, ids.
 *
 * See `docs/03` §4, whose "Decisions taken before implementation" block settles
 * the nine questions this file encodes, including the two places the spec was
 * wrong before Phase 4 started. Same rules as every other component: no id
 * generation, no framework types, no DOM references (CLAUDE.md rule 3).
 */

/**
 * Where the content sits relative to the trigger.
 *
 * Four values rather than a free string: the stylesheet has to have a rule for
 * each, and `menu.dom.ts` only ever flips between them. Measured once at open —
 * `docs/03` §4 decision 9.
 */
export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Which end of the list focus lands on when the menu opens. */
export type MenuOpenFocus = 'first' | 'last';

export interface MenuIds {
  root: string;
  trigger: string;
  content: string;
}

export interface MenuState {
  open: boolean;
  /** Whether the arrows wrap past the ends. */
  loop: boolean;
  /** Whether typing letters moves focus. */
  typeahead: boolean;
  /**
   * How the menu was opened, which decides where focus lands. `ArrowUp` on the
   * trigger opens at the last item; everything else opens at the first
   * (`docs/03` §4 decision 7). It is state rather than an argument because the
   * content mounts *after* the event that opened it, and the effect that moves
   * focus runs later still.
   */
  openFocus: MenuOpenFocus;
  placement: MenuPlacement;
  ids: MenuIds;
}

/**
 * `SELECT` is separate from `CLOSE` even though both close the menu, because
 * the adapter has to tell them apart: only one of them fires `onSelect`. The
 * reducer treats them almost identically; the difference is in what the caller
 * reports, which is the same division Switch draws between `TOGGLE` and
 * `SET_CHECKED`.
 */
export type MenuEvent =
  | { type: 'OPEN'; focus?: MenuOpenFocus }
  | { type: 'CLOSE' }
  | { type: 'SET_OPEN'; value: boolean }
  | { type: 'SELECT'; value: string }
  | { type: 'SET_PLACEMENT'; value: MenuPlacement };

export type MenuSend = (event: MenuEvent) => void;

/** What an adapter passes in to build the initial state. */
export interface MenuStateInit {
  /** Framework-stable id. React 19 `useId()`, Vue 3.5+ `useId()`, or a user id. */
  id: string;
  open?: boolean;
  loop?: boolean;
  typeahead?: boolean;
  openFocus?: MenuOpenFocus;
  placement?: MenuPlacement;
}
