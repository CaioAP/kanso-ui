import { ariaAttr, dataAttr } from '../dom/attrs';
import type { NormalizeProps, PropTypes } from '../types';
import type { ButtonPressEvent, ButtonState } from './button.types';

export interface ButtonApi<T extends PropTypes> {
  disabled: boolean;
  loading: boolean;
  rootProps: T['button'];
  labelProps: T['element'];
}

/**
 * Turn state into prop bags. Pure, and called on every render.
 *
 * Two arguments, not three: there is no `send`, because there is nothing to
 * send. What is here that could not live in an adapter is the activation guard
 * — behaviour, which `CLAUDE.md` rule 2 puts in core regardless of how little
 * of it there is.
 */
export function connectButton<T extends PropTypes, E extends ButtonPressEvent = ButtonPressEvent>(
  state: ButtonState<E>,
  normalize: NormalizeProps<T>,
): ButtonApi<T> {
  const { variant, size, disabled, loading, type, onClick } = state;

  return {
    disabled,
    loading,

    rootProps: normalize.button({
      // Root-only markers. The stylesheet scopes itself with
      // `[data-kanso] [data-part=…]`, so these must be on the root and nowhere else.
      'data-kanso': '',
      'data-scope': 'button',
      'data-part': 'root',
      'data-variant': variant,
      'data-size': size,
      'data-disabled': dataAttr(disabled),
      'data-loading': dataAttr(loading),
      type,
      disabled,
      // Busy, not unavailable. `aria-disabled` would announce a button that is
      // working on your last press as one you cannot use, and the button stays
      // focusable either way — the guard below is what actually blocks it.
      // `docs/03` §6 decision 3.
      'aria-busy': ariaAttr(loading),
      onClick: (event: E) => {
        if (loading) {
          // `preventDefault` so a type="submit" button cannot submit the form
          // it is in; `stopPropagation` so a handler on an ancestor does not
          // treat the press as a working one either.
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      },
    }),

    labelProps: normalize.element({
      'data-part': 'label',
      'data-loading': dataAttr(loading),
    }),
  };
}
