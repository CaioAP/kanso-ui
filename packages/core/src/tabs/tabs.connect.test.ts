import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { connectTabs } from './tabs.connect';
import { initialTabsState } from './tabs.state';
import type { TabsEvent, TabsStateInit } from './tabs.types';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = (init: Partial<TabsStateInit> = {}, send: (e: TabsEvent) => void = () => {}) =>
  connectTabs(initialTabsState({ id: 't', ...init }), send, identity);

interface StubTrigger {
  dataset: { value?: string };
  focus: ReturnType<typeof vi.fn>;
}

/**
 * A tablist as the key handler sees it: core queries the DOM at keypress time
 * rather than keeping a registry, so the tests have to supply a DOM.
 *
 * These run in the `node` environment, which is the point — nothing here can
 * accidentally depend on a real document being present at import time.
 */
function stubTriggers(values: string[], listId = 't-list'): StubTrigger[] {
  const items: StubTrigger[] = values.map((value) => ({ dataset: { value }, focus: vi.fn() }));
  vi.stubGlobal('document', {
    getElementById: (id: string) => (id === listId ? { querySelectorAll: () => items } : null),
  });
  return items;
}

/**
 * How many times each item was focused, in document order.
 *
 * Asserting the whole shape rather than one element catches the failure that
 * matters — focus landing on the wrong tab as well as on the right one.
 */
const focusCounts = (items: StubTrigger[]): number[] =>
  items.map((item) => item.focus.mock.calls.length);

const press = (key: string) => ({ key, preventDefault: vi.fn() });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('connectTabs — parts and data attributes', () => {
  it('marks the root and only the root with data-kanso', () => {
    // The stylesheet scopes itself as `[data-kanso] [data-part=…]`. A stray
    // data-kanso on a child would make every descendant selector match twice.
    const a = api({ value: 'one' });
    expect(a.rootProps['data-kanso']).toBe('');
    expect(a.listProps['data-kanso']).toBeUndefined();
    expect(a.getTriggerProps({ value: 'one' })['data-kanso']).toBeUndefined();
    expect(a.getContentProps({ value: 'one' })['data-kanso']).toBeUndefined();
  });

  it('scopes the root to tabs', () => {
    expect(api().rootProps['data-scope']).toBe('tabs');
  });

  it('names every part', () => {
    const a = api();
    expect(a.rootProps['data-part']).toBe('root');
    expect(a.listProps['data-part']).toBe('list');
    expect(a.getTriggerProps({ value: 'one' })['data-part']).toBe('trigger');
    expect(a.getContentProps({ value: 'one' })['data-part']).toBe('content');
  });

  it('reflects selection as data-state on both trigger and content', () => {
    const a = api({ value: 'one' });
    expect(a.getTriggerProps({ value: 'one' })['data-state']).toBe('active');
    expect(a.getContentProps({ value: 'one' })['data-state']).toBe('active');
    expect(a.getTriggerProps({ value: 'two' })['data-state']).toBe('inactive');
    expect(a.getContentProps({ value: 'two' })['data-state']).toBe('inactive');
  });

  it('puts the orientation on every part, so CSS never has to look upwards', () => {
    const a = api({ orientation: 'vertical' });
    expect(a.rootProps['data-orientation']).toBe('vertical');
    expect(a.listProps['data-orientation']).toBe('vertical');
    expect(a.getTriggerProps({ value: 'one' })['data-orientation']).toBe('vertical');
    expect(a.getContentProps({ value: 'one' })['data-orientation']).toBe('vertical');
  });

  // Read back by the key handler to identify the trigger focus landed on.
  it('carries the value on trigger and content', () => {
    const a = api();
    expect(a.getTriggerProps({ value: 'one' })['data-value']).toBe('one');
    expect(a.getContentProps({ value: 'one' })['data-value']).toBe('one');
  });
});

describe('connectTabs — ARIA wiring', () => {
  it('uses the native roles', () => {
    const a = api();
    expect(a.listProps.role).toBe('tablist');
    expect(a.getTriggerProps({ value: 'one' }).role).toBe('tab');
    expect(a.getContentProps({ value: 'one' }).role).toBe('tabpanel');
  });

  it('announces the orientation on the list', () => {
    expect(api({ orientation: 'vertical' }).listProps['aria-orientation']).toBe('vertical');
    expect(api().listProps['aria-orientation']).toBe('horizontal');
  });

  it('marks the selected tab and only it', () => {
    const a = api({ value: 'one' });
    expect(a.getTriggerProps({ value: 'one' })['aria-selected']).toBe(true);
    expect(a.getTriggerProps({ value: 'two' })['aria-selected']).toBe(false);
  });

  // The pair that makes a tablist navigable to a screen reader. Both directions
  // must resolve, which is only true because panels are always mounted.
  it('points trigger and panel at each other', () => {
    const a = api();
    const trigger = a.getTriggerProps({ value: 'one' });
    const content = a.getContentProps({ value: 'one' });
    expect(trigger['aria-controls']).toBe(content.id);
    expect(content['aria-labelledby']).toBe(trigger.id);
  });

  it('keeps aria-controls on unselected triggers, because the panel is still there', () => {
    const a = api({ value: 'one' });
    expect(a.getTriggerProps({ value: 'two' })['aria-controls']).toBe('t-content-two');
  });

  it('encodes awkward values in the ids it emits', () => {
    const a = api();
    expect(a.getTriggerProps({ value: 'my tab' }).id).toBe('t-trigger-my%20tab');
    expect(a.getContentProps({ value: 'my tab' }).id).toBe('t-content-my%20tab');
  });

  it('gives the button an explicit type, so it cannot submit an enclosing form', () => {
    expect(api().getTriggerProps({ value: 'one' }).type).toBe('button');
  });

  it('makes the panel focusable even when it holds nothing focusable', () => {
    expect(api({ value: 'one' }).getContentProps({ value: 'one' }).tabIndex).toBe(0);
    expect(api({ value: 'one' }).getContentProps({ value: 'two' }).tabIndex).toBe(0);
  });
});

