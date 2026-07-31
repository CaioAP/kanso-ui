import { getRovingIndex, getRovingItems, getRovingMove } from '../dom/roving-focus';
import type { NormalizeProps, PropTypes } from '../types';
import { tabsContentId, tabsTriggerId } from './tabs.state';
import type { TabsSend, TabsState } from './tabs.types';

/**
 * The little of a keyboard event this needs.
 *
 * Structural, so React's `SyntheticEvent` and Vue's native `KeyboardEvent` both
 * satisfy it without core importing either framework's types (CLAUDE.md rule 1).
 */
export interface KeyboardEventLike {
  key: string;
  preventDefault: () => void;
}

export interface TabsTriggerProps {
  value: string;
}

export interface TabsContentProps {
  value: string;
}

export interface TabsApi<T extends PropTypes> {
  value: string | undefined;
  setValue: (value: string) => void;
  isSelected: (value: string) => boolean;
  rootProps: T['element'];
  listProps: T['element'];
  /**
   * Parameterised, unlike Switch's flat bags: Tabs is a collection, and every
   * trigger needs ids and state derived from its own value.
   */
  getTriggerProps: (props: TabsTriggerProps) => T['button'];
  getContentProps: (props: TabsContentProps) => T['element'];
}

/** The selector that defines the roving collection. Also what the DOM query uses. */
const TRIGGER_SELECTOR = '[role="tab"]';

export function connectTabs<T extends PropTypes>(
  state: TabsState,
  send: TabsSend,
  normalize: NormalizeProps<T>,
): TabsApi<T> {
  const { value: selectedValue, orientation, activationMode, loop, ids } = state;

  const isSelected = (value: string): boolean => value === selectedValue;

  /**
   * Arrow / Home / End. Notably absent: `Enter` and `Space`.
   *
   * The trigger is a real `<button>`, and a button already fires `click` for
   * both keys — so manual activation is handled by `onClick` at no cost, the
   * same lesson `switch.connect.ts` records. Adding them here would fire
   * selection twice.
   */
  const onTriggerKeyDown = (value: string) => (event: KeyboardEventLike) => {
    const move = getRovingMove(event.key, orientation);
    // Not one of ours. Leaving the event alone is the point: in a horizontal
    // tablist `ArrowDown` must still scroll the page.
    if (move === undefined) return;

    const items = getRovingItems(ids.list, TRIGGER_SELECTOR);
    if (items.length === 0) return;

    // Where this trigger sits, read fresh from the DOM rather than from a
    // registry — see `getRovingItems`. `-1` here means the trigger is not in the
    // list any more, which `getRovingIndex` handles as "before the first".
    const current = items.findIndex((item) => item.dataset.value === value);
    const target = items[getRovingIndex(move, { current, count: items.length, loop })];
    if (target === undefined) return;

    event.preventDefault();
    target.focus();

    // Manual activation moves focus only. That is the whole difference between
    // the two modes, and it lives in this one branch.
    if (activationMode !== 'automatic') return;
    const nextValue = target.dataset.value;
    if (nextValue !== undefined) send({ type: 'SET_VALUE', value: nextValue });
  };

  return {
    value: selectedValue,
    setValue: (value: string) => send({ type: 'SET_VALUE', value }),
    isSelected,

    rootProps: normalize.element({
      // Root-only marker. The stylesheet scopes itself with
      // `[data-kanso] [data-part=…]`, so this must be on the root and nowhere else.
      'data-kanso': '',
      'data-scope': 'tabs',
      'data-part': 'root',
      'data-orientation': orientation,
      id: ids.root,
    }),

    listProps: normalize.element({
      'data-part': 'list',
      'data-orientation': orientation,
      id: ids.list,
      role: 'tablist',
      'aria-orientation': orientation,
    }),

    getTriggerProps: ({ value }) => {
      const selected = isSelected(value);
      return normalize.button({
        'data-part': 'trigger',
        'data-state': selected ? 'active' : 'inactive',
        'data-orientation': orientation,
        // Read back by the key handler to identify the trigger it landed on.
        // Deriving the value from the id instead would mean stripping a prefix
        // and decoding — string surgery where an attribute says it plainly.
        'data-value': value,
        id: tabsTriggerId(ids.root, value),
        // Without an explicit type, a button inside a <form> defaults to "submit".
        type: 'button',
        role: 'tab',
        'aria-selected': selected,
        // Always resolvable, because a panel is always mounted — `hidden` when
        // unselected rather than absent. `docs/03` §2 decision 1.
        'aria-controls': tabsContentId(ids.root, value),
        // The roving tab stop, and the reason `Tab` skips the rest of the list.
        // Derived from selection alone: with nothing selected there is no tab
        // stop, which is decision 6 and is meant to be noticed.
        tabIndex: selected ? 0 : -1,
        onClick: () => send({ type: 'SET_VALUE', value }),
        onKeyDown: onTriggerKeyDown(value),
      });
    },

    getContentProps: ({ value }) => {
      const selected = isSelected(value);
      return normalize.element({
        'data-part': 'content',
        'data-state': selected ? 'active' : 'inactive',
        'data-orientation': orientation,
        'data-value': value,
        id: tabsContentId(ids.root, value),
        role: 'tabpanel',
        'aria-labelledby': tabsTriggerId(ids.root, value),
        // Focusable so that `Tab` out of the tablist lands in the panel even
        // when the panel holds nothing focusable of its own.
        tabIndex: 0,
        // Hidden, not unmounted. Keeps the idrefs above resolvable and keeps
        // panel-local DOM state — a half-typed input, a scroll position — alive
        // across a switch away and back.
        hidden: !selected,
      });
    },
  };
}
