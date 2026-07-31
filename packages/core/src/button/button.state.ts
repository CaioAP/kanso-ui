import type { ButtonPressEvent, ButtonState, ButtonStateInit } from './button.types';

/**
 * There is no reducer below this. Button has no transitions of its own — every
 * field is a prop — so adapters call this on every render and the result is
 * always current. `docs/03` §6 decision 1.
 */
export function initialButtonState<E extends ButtonPressEvent = ButtonPressEvent>(
  init: ButtonStateInit<E> = {},
): ButtonState<E> {
  return {
    variant: init.variant ?? 'solid',
    size: init.size ?? 'md',
    disabled: init.disabled ?? false,
    loading: init.loading ?? false,
    // Without an explicit type, a button inside a <form> defaults to "submit".
    type: init.type ?? 'button',
    onClick: init.onClick,
  };
}
