import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTypeahead, isTypeaheadKey, matchTypeahead } from './typeahead';

/**
 * The pure half needs no timers and no DOM, which is the point of splitting it
 * out — every matching rule is asserted here, and only the buffer below needs
 * `vi.useFakeTimers`.
 */

const labels = ['Archive', 'Save', 'Save as…', 'Settings', 'Sign out'];

const match = (query: string, currentIndex = -1) => matchTypeahead({ query, labels, currentIndex });

describe('matchTypeahead — prefix matching', () => {
  it('finds the first item starting with the query', () => {
    expect(match('a')).toBe(0);
    expect(match('sa')).toBe(1);
    expect(match('se')).toBe(3);
  });

  it('is case-insensitive both ways', () => {
    expect(match('ARCH')).toBe(0);
    expect(matchTypeahead({ query: 'arch', labels: ['ARCHIVE'], currentIndex: -1 })).toBe(0);
  });

  it('ignores surrounding whitespace in the label', () => {
    // Item text comes from the DOM, where markup formatting leaves it padded.
    expect(matchTypeahead({ query: 's', labels: ['\n  Save\n'], currentIndex: -1 })).toBe(0);
  });

  it('returns undefined when nothing matches', () => {
    expect(match('z')).toBeUndefined();
    expect(match('sax')).toBeUndefined();
  });

  it('returns undefined for an empty query or an empty menu', () => {
    expect(match('')).toBeUndefined();
    expect(matchTypeahead({ query: 's', labels: [], currentIndex: -1 })).toBeUndefined();
  });

  it('searches from after the current item, and wraps', () => {
    // "sa" from Save lands on Save as…, then wraps back to Save.
    expect(match('sa', 1)).toBe(2);
    expect(match('sa', 2)).toBe(1);
  });

  it('tolerates a current index that is out of range', () => {
    expect(match('a', 99)).toBe(0);
    expect(match('a', -5)).toBe(0);
  });
});

describe('matchTypeahead — a repeated character cycles', () => {
  it('visits every item starting with that character, in turn', () => {
    // The buffer really does contain "s", "ss", "sss" — collapsing them is what
    // turns a query nothing matches into "the next item starting with s".
    expect(match('s', -1)).toBe(1);
    expect(match('ss', 1)).toBe(2);
    expect(match('sss', 2)).toBe(3);
    expect(match('ssss', 3)).toBe(4);
  });

  it('wraps back to the first match', () => {
    expect(match('ss', 4)).toBe(1);
  });

  it('stays put when it is the only match', () => {
    expect(match('aa', 0)).toBe(0);
  });

  it('does not collapse a repeat that is a real prefix', () => {
    // "ss" cycles, but a label genuinely starting with "ss" must still win the
    // ordinary prefix rule where one exists.
    const emails = ['Send', 'SSH keys'];
    expect(matchTypeahead({ query: 'ss', labels: emails, currentIndex: -1 })).toBe(1);
  });
});

describe('isTypeaheadKey', () => {
  it('accepts single printable characters', () => {
    expect(isTypeaheadKey('a')).toBe(true);
    expect(isTypeaheadKey('Z')).toBe(true);
    expect(isTypeaheadKey('7')).toBe(true);
    expect(isTypeaheadKey('é')).toBe(true);
  });

  it('rejects named keys', () => {
    expect(isTypeaheadKey('ArrowDown')).toBe(false);
    expect(isTypeaheadKey('Enter')).toBe(false);
    expect(isTypeaheadKey('Escape')).toBe(false);
    expect(isTypeaheadKey('Tab')).toBe(false);
  });

  it('rejects space, which activates the focused item', () => {
    // Swallowing it here would break the keyboard table for the sake of
    // matching labels that begin with a blank.
    expect(isTypeaheadKey(' ')).toBe(false);
  });
});

describe('createTypeahead — the buffer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accumulates keys into one query', () => {
    const typeahead = createTypeahead();

    expect(typeahead.push('s')).toBe('s');
    expect(typeahead.push('e')).toBe('se');
    expect(typeahead.push('t')).toBe('set');

    typeahead.destroy();
  });

  it('forgets the query after the reset window', () => {
    vi.useFakeTimers();
    const typeahead = createTypeahead(500);

    typeahead.push('s');
    vi.advanceTimersByTime(499);
    expect(typeahead.push('e')).toBe('se');

    // The window restarts on every keypress, so this is 500ms after the "e".
    vi.advanceTimersByTime(500);
    expect(typeahead.push('t')).toBe('t');

    typeahead.destroy();
  });

  it('starts fresh after a destroy, so a reopened menu has no stale query', () => {
    const typeahead = createTypeahead();

    typeahead.push('s');
    typeahead.destroy();

    expect(typeahead.push('e')).toBe('e');
    typeahead.destroy();
  });

  it('cancels its timer on destroy, so nothing fires after teardown', () => {
    // The reason this is per-instance with an explicit teardown: a module-level
    // timer outlives the component that started it.
    vi.useFakeTimers();
    const typeahead = createTypeahead(500);

    typeahead.push('s');
    typeahead.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('is safe to destroy twice', () => {
    const typeahead = createTypeahead();
    typeahead.push('s');
    typeahead.destroy();

    expect(() => typeahead.destroy()).not.toThrow();
  });

  it('keeps two menus independent', () => {
    // The failure a module-level buffer would produce: typing in one menu
    // changes what the other one matches.
    const first = createTypeahead();
    const second = createTypeahead();

    first.push('s');
    expect(second.push('a')).toBe('a');
    expect(first.push('e')).toBe('se');

    first.destroy();
    second.destroy();
  });
});
