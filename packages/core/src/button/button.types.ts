/**
 * Button — the thinnest core in the library, and deliberately so.
 *
 * No event union, no reducer, no `send`. Every input is a prop the consumer
 * owns, so there is nothing for a state machine to hold, and inventing one to
 * match the shape of the other components would claim behaviour that is not
 * there. `docs/03` §6 decision 1.
 */

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

/**
 * The parts of an event this module actually touches.
 *
 * Structural on purpose: a React synthetic event satisfies it, a native DOM
 * event satisfies it, and core imports neither. `CLAUDE.md` rule 1 is not
 * negotiable even for two method names.
 */
export interface ButtonPressEvent {
  preventDefault: () => void;
  stopPropagation: () => void;
}

/**
 * The event type is a parameter so that an adapter can narrow it to its own.
 *
 * React types a button's `onClick` as taking a full `MouseEvent`, and a
 * function taking `MouseEvent` is *not* assignable to one taking the two
 * methods above — that is `strictFunctionTypes` working correctly, not a
 * nuisance. The parameter lets the React adapter say `E = MouseEvent<…>` and
 * hand its consumer's handler straight through, with no cast anywhere. The
 * default keeps the plain case plain.
 */
export interface ButtonState<E extends ButtonPressEvent = ButtonPressEvent> {
  variant: ButtonVariant;
  size: ButtonSize;
  /** Native. Removes the button from the tab order — not what `loading` wants. */
  disabled: boolean;
  /**
   * Working, not unavailable. Sets `aria-busy`, keeps the button focusable, and
   * blocks activation through the composed handler below.
   */
  loading: boolean;
  /** Defaults to `'button'`, so a button in a form never submits by accident. */
  type: ButtonType;
  /**
   * The consumer's own click handler, composed rather than replaced.
   *
   * It has to come *in* to core because every adapter renders
   * `{...consumerAttributes} {...api.props}` so that core's props win — which
   * means a core-supplied `onClick` would silently delete the consumer's. A
   * button whose handler never fires renders perfectly and passes an axe scan.
   * `docs/03` §6 decision 2.
   */
  onClick?: (event: E) => void;
}

/** What an adapter passes in to build the state. Everything has a default. */
export interface ButtonStateInit<E extends ButtonPressEvent = ButtonPressEvent> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  type?: ButtonType;
  onClick?: (event: E) => void;
}
