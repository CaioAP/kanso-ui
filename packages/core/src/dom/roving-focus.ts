/**
 * Roving tabindex — the arithmetic, not the bookkeeping.
 *
 * A roving-focus *manager* that queries the DOM for `[role=tab]` and writes
 * `tabindex` onto each one is the obvious design and the wrong one here:
 * `connect()` already emits `tabIndex` from state, so a manager would be a
 * second source of truth for the same attribute, and the two would disagree the
 * first time state changed without a keypress. Everything below is therefore
 * pure index arithmetic over a count.
 *
 * The one exception is `getRovingItems`, which is the "explicitly-invoked DOM
 * utility" of `docs/01` §6 — invoked from a key handler rather than a lifecycle
 * hook, which is the only difference. Reading the collection and moving focus is
 * behaviour, and behaviour belongs in core (CLAUDE.md rule 2); an adapter that
 * did it would be the start of two divergent keyboard implementations.
 */

export type Orientation = 'horizontal' | 'vertical';

/** What a key means, once orientation has been taken into account. */
export type RovingMove = 'first' | 'last' | 'next' | 'previous';

export interface RovingIndexOptions {
  /** Index the roving tab stop is on now. Out-of-range is tolerated — see below. */
  current: number;
  count: number;
  /** Wrap past the ends. Default `true`. */
  loop?: boolean;
}

/**
 * Map a key to a move, or `undefined` if the key is not ours.
 *
 * Returning `undefined` for the cross-axis arrows is deliberate and load-bearing:
 * in a horizontal tablist, `ArrowUp`/`ArrowDown` must keep scrolling the page.
 * The caller uses `undefined` as its signal *not* to call `preventDefault`.
 *
 * No RTL handling. Mirroring `ArrowLeft`/`ArrowRight` requires knowing the
 * computed direction of the element, which is a DOM read this function does not
 * take — see the note in `docs/03` §2 if that changes.
 */
export function getRovingMove(key: string, orientation: Orientation): RovingMove | undefined {
  switch (key) {
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'ArrowRight':
      return orientation === 'horizontal' ? 'next' : undefined;
    case 'ArrowLeft':
      return orientation === 'horizontal' ? 'previous' : undefined;
    case 'ArrowDown':
      return orientation === 'vertical' ? 'next' : undefined;
    case 'ArrowUp':
      return orientation === 'vertical' ? 'previous' : undefined;
    default:
      return undefined;
  }
}

/**
 * Where the move lands.
 *
 * Total by construction: an empty collection returns `-1`, and a `current` that
 * is out of range is treated as sitting just before the first item, so `next`
 * gives `0` and `previous` gives the last. A caller should never be able to hand
 * this function an input it answers with `NaN` or a throw.
 */
export function getRovingIndex(move: RovingMove, options: RovingIndexOptions): number {
  const { current, count, loop = true } = options;
  if (count <= 0) return -1;

  const last = count - 1;

  switch (move) {
    case 'first':
      return 0;
    case 'last':
      return last;
    case 'next': {
      if (current < 0 || current > last) return 0;
      if (current === last) return loop ? 0 : last;
      return current + 1;
    }
    case 'previous': {
      if (current < 0 || current > last) return last;
      if (current === 0) return loop ? last : 0;
      return current - 1;
    }
    default:
      return current;
  }
}

/**
 * The collection, in document order, read at the moment a key is pressed.
 *
 * Reading the DOM beats registering items through framework context: document
 * order *is* the order the user perceives, it stays right when items are
 * conditionally rendered or reordered, and it needs no ref plumbing built twice.
 * The cost is one `querySelectorAll` per keypress, on a handful of elements.
 *
 * `document` is read inside the call and never at module scope, so importing
 * this module on a server is safe.
 */
export function getRovingItems(containerId: string, itemSelector: string): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
}
