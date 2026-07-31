import { describe, expect, it, vi } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { connectMenu } from './menu.connect';
import { initialMenuState } from './menu.state';
import type { MenuEvent, MenuStateInit } from './menu.types';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = (init: Partial<MenuStateInit> = {}, send: (e: MenuEvent) => void = () => {}) =>
  connectMenu(initialMenuState({ id: 'm', ...init }), send, identity);

const press = (key: string) => ({ key, preventDefault: vi.fn() });

describe('connectMenu — parts and data attributes', () => {
  it('marks the root and only the root with data-kanso', () => {
    // One scope root, unlike Dialog's two: the menu is not portalled, so the
    // whole component lives under one element.
    const a = api({ open: true });
    expect(a.rootProps['data-kanso']).toBe('');
    expect(a.rootProps['data-scope']).toBe('menu');

    expect(a.triggerProps['data-kanso']).toBeUndefined();
    expect(a.contentProps['data-kanso']).toBeUndefined();
    expect(a.positionerProps['data-kanso']).toBeUndefined();
  });

  it('names every part', () => {
    const a = api({ open: true });
    expect(a.rootProps['data-part']).toBe('root');
    expect(a.triggerProps['data-part']).toBe('trigger');
    expect(a.positionerProps['data-part']).toBe('positioner');
    expect(a.contentProps['data-part']).toBe('content');
    expect(a.getItemProps({ value: 'save' })['data-part']).toBe('item');
    expect(a.separatorProps['data-part']).toBe('separator');
    expect(a.getGroupProps({ labelId: 'g' })['data-part']).toBe('group');
    expect(a.getGroupLabelProps({ labelId: 'g' })['data-part']).toBe('group-label');
  });

  it('reports open state where a stylesheet can use it', () => {
    expect(api().rootProps['data-state']).toBe('closed');
    expect(api().triggerProps['data-state']).toBe('closed');

    const open = api({ open: true });
    expect(open.rootProps['data-state']).toBe('open');
    expect(open.contentProps['data-state']).toBe('open');
  });

  it('publishes the placement on the positioner and the content', () => {
    // The stylesheet positions from this, and there is exactly one source for
    // it: state. A DOM utility writing the attribute itself would be a second.
    const a = api({ open: true, placement: 'top-end' });
    expect(a.positionerProps['data-placement']).toBe('top-end');
    expect(a.contentProps['data-placement']).toBe('top-end');
  });
});

describe('connectMenu — the trigger', () => {
  it('is a button that says what it opens', () => {
    const a = api();
    expect(a.triggerProps.type).toBe('button');
    expect(a.triggerProps['aria-haspopup']).toBe('menu');
    expect(a.triggerProps.id).toBe('m-trigger');
  });

  it('reports expansion', () => {
    expect(api().triggerProps['aria-expanded']).toBe(false);
    expect(api({ open: true }).triggerProps['aria-expanded']).toBe(true);
  });

  it('emits no aria-controls, because the content is unmounted while closed', () => {
    expect(api().triggerProps['aria-controls']).toBeUndefined();
    expect(api({ open: true }).triggerProps['aria-controls']).toBeUndefined();
  });

  it('toggles on click', () => {
    const closed = vi.fn();
    api({}, closed).triggerProps.onClick();
    expect(closed).toHaveBeenCalledWith({ type: 'OPEN', focus: 'first' });

    const opened = vi.fn();
    api({ open: true }, opened).triggerProps.onClick();
    expect(opened).toHaveBeenCalledWith({ type: 'CLOSE' });
  });

  it('opens at the first item on ArrowDown and the last on ArrowUp', () => {
    const send = vi.fn();
    const a = api({}, send);

    const down = press('ArrowDown');
    a.triggerProps.onKeyDown(down);
    expect(down.preventDefault).toHaveBeenCalled();
    expect(send).toHaveBeenLastCalledWith({ type: 'OPEN', focus: 'first' });

    const up = press('ArrowUp');
    a.triggerProps.onKeyDown(up);
    expect(up.preventDefault).toHaveBeenCalled();
    expect(send).toHaveBeenLastCalledWith({ type: 'OPEN', focus: 'last' });
  });

  it('has no Enter or Space branch, because a button already clicks', () => {
    // Adding them would open and immediately close: the keypress produces a
    // click of its own, and the click handler toggles.
    const send = vi.fn();
    const a = api({}, send);

    a.triggerProps.onKeyDown(press('Enter'));
    a.triggerProps.onKeyDown(press(' '));

    expect(send).not.toHaveBeenCalled();
  });

  it('leaves other keys alone', () => {
    const send = vi.fn();
    const a = api({}, send);

    const home = press('Home');
    a.triggerProps.onKeyDown(home);

    expect(send).not.toHaveBeenCalled();
    expect(home.preventDefault).not.toHaveBeenCalled();
  });
});

