// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateMenu, measureMenuPlacement } from './menu.dom';

/**
 * The open menu's whole keyboard table, plus dismissal and the one measurement.
 *
 * jsdom is trustworthy for most of this — the arrows and typeahead move focus
 * between real elements, and nothing here depends on `inert` or on a trap. What
 * it cannot answer is anything about layout, so `measureMenuPlacement` is
 * exercised with stubbed rects here and for real in Playwright.
 */

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`no #${id}`);
  return element;
};

function render(): void {
  document.body.innerHTML = `
    <div id="page">
      <button id="trigger">Actions</button>
      <div id="menu" role="menu" tabindex="-1">
        <button id="archive" role="menuitem" tabindex="-1">Archive</button>
        <button id="save" role="menuitem" tabindex="-1">Save</button>
        <button id="save-as" role="menuitem" tabindex="-1" aria-disabled="true">Save as…</button>
        <button id="settings" role="menuitem" tabindex="-1">Settings</button>
      </div>
      <button id="after">After</button>
    </div>
  `;
}

const releases: (() => void)[] = [];

const activate = (options: Partial<Parameters<typeof activateMenu>[0]> = {}) => {
  const release = activateMenu({
    content: byId('menu'),
    getTrigger: () => byId('trigger'),
    openFocus: 'first',
    loop: true,
    typeahead: true,
    placement: 'bottom-start',
    onClose: () => {},
    onPlacementChange: () => {},
    ...options,
  });
  releases.push(release);
  return release;
};

