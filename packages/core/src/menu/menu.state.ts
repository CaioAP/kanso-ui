import type { MenuEvent, MenuIds, MenuState, MenuStateInit } from './menu.types';

export function menuIds(id: string): MenuIds {
  return {
    root: id,
    trigger: `${id}-trigger`,
    content: `${id}-content`,
  };
}

export function initialMenuState(init: MenuStateInit): MenuState {
  return {
    open: init.open ?? false,
    loop: init.loop ?? true,
    typeahead: init.typeahead ?? true,
    openFocus: init.openFocus ?? 'first',
    placement: init.placement ?? 'bottom-start',
    ids: menuIds(init.id),
  };
}

/**
 * The whole of Menu's state behaviour. Pure: no DOM, no side effects, no timers
 * — the typeahead buffer, the focus moves and the measurement all live in
 * `menu.dom.ts`, which is what keeps this file worth reading.
 *
 * Returns the *same object reference* when nothing changed, so adapters can
 * tell a real transition from a no-op by identity and skip the callback.
 */
export function menuReducer(state: MenuState, event: MenuEvent): MenuState {
  switch (event.type) {
    case 'OPEN': {
      const openFocus = event.focus ?? 'first';
      // Already open *and* already pointed at the same end: nothing changed.
      if (state.open && state.openFocus === openFocus) return state;
      return { ...state, open: true, openFocus };
    }

    case 'CLOSE':
      return state.open ? { ...state, open: false } : state;

    // Selecting closes the menu. The event is distinct from CLOSE because only
    // this one makes the adapter fire `onSelect`; the reducer's job is just the
    // state, and the state is identical.
    case 'SELECT':
      return state.open ? { ...state, open: false } : state;

    case 'SET_OPEN':
      return state.open === event.value ? state : { ...state, open: event.value };

    // Written by the measurement in `menu.dom.ts`, so the placement has exactly
    // one home. Emitting it as a data attribute from the DOM utility instead
    // would give `data-placement` two sources of truth — the mistake
    // `roving-focus.ts` was designed to avoid with `tabindex`.
    case 'SET_PLACEMENT':
      return state.placement === event.value ? state : { ...state, placement: event.value };

    default:
      return state;
  }
}
