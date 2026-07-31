import type { TabsEvent, TabsIds, TabsState, TabsStateInit } from './tabs.types';

export function tabsIds(id: string): TabsIds {
  // The root takes the supplied id verbatim, so a consumer who passes
  // `id="settings"` can select `#settings` and get what they expect.
  return {
    root: id,
    list: `${id}-list`,
  };
}

/**
 * A tab's ids are derived from its value, and the value is encoded.
 *
 * A raw value containing a space produces `aria-controls="t-content-my tab"`,
 * which the parser reads as *two* idrefs, both of which resolve to nothing. The
 * control then has no accessible relationship to its panel and nothing reports
 * an error.
 *
 * `encodeURIComponent` rather than a `replace` of unsafe characters, because it
 * is injective: `"a b"` and `"a-b"` must not collapse onto one id. Every
 * character it leaves alone is legal in both an HTML id and an idref.
 * See `docs/03` §2 decision 3.
 */
export function tabsTriggerId(rootId: string, value: string): string {
  return `${rootId}-trigger-${encodeURIComponent(value)}`;
}

export function tabsContentId(rootId: string, value: string): string {
  return `${rootId}-content-${encodeURIComponent(value)}`;
}

export function initialTabsState(init: TabsStateInit): TabsState {
  return {
    value: init.value,
    orientation: init.orientation ?? 'horizontal',
    activationMode: init.activationMode ?? 'automatic',
    loop: init.loop ?? true,
    ids: tabsIds(init.id),
  };
}

/**
 * The whole of Tabs' state behaviour. Pure: no DOM, no side effects.
 *
 * It is a one-liner because focus is not state. Arrowing between triggers moves
 * DOM focus and changes nothing here — in manual mode it does not even reach the
 * reducer. Only selection lives in state, which is why there is no `focusedValue`
 * field (`docs/03` §2 decision 2).
 *
 * Returns the *same object reference* when nothing changed, so adapters can tell
 * a real change from a no-op by identity and skip the callback.
 */
export function tabsReducer(state: TabsState, event: TabsEvent): TabsState {
  switch (event.type) {
    case 'SET_VALUE':
      return state.value === event.value ? state : { ...state, value: event.value };

    default:
      return state;
  }
}
