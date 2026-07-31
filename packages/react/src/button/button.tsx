import {
  type ButtonSize,
  type ButtonType,
  type ButtonVariant,
  connectButton,
  initialButtonState,
} from '@caioalfonso/kanso-core';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { normalizeProps } from '../normalize-props';

type ButtonAttributes = Omit<ComponentPropsWithRef<'button'>, 'type'>;

export interface ButtonProps extends ButtonAttributes {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Native. Removes the button from the tab order — for `loading`, use `loading`. */
  disabled?: boolean;
  /**
   * Working, not unavailable. The button stays focusable and announces
   * `aria-busy`; activation is blocked, including form submission.
   */
  loading?: boolean;
  /** Defaults to `'button'`, so a button in a form never submits by accident. */
  type?: ButtonType;
  children?: ReactNode;
}

/**
 * Presentational, with one piece of behaviour: while `loading`, a press does
 * nothing.
 *
 * The consumer's `onClick` is handed to core rather than left in the spread.
 * Core's props are applied last so that they win, which would otherwise delete
 * the handler — a button that renders perfectly, scans clean, and does nothing.
 * `docs/03` §6 decision 2.
 */
export function Button({
  variant,
  size,
  disabled,
  loading,
  type,
  onClick,
  children,
  ...attributes
}: ButtonProps) {
  const state = initialButtonState({ variant, size, disabled, loading, type, onClick });
  const api = connectButton(state, normalizeProps);

  return (
    <button {...attributes} {...api.rootProps}>
      {/*
        The label is a real element so the stylesheet can fade it with
        `opacity` while the spinner runs. `visibility: hidden` and
        `display: none` would both take the button's accessible name with them.
      */}
      <span {...api.labelProps}>{children}</span>
    </button>
  );
}
