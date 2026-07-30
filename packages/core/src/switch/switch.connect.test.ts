import { describe, expect, it, vi } from 'vitest';
import { createNormalizer } from '../normalize';
import type { Dict, PropTypes } from '../types';
import { connectSwitch } from './switch.connect';
import { initialSwitchState } from './switch.state';
import type { SwitchEvent, SwitchStateInit } from './switch.types';

/** A pass-through normalizer, so these tests see exactly what core emits. */
interface IdentityPropTypes extends PropTypes {
  element: Dict;
  button: Dict;
  input: Dict;
  label: Dict;
}
const identity = createNormalizer<IdentityPropTypes>((props) => props);

const api = (init: Partial<SwitchStateInit> = {}, send: (e: SwitchEvent) => void = () => {}) =>
  connectSwitch(initialSwitchState({ id: 'x', ...init }), send, identity);

describe('connectSwitch — data attributes', () => {
  it('marks the root and only the root with data-kanso', () => {
    // The stylesheet scopes itself as `[data-kanso] [data-part=…]`. A stray
    // data-kanso on a child would make every descendant selector match twice.
    const a = api();
    expect(a.rootProps['data-kanso']).toBe('');
    expect(a.controlProps['data-kanso']).toBeUndefined();
    expect(a.thumbProps['data-kanso']).toBeUndefined();
    expect(a.labelProps['data-kanso']).toBeUndefined();
    expect(a.hiddenInputProps['data-kanso']).toBeUndefined();
  });

  it('names every part', () => {
    const a = api();
    expect(a.rootProps['data-part']).toBe('root');
    expect(a.controlProps['data-part']).toBe('control');
    expect(a.thumbProps['data-part']).toBe('thumb');
    expect(a.labelProps['data-part']).toBe('label');
    expect(a.hiddenInputProps['data-part']).toBe('hidden-input');
  });

  it('reflects checked state on root, control and thumb', () => {
    const off = api();
    expect(off.rootProps['data-state']).toBe('unchecked');
    expect(off.controlProps['data-state']).toBe('unchecked');
    expect(off.thumbProps['data-state']).toBe('unchecked');

    const on = api({ checked: true });
    expect(on.rootProps['data-state']).toBe('checked');
    expect(on.controlProps['data-state']).toBe('checked');
    expect(on.thumbProps['data-state']).toBe('checked');
  });

  it('omits data-disabled entirely when enabled', () => {
    // An empty string is a *present* attribute, so `[data-disabled]` would match.
    // Absence, not falsiness, is what makes the selector correct.
    const a = api();
    expect(a.rootProps).not.toHaveProperty('data-disabled', '');
    expect(a.rootProps['data-disabled']).toBeUndefined();
    expect(api({ disabled: true }).rootProps['data-disabled']).toBe('');
  });

  it('omits data-readonly entirely when not read-only', () => {
    expect(api().rootProps['data-readonly']).toBeUndefined();
    expect(api({ readOnly: true }).rootProps['data-readonly']).toBe('');
  });
});

describe('connectSwitch — ARIA', () => {
  it('puts role=switch and aria-checked on the control, not the root', () => {
    const a = api({ checked: true });
    expect(a.controlProps.role).toBe('switch');
    expect(a.controlProps['aria-checked']).toBe(true);
    expect(a.rootProps.role).toBeUndefined();
  });

  it('links aria-labelledby to the label when one is rendered', () => {
    const a = api({ hasLabel: true });
    expect(a.controlProps['aria-labelledby']).toBe(a.labelProps.id);
  });

  it('omits aria-labelledby when no label is rendered', () => {
    // A dangling idref leaves the control with no accessible name at all —
    // strictly worse than omitting the attribute. See docs/01 §8.
    expect(api({ hasLabel: false }).controlProps['aria-labelledby']).toBeUndefined();
  });

  it('sets aria-readonly only when read-only', () => {
    expect(api().controlProps['aria-readonly']).toBeUndefined();
    expect(api({ readOnly: true }).controlProps['aria-readonly']).toBe(true);
  });

  it('uses the native disabled attribute rather than aria-disabled', () => {
    const a = api({ disabled: true });
    expect(a.controlProps.disabled).toBe(true);
    expect(a.controlProps['aria-disabled']).toBeUndefined();
  });

  it('points the label at the control', () => {
    const a = api({ hasLabel: true });
    expect(a.labelProps.for).toBe(a.controlProps.id);
  });
});

describe('connectSwitch — the control element', () => {
  it('sets type=button so it never submits its enclosing form', () => {
    expect(api().controlProps.type).toBe('button');
  });

  it('does not attach a keydown handler', () => {
    // Space and Enter come free from a native <button>. A handler here would be
    // a second code path to keep correct, and a chance to double-toggle.
    expect(api().controlProps.onKeyDown).toBeUndefined();
    expect(api().controlProps.onKeyUp).toBeUndefined();
  });

  it('does not track focus in state', () => {
    // A focus event fires on mouse press too, so state cannot tell keyboard from
    // pointer. CSS :focus-visible can. See docs/02 §4.
    expect(api().controlProps.onFocus).toBeUndefined();
    expect(api().controlProps.onBlur).toBeUndefined();
  });

  it('sends TOGGLE on click', () => {
    const send = vi.fn();
    api({}, send).controlProps.onClick();
    expect(send).toHaveBeenCalledWith({ type: 'TOGGLE' });
  });

  it('sends TOGGLE on click even when disabled — the reducer is the guard', () => {
    // The DOM already blocks clicks on a disabled button; keeping the guard in
    // one place (the reducer) means an adapter cannot accidentally lose it.
    const send = vi.fn();
    api({ disabled: true }, send).controlProps.onClick();
    expect(send).toHaveBeenCalledWith({ type: 'TOGGLE' });
  });
});

describe('connectSwitch — the hidden input', () => {
  it('is a checkbox carrying name, value and checked', () => {
    const a = api({ name: 'notify', value: 'yes', checked: true });
    expect(a.hiddenInputProps).toMatchObject({
      type: 'checkbox',
      name: 'notify',
      value: 'yes',
      checked: true,
    });
  });

  it('is hidden from assistive tech and unreachable by keyboard', () => {
    // role="switch" lives on the button. A second announced or focusable node
    // would give one switch two identities.
    const a = api({ name: 'notify' });
    expect(a.hiddenInputProps['aria-hidden']).toBe(true);
    expect(a.hiddenInputProps.tabIndex).toBe(-1);
  });

  it('is readOnly, so React does not warn about a checked input', () => {
    expect(api({ name: 'notify' }).hiddenInputProps.readOnly).toBe(true);
    expect(api({ name: 'notify' }).hiddenInputProps.onChange).toBeUndefined();
  });

  it('carries required and disabled through for constraint validation', () => {
    const a = api({ name: 'notify', required: true, disabled: true });
    expect(a.hiddenInputProps.required).toBe(true);
    expect(a.hiddenInputProps.disabled).toBe(true);
  });

  it('does not reuse the control id', () => {
    const a = api({ name: 'notify' });
    expect(a.hiddenInputProps.id).not.toBe(a.controlProps.id);
  });
});

describe('connectSwitch — the api surface', () => {
  it('exposes checked and disabled for consumers', () => {
    const a = api({ checked: true, disabled: true });
    expect(a.checked).toBe(true);
    expect(a.disabled).toBe(true);
  });

  it('setChecked sends SET_CHECKED with the value', () => {
    const send = vi.fn();
    api({}, send).setChecked(true);
    expect(send).toHaveBeenCalledWith({ type: 'SET_CHECKED', value: true });
  });
});
