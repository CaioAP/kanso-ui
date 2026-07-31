import { ariaAttr, dataAttr } from '../dom/attrs';
import type { KeyboardEventLike } from '../tabs/tabs.connect';
import type { NormalizeProps, PropTypes } from '../types';
import type { MenuSend, MenuState } from './menu.types';

export interface MenuItemProps {
  /** Reported to `onSelect`. Also what `data-value` carries. */
  value: string;
  /** Stays focusable and stays in the ring — it simply does nothing. */
  disabled?: boolean;
}

export interface MenuGroupProps {
  /** Id of the group's label element, so the group can point at it. */
  labelId: string;
}

export interface MenuApi<T extends PropTypes> {
  open: boolean;
  setOpen: (open: boolean) => void;
  rootProps: T['element'];
  triggerProps: T['button'];
  positionerProps: T['element'];
  contentProps: T['element'];
  getItemProps: (props: MenuItemProps) => T['button'];
  separatorProps: T['element'];
  getGroupProps: (props: MenuGroupProps) => T['element'];
  getGroupLabelProps: (props: MenuGroupProps) => T['element'];
}

export function connectMenu<T extends PropTypes>(
  state: MenuState,
  send: MenuSend,
  normalize: NormalizeProps<T>,
): MenuApi<T> {
  const { open, placement, ids } = state;

  const dataState = open ? 'open' : 'closed';

  /**
   * The trigger's keyboard map is two keys long, and that is the whole point.
   *
   * `Enter` and `Space` are absent because the trigger is a real `<button>`:
   * both already produce a click, and the click handler below toggles. Adding
   * them here would open and then immediately close.
   */
  const onTriggerKeyDown = (event: KeyboardEventLike) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      send({ type: 'OPEN', focus: 'first' });
      return;
    }

    if (event.key === 'ArrowUp') {
      // Opening at the last item is the reason `openFocus` is state rather than
      // an argument: the content does not exist yet.
      event.preventDefault();
      send({ type: 'OPEN', focus: 'last' });
    }
  };

  return {
    open,
    setOpen: (value: boolean) => send({ type: 'SET_OPEN', value }),

    rootProps: normalize.element({
      // One scope root, unlike Dialog's two — the menu is not portalled, so the
      // whole component really does live under one element. It is also the
      // positioning anchor: `menu.css` makes it `position: relative`.
      'data-kanso': '',
      'data-scope': 'menu',
      'data-part': 'root',
      'data-state': dataState,
      id: ids.root,
    }),

    triggerProps: normalize.button({
      'data-part': 'trigger',
      'data-state': dataState,
      id: ids.trigger,
      // Without an explicit type, a button inside a <form> defaults to "submit".
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': open,
      // No `aria-controls`: the content is unmounted while closed, so the idref
      // would point at nothing for most of the component's life. `docs/03` §4
      // decision 4, and the fourth time this repo has made that call.
      onClick: () => send(open ? { type: 'CLOSE' } : { type: 'OPEN', focus: 'first' }),
      onKeyDown: onTriggerKeyDown,
    }),

    positionerProps: normalize.element({
      'data-part': 'positioner',
      'data-state': dataState,
      'data-placement': placement,
    }),

    contentProps: normalize.element({
      'data-part': 'content',
      'data-state': dataState,
      'data-placement': placement,
      id: ids.content,
      role: 'menu',
      'aria-labelledby': ids.trigger,
      /*
       * `0`, not `-1`, and the reason is the stylesheet rather than the ARIA
       * pattern: a long menu scrolls internally, and a scroll container that
       * cannot be focused is unreachable by keyboard in Safari — axe reports
       * exactly that (`scrollable-region-focusable`, serious).
       *
       * It costs nothing here. Focus still lands on an item when the menu
       * opens, and every `Tab` inside the menu closes it, so this tab stop is
       * never actually stepped onto — it exists so the scroll region has the
       * keyboard access the platform expects.
       */
      tabIndex: 0,
      // No `onKeyDown` here. Arrow keys, Home/End, typeahead and Tab all need
      // the live item collection and a buffer that survives between presses, so
      // they live in `menu.dom.ts` — the same reasoning that puts Dialog's
      // `Escape` there.
    }),

    getItemProps: ({ value, disabled = false }) =>
      normalize.button({
        'data-part': 'item',
        'data-value': value,
        'data-disabled': dataAttr(disabled),
        // A real button, so Enter and Space produce a click for free.
        type: 'button',
        role: 'menuitem',
        // `aria-disabled`, never the `disabled` attribute: a disabled item stays
        // focusable so a keyboard user can discover it exists. `docs/03` §4.
        'aria-disabled': ariaAttr(disabled),
        // Every item is out of the tab order. `Tab` closes the menu and moves
        // past it entirely, so there is no roving tab stop to maintain —
        // focus inside the menu is moved by script.
        tabIndex: -1,
        onClick: () => {
          if (disabled) return;
          send({ type: 'SELECT', value });
        },
      }),

    separatorProps: normalize.element({
      'data-part': 'separator',
      role: 'separator',
      // Horizontal is the default for `separator`, but a menu is a vertical
      // list and the divider across it is the horizontal one. Stated rather
      // than inherited, because the stylesheet reads it too.
      'aria-orientation': 'horizontal',
    }),

    getGroupProps: ({ labelId }) =>
      normalize.element({
        'data-part': 'group',
        role: 'group',
        'aria-labelledby': labelId,
      }),

    getGroupLabelProps: ({ labelId }) =>
      normalize.element({
        'data-part': 'group-label',
        id: labelId,
      }),
  };
}