const press = (key: string, init: KeyboardEventInit = {}) => {
  const target = document.activeElement ?? byId('menu');
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

const focusedId = () => (document.activeElement as HTMLElement | null)?.id;

beforeEach(() => {
  render();
});

afterEach(() => {
  // The dismissable layer stack is module state, so a test that fails before
  // its own teardown would leave a live layer behind and break the next one.
  for (const release of releases.splice(0)) release();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('activateMenu — focus on open', () => {
  it('focuses the first item', () => {
    activate();
    expect(focusedId()).toBe('archive');
  });

  it('focuses the last item when opened with ArrowUp', () => {
    activate({ openFocus: 'last' });
    expect(focusedId()).toBe('settings');
  });

  it('focuses the content itself when the menu has no items', () => {
    document.body.innerHTML =
      '<button id="trigger">Actions</button><div id="menu" role="menu" tabindex="-1"></div>';
    activate();
    expect(focusedId()).toBe('menu');
  });
});

describe('activateMenu — the arrows', () => {
  it('moves down and up', () => {
    activate();

    const down = press('ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(focusedId()).toBe('save');

    press('ArrowUp');
    expect(focusedId()).toBe('archive');
  });

  it('jumps to the ends with Home and End', () => {
    activate();

    press('End');
    expect(focusedId()).toBe('settings');

    press('Home');
    expect(focusedId()).toBe('archive');
  });

  it('wraps past the ends when loop is on', () => {
    activate();

    press('ArrowUp');
    expect(focusedId()).toBe('settings');

    press('ArrowDown');
    expect(focusedId()).toBe('archive');
  });

  it('stops at the ends when loop is off', () => {
    activate({ loop: false });

    press('ArrowUp');
    expect(focusedId()).toBe('archive');

    press('End');
    press('ArrowDown');
    expect(focusedId()).toBe('settings');
  });

  it('lands on disabled items rather than skipping them', () => {
    // A disabled item stays in the ring so a keyboard user can discover that it
    // exists and is unavailable. `docs/03` §4 decision 6.
    activate();

    press('ArrowDown');
    press('ArrowDown');

    expect(focusedId()).toBe('save-as');
  });

  it('leaves the inline arrows alone — there are no submenus in v1', () => {
    activate();

    const right = press('ArrowRight');

    expect(right.defaultPrevented).toBe(false);
    expect(focusedId()).toBe('archive');
  });
});

describe('activateMenu — typeahead', () => {
  it('jumps to the first item matching a letter', () => {
    activate();

    const event = press('s');

    expect(event.defaultPrevented).toBe(true);
    expect(focusedId()).toBe('save');
  });

  it('cycles through matches when the letter is repeated', () => {
    activate();

    press('s');
    expect(focusedId()).toBe('save');
    press('s');
    expect(focusedId()).toBe('save-as');
    press('s');
    expect(focusedId()).toBe('settings');
    press('s');
    expect(focusedId()).toBe('save');
  });

  it('matches a longer prefix as one query', () => {
    activate();

    press('s');
    press('e');

    expect(focusedId()).toBe('settings');
  });

  it('forgets the query after the reset window', () => {
    vi.useFakeTimers();
    activate();

    press('s');
    vi.advanceTimersByTime(600);
    press('e');

    // A fresh query, so this is "the next item starting with e" — of which
    // there is none, leaving focus where it was.
    expect(focusedId()).toBe('save');
  });

  it('does not prevent a keystroke that matches nothing', () => {
    activate();

    const event = press('z');

    expect(event.defaultPrevented).toBe(false);
    expect(focusedId()).toBe('archive');
  });

  it('ignores modified keys, which belong to the browser', () => {
    activate();

    const event = press('f', { ctrlKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(focusedId()).toBe('archive');
  });

  it('leaves Space alone, because it activates the focused item', () => {
    activate();

    const event = press(' ');

    expect(event.defaultPrevented).toBe(false);
    expect(focusedId()).toBe('archive');
  });

  it('does nothing at all when typeahead is off', () => {
    activate({ typeahead: false });

    press('s');

    expect(focusedId()).toBe('archive');
  });
});

describe('activateMenu — Tab', () => {
  it('closes the menu and moves focus to the trigger, without swallowing the press', () => {
    // Not preventing the default is the whole point: the browser then continues
    // its own Tab handling *from the trigger* and lands on what follows. A test
    // that only asserted "the menu closed" would pass with focus stranded.
    const onClose = vi.fn();
    activate({ onClose });

    const event = press('Tab');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
    expect(focusedId()).toBe('trigger');
  });

  it('does the same for Shift+Tab', () => {
    const onClose = vi.fn();
    activate({ onClose });

    press('Tab', { shiftKey: true });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(focusedId()).toBe('trigger');
  });
});

describe('activateMenu — dismissal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn();
    activate({ onClose });

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a press outside', () => {
    const onClose = vi.fn();
    activate({ onClose });

    byId('after').dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a press inside', () => {
    const onClose = vi.fn();
    activate({ onClose });

    byId('save').dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close on a press on the trigger', () => {
    // Excluding the trigger is what lets it toggle: without it, pointerdown
    // dismisses and the click that follows reopens.
    const onClose = vi.fn();
    activate({ onClose });

    byId('trigger').dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not block the press, unlike a modal dialog', () => {
    // A menu is not modal: a press on the page behind should reach — and focus
    // — whatever it hit. `docs/03` §4 decision 8.
    activate();

    const event = new Event('pointerdown', { bubbles: true, cancelable: true });
    byId('after').dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('activateMenu — teardown', () => {
  it('returns focus to the trigger when the menu still holds it', () => {
    const release = activate();
    expect(focusedId()).toBe('archive');

    release();

    expect(focusedId()).toBe('trigger');
  });

  it('leaves focus alone when it has already moved elsewhere', () => {
    // A press outside is on its way somewhere else, and Tab has already put
    // focus on the trigger deliberately. Pulling it back would undo the gesture.
    const release = activate();
    byId('after').focus();

    release();

    expect(focusedId()).toBe('after');
  });

  it('stops handling keys once released', () => {
    const release = activate();
    release();

    byId('menu').focus();
    const event = press('ArrowDown');

    expect(event.defaultPrevented).toBe(false);
  });

  it('is safe to release twice', () => {
    const release = activate();
    release();
    expect(() => release()).not.toThrow();
  });
});

describe('measureMenuPlacement', () => {
  /** jsdom lays nothing out, so the rects are stated rather than measured. */
  const stubRect = (element: HTMLElement, rect: Partial<DOMRect>) => {
    element.getBoundingClientRect = () =>
      ({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
        ...rect,
      }) as DOMRect;
  };

  const viewport = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
  };

  it('stays below and start-aligned when the menu fits', () => {
    viewport(1000, 800);
    stubRect(byId('trigger'), { top: 100, bottom: 140, left: 20, right: 120 });
    stubRect(byId('menu'), { top: 140, bottom: 340, left: 20, right: 220, height: 200 });

    expect(measureMenuPlacement(byId('trigger'), byId('menu'))).toBe('bottom-start');
  });

  it('flips above when it would overflow the bottom and there is room', () => {
    viewport(1000, 400);
    stubRect(byId('trigger'), { top: 300, bottom: 340, left: 20, right: 120 });
    stubRect(byId('menu'), { top: 340, bottom: 540, left: 20, right: 220, height: 200 });

    expect(measureMenuPlacement(byId('trigger'), byId('menu'))).toBe('top-start');
  });

  it('stays below when flipping would not help', () => {
    // A menu taller than the viewport overflows either way, and flipping moves
    // the *first* item off-screen — which is where focus lands.
    viewport(1000, 400);
    stubRect(byId('trigger'), { top: 40, bottom: 80, left: 20, right: 120 });
    stubRect(byId('menu'), { top: 80, bottom: 680, left: 20, right: 220, height: 600 });

    expect(measureMenuPlacement(byId('trigger'), byId('menu'))).toBe('bottom-start');
  });

  it('flips the alignment when it would overflow the inline end', () => {
    viewport(300, 800);
    stubRect(byId('trigger'), { top: 100, bottom: 140, left: 180, right: 280 });
    stubRect(byId('menu'), { top: 140, bottom: 340, left: 180, right: 380, height: 200 });

    expect(measureMenuPlacement(byId('trigger'), byId('menu'))).toBe('bottom-end');
  });

  it('is reported through the callback only when it changes', () => {
    viewport(1000, 800);
    stubRect(byId('trigger'), { top: 100, bottom: 140, left: 20, right: 120 });
    stubRect(byId('menu'), { top: 140, bottom: 340, left: 20, right: 220, height: 200 });

    const onPlacementChange = vi.fn();
    activate({ onPlacementChange, placement: 'bottom-start' });

    // The measurement runs on every open and usually agrees with the default;
    // reporting it anyway would re-render the adapter for nothing.
    expect(onPlacementChange).not.toHaveBeenCalled();
  });

  it('reports a flip', () => {
    viewport(1000, 400);
    stubRect(byId('trigger'), { top: 300, bottom: 340, left: 20, right: 120 });
    stubRect(byId('menu'), { top: 340, bottom: 540, left: 20, right: 220, height: 200 });

    const onPlacementChange = vi.fn();
    activate({ onPlacementChange, placement: 'bottom-start' });

    expect(onPlacementChange).toHaveBeenCalledWith('top-start');
  });
});