describe('connectMenu — the content', () => {
  it('is a menu, labelled by its trigger', () => {
    const a = api({ open: true });
    expect(a.contentProps.role).toBe('menu');
    expect(a.contentProps.id).toBe('m-content');
    expect(a.contentProps['aria-labelledby']).toBe('m-trigger');
  });

  it('is focusable, because it is the scroll container', () => {
    // `tabindex="0"` rather than `-1`: a long menu scrolls internally, and a
    // scroll container with no keyboard access is a serious axe violation
    // (`scrollable-region-focusable`) and a real problem in Safari. Every Tab
    // inside the menu closes it, so the stop is never stepped onto.
    expect(api({ open: true }).contentProps.tabIndex).toBe(0);
  });

  it('carries no keyboard handler of its own', () => {
    // Arrows, Home/End, typeahead and Tab all need the live item collection or
    // a buffer that survives between presses, so they live in menu.dom.ts.
    expect(api({ open: true }).contentProps.onKeyDown).toBeUndefined();
  });
});

describe('connectMenu — items', () => {
  it('is a real button with the menuitem role', () => {
    const item = api({ open: true }).getItemProps({ value: 'save' });
    expect(item.type).toBe('button');
    expect(item.role).toBe('menuitem');
    expect(item['data-value']).toBe('save');
  });

  it('keeps every item out of the tab order', () => {
    // Tab closes the menu and moves past it, so there is no roving tab stop to
    // maintain — focus inside the menu is moved by script.
    const a = api({ open: true });
    expect(a.getItemProps({ value: 'one' }).tabIndex).toBe(-1);
    expect(a.getItemProps({ value: 'two' }).tabIndex).toBe(-1);
  });

  it('selects on click', () => {
    const send = vi.fn();
    api({ open: true }, send).getItemProps({ value: 'save' }).onClick();
    expect(send).toHaveBeenCalledWith({ type: 'SELECT', value: 'save' });
  });

  it('disables with aria-disabled, never the disabled attribute', () => {
    // A disabled item stays focusable so a keyboard user can discover that it
    // exists and is unavailable. `disabled` would remove it from the ring.
    const item = api({ open: true }).getItemProps({ value: 'save', disabled: true });

    expect(item['aria-disabled']).toBe(true);
    expect(item.disabled).toBeUndefined();
    expect(item['data-disabled']).toBe('');
    expect(item.tabIndex).toBe(-1);
  });

  it('does nothing when a disabled item is clicked', () => {
    const send = vi.fn();
    api({ open: true }, send).getItemProps({ value: 'save', disabled: true }).onClick();
    expect(send).not.toHaveBeenCalled();
  });

  it('omits the disabled attributes entirely when enabled', () => {
    const item = api({ open: true }).getItemProps({ value: 'save' });
    expect(item['aria-disabled']).toBeUndefined();
    expect(item['data-disabled']).toBeUndefined();
  });
});

describe('connectMenu — separators and groups', () => {
  it('marks the separator as a horizontal divider', () => {
    const separator = api({ open: true }).separatorProps;
    expect(separator.role).toBe('separator');
    expect(separator['aria-orientation']).toBe('horizontal');
  });

  it('points a group at its label', () => {
    const a = api({ open: true });
    expect(a.getGroupProps({ labelId: 'm-group-1' })).toMatchObject({
      role: 'group',
      'aria-labelledby': 'm-group-1',
    });
    expect(a.getGroupLabelProps({ labelId: 'm-group-1' }).id).toBe('m-group-1');
  });
});

describe('connectMenu — the api surface', () => {
  it('reports open and writes it', () => {
    const send = vi.fn();
    const a = api({ open: true }, send);

    expect(a.open).toBe(true);

    a.setOpen(false);
    expect(send).toHaveBeenCalledWith({ type: 'SET_OPEN', value: false });
  });
});
