import { describe, expect, it } from 'vitest';
import { initialMenuState, menuIds, menuReducer } from './menu.state';
import type { MenuState } from './menu.types';

const state = (overrides: Partial<MenuState> = {}): MenuState => ({
  ...initialMenuState({ id: 'm' }),
  ...overrides,
});

describe('menuIds', () => {
  it('derives every part id from the one supplied id', () => {
    expect(menuIds('m')).toEqual({
      root: 'm',
      trigger: 'm-trigger',
      content: 'm-content',
    });
  });

  it('gives the root the supplied id verbatim', () => {
    // So a consumer who passes id="actions" can select #actions and get what
    // they expect — the same contract Tabs' root has.
    expect(menuIds('actions').root).toBe('actions');
  });
});

describe('initialMenuState', () => {
  it('defaults to closed, looping, typeahead on, opening at the first item', () => {
    expect(initialMenuState({ id: 'm' })).toEqual({
      open: false,
      loop: true,
      typeahead: true,
      openFocus: 'first',
      placement: 'bottom-start',
      ids: menuIds('m'),
    });
  });

  it('takes every field from the init when given', () => {
    expect(
      initialMenuState({
        id: 'm',
        open: true,
        loop: false,
        typeahead: false,
        openFocus: 'last',
        placement: 'top-end',
      }),
    ).toMatchObject({
      open: true,
      loop: false,
      typeahead: false,
      openFocus: 'last',
      placement: 'top-end',
    });
  });
});

describe('menuReducer — opening', () => {
  it('opens at the first item by default', () => {
    const next = menuReducer(state(), { type: 'OPEN' });
    expect(next.open).toBe(true);
    expect(next.openFocus).toBe('first');
  });

  it('opens at the last item when asked', () => {
    // ArrowUp on the trigger. The content does not exist yet, which is why this
    // is state rather than an argument to the effect.
    const next = menuReducer(state(), { type: 'OPEN', focus: 'last' });
    expect(next.openFocus).toBe('last');
  });

  it('re-points an already-open menu, and refuses a repeat', () => {
    const open = state({ open: true, openFocus: 'first' });
    expect(menuReducer(open, { type: 'OPEN', focus: 'last' }).openFocus).toBe('last');
    expect(menuReducer(open, { type: 'OPEN', focus: 'first' })).toBe(open);
  });
});

describe('menuReducer — closing', () => {
  it('closes', () => {
    expect(menuReducer(state({ open: true }), { type: 'CLOSE' }).open).toBe(false);
  });

  it('closes on selection, and leaves the rest of the state alone', () => {
    // SELECT and CLOSE do the same thing to the state on purpose. The
    // difference is what the adapter reports: only SELECT fires onSelect.
    const open = state({ open: true, openFocus: 'last', placement: 'top-end' });
    const after = menuReducer(open, { type: 'SELECT', value: 'save' });

    expect(after).toEqual({ ...open, open: false });
  });

  it('SET_OPEN writes either value', () => {
    expect(menuReducer(state(), { type: 'SET_OPEN', value: true }).open).toBe(true);
    expect(menuReducer(state({ open: true }), { type: 'SET_OPEN', value: false }).open).toBe(false);
  });
});

describe('menuReducer — placement', () => {
  it('records a new placement', () => {
    expect(menuReducer(state(), { type: 'SET_PLACEMENT', value: 'top-end' }).placement).toBe(
      'top-end',
    );
  });

  it('refuses one that changes nothing', () => {
    // The measurement runs on every open and usually agrees with the default.
    // Without this the adapter would re-render for no reason each time.
    const before = state();
    expect(menuReducer(before, { type: 'SET_PLACEMENT', value: 'bottom-start' })).toBe(before);
  });
});

describe('menuReducer — no-ops', () => {
  it('returns the same reference when nothing changes', () => {
    const closed = state();
    expect(menuReducer(closed, { type: 'CLOSE' })).toBe(closed);
    expect(menuReducer(closed, { type: 'SELECT', value: 'save' })).toBe(closed);
    expect(menuReducer(closed, { type: 'SET_OPEN', value: false })).toBe(closed);

    const open = state({ open: true });
    expect(menuReducer(open, { type: 'SET_OPEN', value: true })).toBe(open);
  });

  it('ignores an unknown event', () => {
    const before = state();
    expect(menuReducer(before, { type: 'NOPE' } as never)).toBe(before);
  });
});
