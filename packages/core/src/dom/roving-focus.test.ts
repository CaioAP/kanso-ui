import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRovingIndex, getRovingItems, getRovingMove, type RovingMove } from './roving-focus';

describe('getRovingMove — horizontal', () => {
  const move = (key: string) => getRovingMove(key, 'horizontal');

  it('maps the inline arrows', () => {
    expect(move('ArrowRight')).toBe('next');
    expect(move('ArrowLeft')).toBe('previous');
  });

  it('maps Home and End regardless of orientation', () => {
    expect(move('Home')).toBe('first');
    expect(move('End')).toBe('last');
  });

  // The caller keys off `undefined` to skip preventDefault. If these ever
  // returned a move, a horizontal tablist would swallow page scrolling.
  it('ignores the block arrows so the page can still scroll', () => {
    expect(move('ArrowUp')).toBeUndefined();
    expect(move('ArrowDown')).toBeUndefined();
  });

  it('ignores keys that are not ours', () => {
    expect(move('Enter')).toBeUndefined();
    expect(move(' ')).toBeUndefined();
    expect(move('a')).toBeUndefined();
    expect(move('Tab')).toBeUndefined();
  });
});

describe('getRovingMove — vertical', () => {
  const move = (key: string) => getRovingMove(key, 'vertical');

  it('maps the block arrows', () => {
    expect(move('ArrowDown')).toBe('next');
    expect(move('ArrowUp')).toBe('previous');
  });

  it('still maps Home and End', () => {
    expect(move('Home')).toBe('first');
    expect(move('End')).toBe('last');
  });

  it('ignores the inline arrows so caret movement is left alone', () => {
    expect(move('ArrowRight')).toBeUndefined();
    expect(move('ArrowLeft')).toBeUndefined();
  });
});

describe('getRovingIndex — within range', () => {
  it('steps forward and back', () => {
    expect(getRovingIndex('next', { current: 0, count: 3 })).toBe(1);
    expect(getRovingIndex('previous', { current: 2, count: 3 })).toBe(1);
  });

  it('jumps to the ends', () => {
    expect(getRovingIndex('first', { current: 2, count: 3 })).toBe(0);
    expect(getRovingIndex('last', { current: 0, count: 3 })).toBe(2);
  });
});

describe('getRovingIndex — the ends', () => {
  it('wraps when looping, which is the default', () => {
    expect(getRovingIndex('next', { current: 2, count: 3 })).toBe(0);
    expect(getRovingIndex('previous', { current: 0, count: 3 })).toBe(2);
  });

  it('holds still when not looping', () => {
    expect(getRovingIndex('next', { current: 2, count: 3, loop: false })).toBe(2);
    expect(getRovingIndex('previous', { current: 0, count: 3, loop: false })).toBe(0);
  });

  it('loop makes no difference away from the ends', () => {
    expect(getRovingIndex('next', { current: 0, count: 3, loop: false })).toBe(1);
    expect(getRovingIndex('previous', { current: 2, count: 3, loop: false })).toBe(1);
  });

  // first/last are absolute. Looping is about wrapping past an end, and Home
  // and End cannot pass one.
  it('ignores loop for first and last', () => {
    expect(getRovingIndex('first', { current: 0, count: 3, loop: false })).toBe(0);
    expect(getRovingIndex('last', { current: 2, count: 3, loop: false })).toBe(2);
  });
});

describe('getRovingIndex — degenerate input', () => {
  const moves: RovingMove[] = ['first', 'last', 'next', 'previous'];

  it('returns -1 for an empty collection, for every move', () => {
    for (const move of moves) {
      expect(getRovingIndex(move, { current: 0, count: 0 })).toBe(-1);
    }
  });

  it('returns -1 rather than throwing on a negative count', () => {
    expect(getRovingIndex('next', { current: 0, count: -1 })).toBe(-1);
  });

  it('handles a single item, looping or not', () => {
    expect(getRovingIndex('next', { current: 0, count: 1 })).toBe(0);
    expect(getRovingIndex('previous', { current: 0, count: 1 })).toBe(0);
    expect(getRovingIndex('next', { current: 0, count: 1, loop: false })).toBe(0);
  });

  // An out-of-range `current` means "nothing is focused yet" — it happens when
  // the selected value is not in the collection at all. Entering from before
  // the start is the sane reading, and it must never produce NaN.
  it('treats an out-of-range current as sitting before the first item', () => {
    expect(getRovingIndex('next', { current: -1, count: 3 })).toBe(0);
    expect(getRovingIndex('previous', { current: -1, count: 3 })).toBe(2);
    expect(getRovingIndex('next', { current: 99, count: 3 })).toBe(0);
    expect(getRovingIndex('previous', { current: 99, count: 3 })).toBe(2);
  });

  it('answers first and last normally from out of range', () => {
    expect(getRovingIndex('first', { current: -1, count: 3 })).toBe(0);
    expect(getRovingIndex('last', { current: -1, count: 3 })).toBe(2);
  });
});

describe('getRovingItems', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // This project runs core in the `node` environment precisely so a stray
  // module-scope `document` read shows up as a crash here rather than as a
  // server-render failure in someone else's app.
  it('returns nothing with no document, rather than throwing', () => {
    expect(globalThis.document).toBeUndefined();
    expect(getRovingItems('tabs-list', '[role="tab"]')).toEqual([]);
  });

  it('returns the matches in document order', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const querySelectorAll = vi.fn(() => items);
    vi.stubGlobal('document', { getElementById: () => ({ querySelectorAll }) });

    expect(getRovingItems('tabs-list', '[role="tab"]')).toEqual(items);
    expect(querySelectorAll).toHaveBeenCalledWith('[role="tab"]');
  });

  // The container is gone during teardown, and between a state change and the
  // frame that renders it. Neither should throw out of a key handler.
  it('returns nothing when the container is missing', () => {
    vi.stubGlobal('document', { getElementById: () => null });

    expect(getRovingItems('gone', '[role="tab"]')).toEqual([]);
  });
});