describe('connectTabs — roving tabindex', () => {
  it('gives the tab stop to the selected trigger', () => {
    const a = api({ value: 'one' });
    expect(a.getTriggerProps({ value: 'one' }).tabIndex).toBe(0);
  });

  // The bug docs/03 §2 calls out by name: every tab at tabindex 0 turns a
  // tablist into N tab stops.
  it('takes it away from every other trigger', () => {
    const a = api({ value: 'one' });
    expect(a.getTriggerProps({ value: 'two' }).tabIndex).toBe(-1);
    expect(a.getTriggerProps({ value: 'three' }).tabIndex).toBe(-1);
  });

  it('leaves no tab stop at all when nothing is selected', () => {
    // Deliberate — see docs/03 §2 decision 6. Silently selecting the first tab
    // would be a state write on mount, in both adapters.
    const a = api();
    expect(a.getTriggerProps({ value: 'one' }).tabIndex).toBe(-1);
    expect(a.getTriggerProps({ value: 'two' }).tabIndex).toBe(-1);
  });
});

describe('connectTabs — panels', () => {
  it('hides the unselected panel rather than asking the adapter to unmount it', () => {
    const a = api({ value: 'one' });
    expect(a.getContentProps({ value: 'one' }).hidden).toBe(false);
    expect(a.getContentProps({ value: 'two' }).hidden).toBe(true);
  });

  it('hides every panel when nothing is selected', () => {
    const a = api();
    expect(a.getContentProps({ value: 'one' }).hidden).toBe(true);
  });
});

describe('connectTabs — selection', () => {
  it('selects on click', () => {
    const send = vi.fn();
    api({ value: 'one' }, send).getTriggerProps({ value: 'two' }).onClick();
    expect(send).toHaveBeenCalledWith({ type: 'SET_VALUE', value: 'two' });
  });

  // Enter and Space arrive as a click on a real <button>. A keydown branch for
  // them would fire selection twice — the lesson switch.connect.ts records.
  it('selects on click in manual mode too, since Enter and Space arrive as clicks', () => {
    const send = vi.fn();
    api({ value: 'one', activationMode: 'manual' }, send)
      .getTriggerProps({ value: 'two' })
      .onClick();
    expect(send).toHaveBeenCalledWith({ type: 'SET_VALUE', value: 'two' });
  });

  it('does not swallow Enter or Space in the key handler', () => {
    const send = vi.fn();
    const items = stubTriggers(['one', 'two']);
    const onKeyDown = api({ value: 'one' }, send).getTriggerProps({ value: 'one' }).onKeyDown;

    for (const key of ['Enter', ' ']) {
      const event = press(key);
      onKeyDown(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(send).not.toHaveBeenCalled();
    expect(focusCounts(items)).toEqual([0, 0]);
  });

  it('exposes setValue and the current value', () => {
    const send = vi.fn();
    const a = api({ value: 'one' }, send);
    expect(a.value).toBe('one');
    expect(a.isSelected('one')).toBe(true);
    expect(a.isSelected('two')).toBe(false);
    a.setValue('two');
    expect(send).toHaveBeenCalledWith({ type: 'SET_VALUE', value: 'two' });
  });
});

describe('connectTabs — keyboard, horizontal', () => {
  const keyDownOn = (value: string, init: Partial<TabsStateInit> = {}) =>
    api({ value, ...init }).getTriggerProps({ value }).onKeyDown;

  it('moves focus forward and back with the inline arrows', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    keyDownOn('one')(press('ArrowRight'));
    expect(focusCounts(items)).toEqual([0, 1, 0]);

    keyDownOn('two')(press('ArrowLeft'));
    expect(focusCounts(items)).toEqual([1, 1, 0]);
  });

  it('jumps to the ends with Home and End', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    keyDownOn('two')(press('Home'));
    expect(focusCounts(items)).toEqual([1, 0, 0]);

    keyDownOn('two')(press('End'));
    expect(focusCounts(items)).toEqual([1, 0, 1]);
  });

  it('wraps at the ends by default', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    keyDownOn('three')(press('ArrowRight'));
    expect(focusCounts(items)).toEqual([1, 0, 0]);

    keyDownOn('one')(press('ArrowLeft'));
    expect(focusCounts(items)).toEqual([1, 0, 1]);
  });

  it('stops at the ends when loop is off', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    keyDownOn('three', { loop: false })(press('ArrowRight'));
    expect(focusCounts(items)).toEqual([0, 0, 1]);

    keyDownOn('one', { loop: false })(press('ArrowLeft'));
    expect(focusCounts(items)).toEqual([1, 0, 1]);
  });

  // If these were handled, a horizontal tablist would eat page scrolling.
  it('ignores the block arrows', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    for (const key of ['ArrowUp', 'ArrowDown']) {
      const event = press(key);
      keyDownOn('one')(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(focusCounts(items)).toEqual([0, 0, 0]);
  });

  it('prevents the default only for keys it acts on', () => {
    stubTriggers(['one', 'two']);

    const handled = press('ArrowRight');
    keyDownOn('one')(handled);
    expect(handled.preventDefault).toHaveBeenCalledOnce();

    const ignored = press('a');
    keyDownOn('one')(ignored);
    expect(ignored.preventDefault).not.toHaveBeenCalled();
  });
});

