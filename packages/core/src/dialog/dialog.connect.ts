import { ariaAttr } from '../dom/attrs';
import type { NormalizeProps, PropTypes } from '../types';
import type { DialogSend, DialogState } from './dialog.types';

export interface DialogApi<T extends PropTypes> {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerProps: T['button'];
  positionerProps: T['element'];
  backdropProps: T['element'];
  contentProps: T['element'];
  titleProps: T['element'];
  descriptionProps: T['element'];
  closeProps: T['button'];
}

/**
 * Flat prop bags, unlike Tabs' parameterised getters: a dialog has exactly one
 * of each part, so nothing needs to be derived per item.
 *
 * Note what is **not** here: no `onKeyDown`, and no handler for `Escape`. A
 * dialog has to close on `Escape` pressed anywhere, including in a `<select>`
 * inside it and including when nothing inside it has focus, so the listener
 * belongs on the document — which makes it an effect, and effects live in
 * `dialog.dom.ts`. A handler on the content element would look right and would
 * miss the cases that matter.
 */
export function connectDialog<T extends PropTypes>(
  state: DialogState,
  send: DialogSend,
  normalize: NormalizeProps<T>,
): DialogApi<T> {
  const { open, modal, role, hasTitle, hasDescription, hasAriaLabel, ids } = state;

  const dataState = open ? 'open' : 'closed';

  return {
    open,
    setOpen: (value: boolean) => send({ type: 'SET_OPEN', value }),

    triggerProps: normalize.button({
      // The trigger lives in the page and the rest lives in a portal, so Dialog
      // has two scope roots rather than one. Both carry the markers the
      // stylesheet keys off; there is no single element that contains both.
      'data-kanso': '',
      'data-scope': 'dialog',
      'data-part': 'trigger',
      'data-state': dataState,
      id: ids.trigger,
      // Without an explicit type, a button inside a <form> defaults to "submit".
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      // Opens rather than toggles. A press on the trigger of an open dialog is
      // already handled by the dismissable layer, which excludes the trigger so
      // that pointerdown-then-click cannot close and immediately reopen it.
      onClick: () => send({ type: 'OPEN' }),
    }),

    positionerProps: normalize.element({
      'data-kanso': '',
      'data-scope': 'dialog',
      'data-part': 'positioner',
      'data-state': dataState,
    }),

    backdropProps: normalize.element({
      'data-part': 'backdrop',
      'data-state': dataState,
      // No handler. The backdrop dismisses because it is outside the content,
      // like the positioner's own padding is — one code path, in
      // `dismissable.ts`, rather than a special case that misses the corners.
      'aria-hidden': true,
    }),

    contentProps: normalize.element({
      'data-part': 'content',
      'data-state': dataState,
      id: ids.content,
      role,
      // Only when modal, and only ever `true`. `aria-modal="false"` is legal and
      // says nothing that its absence does not.
      'aria-modal': ariaAttr(modal),
      // Emitted only when the part that owns the id is mounted, and dropped
      // when the consumer supplies their own name. Either mistake produces a
      // dangling idref, which screen readers resolve to silence — worse than
      // the unnamed dialog they would otherwise describe. `docs/03` §3.
      'aria-labelledby': hasTitle && !hasAriaLabel ? ids.title : undefined,
      'aria-describedby': hasDescription ? ids.description : undefined,
      // Focusable by script, never by Tab: it is where focus lands when the
      // dialog holds nothing focusable of its own, and `getFocusableElements`
      // excludes `tabindex="-1"` so the trap cannot wrap onto it.
      tabIndex: -1,
    }),

    titleProps: normalize.element({
      'data-part': 'title',
      id: ids.title,
    }),

    descriptionProps: normalize.element({
      'data-part': 'description',
      id: ids.description,
    }),

    closeProps: normalize.button({
      'data-part': 'close',
      type: 'button',
      onClick: () => send({ type: 'CLOSE' }),
    }),
  };
}
