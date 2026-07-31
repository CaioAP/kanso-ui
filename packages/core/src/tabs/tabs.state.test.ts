import { describe, expect, it } from 'vitest';
import { initialTabsState, tabsContentId, tabsIds, tabsReducer, tabsTriggerId } from './tabs.state';

describe('tabsIds', () => {
  it('uses the supplied id verbatim for the root', () => {
    // So `<Tabs id="settings">` is selectable as `#settings`, which is what
    // anyone passing an explicit id expects.
    expect(tabsIds('settings').root).toBe('settings');
  });

  it('derives the list id from it', () => {
    expect(tabsIds('settings').list).toBe('settings-list');
  });

  it('is pure — the same id always gives the same ids', () => {
    expect(tabsIds('x')).toEqual(tabsIds('x'));
  });
});

describe('tabsTriggerId / tabsContentId', () => {
  it('derives both from the root id and the value', () => {
    expect(tabsTriggerId('t', 'account')).toBe('t-trigger-account');
    expect(tabsContentId('t', 'account')).toBe('t-content-account');
  });

  // The reason encoding exists at all: `aria-controls="t-content-my tab"` is
  // parsed as two idrefs, both dangling, and nothing reports it.
  it('encodes whitespace, which would otherwise split an idref in two', () => {
    expect(tabsTriggerId('t', 'my tab')).toBe('t-trigger-my%20tab');
    expect(tabsTriggerId('t', 'a\tb')).toBe('t-trigger-a%09b');
    expect(tabsTriggerId('t', 'a\nb')).toBe('t-trigger-a%0Ab');
  });

  it('encodes other characters that make ids awkward to select', () => {
    expect(tabsTriggerId('t', 'a/b')).toBe('t-trigger-a%2Fb');
    expect(tabsTriggerId('t', 'a#b')).toBe('t-trigger-a%23b');
  });

  it('survives non-ASCII values', () => {
    expect(tabsTriggerId('t', 'configurações')).toBe('t-trigger-configura%C3%A7%C3%B5es');
  });

  // Injectivity is the whole reason for encodeURIComponent over a replace():
  // `'a b'.replace(/\s/g, '-')` and `'a-b'` collide, and two tabs would then
  // share one id.
  it('never collapses two distinct values onto one id', () => {
    expect(tabsTriggerId('t', 'a b')).not.toBe(tabsTriggerId('t', 'a-b'));
  });

  it('keeps triggers and panels apart for the same value', () => {
    expect(tabsTriggerId('t', 'a')).not.toBe(tabsContentId('t', 'a'));
  });
});

describe('initialTabsState', () => {
  it('starts with nothing selected when no value is given', () => {
    // A real state, not an error: see docs/03 §2 decision 6.
    expect(initialTabsState({ id: 't' }).value).toBeUndefined();
  });

  it('defaults to a looping, horizontal, automatic tablist', () => {
    const state = initialTabsState({ id: 't' });
    expect(state.orientation).toBe('horizontal');
    expect(state.activationMode).toBe('automatic');
    expect(state.loop).toBe(true);
  });

  it('takes every option when given', () => {
    const state = initialTabsState({
      id: 't',
      value: 'b',
      orientation: 'vertical',
      activationMode: 'manual',
      loop: false,
    });
    expect(state).toEqual({
      value: 'b',
      orientation: 'vertical',
      activationMode: 'manual',
      loop: false,
      ids: { root: 't', list: 't-list' },
    });
  });

  it('respects loop: false rather than treating it as absent', () => {
    expect(initialTabsState({ id: 't', loop: false }).loop).toBe(false);
  });
});

describe('tabsReducer', () => {
  const state = initialTabsState({ id: 't', value: 'a' });

  it('selects a new value', () => {
    expect(tabsReducer(state, { type: 'SET_VALUE', value: 'b' }).value).toBe('b');
  });

  it('selects from nothing', () => {
    const empty = initialTabsState({ id: 't' });
    expect(tabsReducer(empty, { type: 'SET_VALUE', value: 'a' }).value).toBe('a');
  });

  // Adapters tell a real change from a no-op by reference, and only fire
  // onValueChange for a real one.
  it('returns the same reference when the value is already selected', () => {
    expect(tabsReducer(state, { type: 'SET_VALUE', value: 'a' })).toBe(state);
  });

  it('returns a new object when the value changes', () => {
    expect(tabsReducer(state, { type: 'SET_VALUE', value: 'b' })).not.toBe(state);
  });

  it('leaves everything but the value alone', () => {
    const next = tabsReducer(
      initialTabsState({ id: 't', value: 'a', orientation: 'vertical', loop: false }),
      { type: 'SET_VALUE', value: 'b' },
    );
    expect(next.orientation).toBe('vertical');
    expect(next.loop).toBe(false);
    expect(next.ids).toEqual({ root: 't', list: 't-list' });
  });

  it('does not mutate the state it is given', () => {
    const before = initialTabsState({ id: 't', value: 'a' });
    tabsReducer(before, { type: 'SET_VALUE', value: 'b' });
    expect(before.value).toBe('a');
  });

  it('ignores an unknown event rather than throwing', () => {
    // Reachable from JS consumers, who have no compiler to stop them.
    expect(tabsReducer(state, { type: 'NOPE' } as never)).toBe(state);
  });
});
