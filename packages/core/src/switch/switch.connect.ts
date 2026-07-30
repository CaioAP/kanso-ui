import { ariaAttr, dataAttr } from '../dom/attrs';
import type { NormalizeProps, PropTypes } from '../types';
import type { SwitchSend, SwitchState } from './switch.types';

export interface SwitchApi<T extends PropTypes> {
  checked: boolean;
  disabled: boolean;
  setChecked: (value: boolean) => void;
  rootProps: T['element'];
  controlProps: T['button'];
  thumbProps: T['element'];
  labelProps: T['label'];
  /** Render only when `name` is set — otherwise it submits nothing. */
  hiddenInputProps: T['input'];
}

/**
 * Turn state into prop bags. Pure, and called on every render.
 *
 * Note what is absent: no `keydown` handler. A native `<button>` already fires
 * `click` for both Space and Enter. Reaching for `role="switch"` on a `<div>` and
 * hand-rolling the keyboard is the classic mistake — use the native element and
 * inherit its behaviour. Same instinct applies to focus: `:focus-visible` in CSS
 * beats any state we could track, because a `focus` event cannot tell a keyboard
 * from a mouse.
 */
export function connectSwitch<T extends PropTypes>(
  state: SwitchState,
  send: SwitchSend,
  normalize: NormalizeProps<T>,
): SwitchApi<T> {
  const { checked, disabled, readOnly, required, name, value, hasLabel, ids } = state;
  const dataState = checked ? 'checked' : 'unchecked';

  return {
    checked,
    disabled,
    setChecked: (next: boolean) => send({ type: 'SET_CHECKED', value: next }),

    rootProps: normalize.element({
      // Root-only marker. The stylesheet scopes itself with
      // `[data-kanso] [data-part=…]`, so this must be on the root and nowhere else.
      'data-kanso': '',
      'data-scope': 'switch',
      'data-part': 'root',
      'data-state': dataState,
      'data-disabled': dataAttr(disabled),
      'data-readonly': dataAttr(readOnly),
      id: ids.root,
    }),

    controlProps: normalize.button({
      'data-part': 'control',
      'data-state': dataState,
      'data-disabled': dataAttr(disabled),
      'data-readonly': dataAttr(readOnly),
      id: ids.control,
      // Without an explicit type, a button inside a <form> defaults to "submit".
      type: 'button',
      role: 'switch',
      'aria-checked': checked,
      // Conditional: an idref pointing at an element that was never rendered
      // leaves the control with no accessible name at all. See docs/01 §8.
      'aria-labelledby': hasLabel ? ids.label : undefined,
      'aria-readonly': ariaAttr(readOnly),
      disabled,
      onClick: () => send({ type: 'TOGGLE' }),
    }),

    thumbProps: normalize.element({
      'data-part': 'thumb',
      'data-state': dataState,
      'data-disabled': dataAttr(disabled),
    }),

    labelProps: normalize.label({
      'data-part': 'label',
      id: ids.label,
      // Points at the button so clicking the text focuses and toggles it.
      for: ids.control,
      'data-disabled': dataAttr(disabled),
    }),

    hiddenInputProps: normalize.input({
      'data-part': 'hidden-input',
      type: 'checkbox',
      id: ids.hiddenInput,
      name,
      value,
      checked,
      required,
      disabled,
      // The button carries role="switch". An input that is focusable or announced
      // would give one switch two identities: two tab stops, two announcements.
      'aria-hidden': true,
      tabIndex: -1,
      // React warns on a `checked` input with no `onChange`, so it needs one.
      //
      // It must NOT be `readOnly` instead: a checkbox carrying `readonly` is
      // barred from constraint validation (`willValidate === false` in Chrome),
      // which silently disables `required` — the exact failure the clipping
      // rule in base.css exists to prevent, arriving by a different route.
      // Measured, not assumed; see the Playwright form tests.
      //
      // The handler is a no-op because the input is inert by construction:
      // aria-hidden, out of the tab order, and pointer-events: none. Nothing
      // can reach it to fire this.
      onChange: () => {},
    }),
  };
}
