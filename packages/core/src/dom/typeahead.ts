/**
 * Type-to-select: press "s" in an open menu and land on "Settings".
 *
 * Split the same way `roving-focus.ts` is split, and for the same reason — the
 * arithmetic is the reusable part, the state is not:
 *
 * - `matchTypeahead` is pure. Query, labels, where you are now; an index or
 *   `undefined`. Testable without timers, and the whole of the matching rule.
 * - `createTypeahead` owns the buffer and its timer, and returns a teardown,
 *   as every module in `core/src/dom` does (`docs/01` §6).
 *
 * A module-level buffer would be shared by every menu on the page, and its
 * timer would outlive the component that started it. See `docs/03` §4
 * decision 5.
 */

/** How long a buffered query survives without another keypress. */
const RESET_MS = 500;

export interface TypeaheadMatchOptions {
  /** What has been typed so far. Case-insensitive; leading/trailing space matters. */
  query: string;
  /** The items' text, in document order. */
  labels: string[];
  /** Where focus is now, so the search can start after it. `-1` for nowhere. */
  currentIndex: number;
}

const startsWith = (label: string, query: string): boolean =>
  label.trim().toLowerCase().startsWith(query.toLowerCase());

/**
 * Which item a query lands on, or `undefined` for no match.
 *
 * Two rules, and they really are different behaviours rather than one with a
 * special case:
 *
 * - **A repeated single character cycles.** Pressing "s" three times visits
 *   every item beginning with "s" in turn. The query arrives here as `"sss"`,
 *   which no label starts with, so it is collapsed to `"s"` first.
 * - **Anything else is a prefix match** against the whole buffer, so "se"
 *   goes to "Settings" and not to the next item starting with "e".
 *
 * The search always starts *after* the current index and wraps, which is what
 * makes the cycling case work without any state of its own: each press moves
 * one further along the same set of matches.
 */
export function matchTypeahead(options: TypeaheadMatchOptions): number | undefined {
  const { labels, currentIndex } = options;
  const query = options.query;
  if (query === '' || labels.length === 0) return undefined;

  // Starting one past the current item is what makes a repeated character
  // advance rather than sit still. On the first press of a new query it costs
  // nothing: if the current item is the only match, the wrap returns to it.
  const start = currentIndex < 0 || currentIndex >= labels.length ? 0 : currentIndex + 1;

  const find = (search: string): number | undefined => {
    for (let offset = 0; offset < labels.length; offset += 1) {
      const index = (start + offset) % labels.length;
      const label = labels[index];
      if (label !== undefined && startsWith(label, search)) return index;
    }
    return undefined;
  };

  // The prefix rule is tried first, and the cycling rule is the fallback rather
  // than a competing branch. Collapsing "ss" to "s" unconditionally would make
  // an item genuinely named "SSH keys" unreachable by typing its name, which is
  // a strange thing for a type-to-select feature to do.
  const prefixMatch = find(query);
  if (prefixMatch !== undefined) return prefixMatch;

  const characters = [...query];
  const repeated = characters.length > 1 && characters.every((char) => char === characters[0]);
  if (!repeated) return undefined;

  return find(characters[0] ?? query);
}

/**
 * Is this key one typeahead should consume?
 *
 * A single printable character, and not a space — space activates the focused
 * item, and swallowing it would break the keyboard table for the sake of
 * matching labels that begin with a blank.
 */
export function isTypeaheadKey(key: string): boolean {
  return [...key].length === 1 && key !== ' ';
}

export interface Typeahead {
  /**
   * Feed a key in and get the buffered query out. The caller does the matching,
   * because only the caller knows the labels.
   */
  push: (key: string) => string;
  /** Drop the buffer immediately — on close, or on selection. */
  clear: () => void;
  /** Teardown. Clears the pending timer; safe to call twice. */
  destroy: () => void;
}

export function createTypeahead(resetMs: number = RESET_MS): Typeahead {
  let query = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  return {
    push(key: string): string {
      query += key;
      clearTimer();
      timer = setTimeout(() => {
        query = '';
        timer = undefined;
      }, resetMs);
      return query;
    },

    clear() {
      query = '';
      clearTimer();
    },

    destroy() {
      query = '';
      clearTimer();
    },
  };
}
