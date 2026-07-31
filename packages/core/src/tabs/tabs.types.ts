/**
 * Tabs — state, events, ids.
 *
 * See `docs/03` §2, whose "Decisions taken before implementation" block settles
 * the five design questions this file encodes. Same rules as Switch: no id
 * generation, no framework types, no DOM references (CLAUDE.md rule 3).
 */

import type { Orientation } from '../dom/roving-focus';

export type { Orientation };

/**
 * `automatic` selects a tab as focus reaches it; `manual` waits for
 * `Enter`/`Space`. The difference is only visible to keyboard users, and it
 * matters when selecting costs something — automatic fires `onValueChange` once
 * for every tab arrowed past. See `docs/03` §2.
 */
export type TabsActivationMode = 'automatic' | 'manual';

/**
 * Only two fixed ids. Trigger and content ids depend on a tab's value, so they
 * are functions of it — `tabsTriggerId` / `tabsContentId` — rather than fields.
 * That keeps state a plain data object: no closures to compare, nothing that
 * stops it being logged or serialised.
 */
export interface TabsIds {
  root: string;
  list: string;
}

export interface TabsState {
  /**
   * The selected tab. `undefined` means none — a legitimate controlled state,
   * and one in which the list has no tab stop at all. `docs/03` §2 decision 6.
   */
  value: string | undefined;
  orientation: Orientation;
  activationMode: TabsActivationMode;
  /** Whether the arrow keys wrap past the ends. */
  loop: boolean;
  ids: TabsIds;
}

/**
 * One event, unlike Switch's two.
 *
 * Switch needed `TOGGLE` and `SET_CHECKED` apart because `disabled`/`readOnly`
 * guard what a *user* may do without constraining what a controlled parent may
 * write. Tabs has no such guard — `docs/03` §2 decision 4 keeps per-tab
 * `disabled` out of v1 — so user and consumer intent are the same event.
 */
export type TabsEvent = { type: 'SET_VALUE'; value: string };

export type TabsSend = (event: TabsEvent) => void;

/** What an adapter passes in to build the initial state. */
export interface TabsStateInit {
  /** Framework-stable id. React 19 `useId()`, Vue 3.5+ `useId()`, or a user id. */
  id: string;
  value?: string;
  orientation?: Orientation;
  activationMode?: TabsActivationMode;
  loop?: boolean;
}