describe('connectTabs — keyboard, vertical', () => {
  const keyDownOn = (value: string) =>
    api({ value, orientation: 'vertical' }).getTriggerProps({ value }).onKeyDown;

  it('moves with the block arrows instead', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    keyDownOn('one')(press('ArrowDown'));
    expect(focusCounts(items)).toEqual([0, 1, 0]);

    keyDownOn('two')(press('ArrowUp'));
    expect(focusCounts(items)).toEqual([1, 1, 0]);
  });

  it('still answers Home and End', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    keyDownOn('two')(press('End'));
    expect(focusCounts(items)).toEqual([0, 0, 1]);
  });

  it('ignores the inline arrows', () => {
    const items = stubTriggers(['one', 'two', 'three']);

    const event = press('ArrowRight');
    keyDownOn('one')(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(focusCounts(items)).toEqual([0, 0, 0]);
  });
});

describe('connectTabs — activation mode', () => {
  it('selects as focus arrives, in automatic mode', () => {
    const send = vi.fn();
    stubTriggers(['one', 'two', 'three']);

    api({ value: 'one' }, send).getTriggerProps({ value: 'one' }).onKeyDown(press('ArrowRight'));

    expect(send).toHaveBeenCalledWith({ type: 'SET_VALUE', value: 'two' });
  });

  it('moves focus without selecting, in manual mode', () => {
    const send = vi.fn();
    const items = stubTriggers(['one', 'two', 'three']);

    api({ value: 'one', activationMode: 'manual' }, send)
      .getTriggerProps({ value: 'one' })
      .onKeyDown(press('ArrowRight'));

    expect(focusCounts(items)).toEqual([0, 1, 0]);
    expect(send).not.toHaveBeenCalled();
  });

  // The concrete cost the docs page has to teach: arrowing across the list in
  // automatic mode fires the consumer's handler once per tab passed.
  it('fires once per tab arrowed past, in automatic mode', () => {
    const send = vi.fn();
    stubTriggers(['one', 'two', 'three']);
    const a = api({ value: 'one' }, send);

    a.getTriggerProps({ value: 'one' }).onKeyDown(press('ArrowRight'));
    a.getTriggerProps({ value: 'two' }).onKeyDown(press('ArrowRight'));

    expect(send).toHaveBeenNthCalledWith(1, { type: 'SET_VALUE', value: 'two' });
    expect(send).toHaveBeenNthCalledWith(2, { type: 'SET_VALUE', value: 'three' });
  });
});

describe('connectTabs — degenerate DOM', () => {
  it('does nothing when the list is not in the document', () => {
    vi.stubGlobal('document', { getElementById: () => null });
    const send = vi.fn();
    const event = press('ArrowRight');

    expect(() =>
      api({ value: 'one' }, send).getTriggerProps({ value: 'one' }).onKeyDown(event),
    ).not.toThrow();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('does nothing when the list is empty', () => {
    stubTriggers([]);
    const event = press('ArrowRight');

    api({ value: 'one' }).getTriggerProps({ value: 'one' }).onKeyDown(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  // Reachable mid-transition: the selected value has changed but the trigger
  // holding focus has not been removed yet.
  it('enters from the first item when the focused trigger is not in the list', () => {
    const items = stubTriggers(['one', 'two']);

    api({ value: 'gone' }).getTriggerProps({ value: 'gone' }).onKeyDown(press('ArrowRight'));

    expect(focusCounts(items)).toEqual([1, 0]);
  });

  it('ignores a trigger element with no value to read', () => {
    const send = vi.fn();
    const items: StubTrigger[] = [{ dataset: {}, focus: vi.fn() }];
    vi.stubGlobal('document', {
      getElementById: () => ({ querySelectorAll: () => items }),
    });

    api({ value: 'one' }, send).getTriggerProps({ value: 'one' }).onKeyDown(press('ArrowRight'));

    expect(focusCounts(items)).toEqual([1]);
    expect(send).not.toHaveBeenCalled();
  });
});
