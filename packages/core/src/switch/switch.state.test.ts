import { describe, expect, it } from 'vitest';
import { initialSwitchState, switchIds, switchReducer } from './switch.state';
import type { SwitchState, SwitchStateInit } from './switch.types';

const state = (overrides: Partial<SwitchStateInit> = {}): SwitchState =>
  initialSwitchState({ id: 'x', ...overrides });

describe('switchIds', () => {
  it('is a pure function of the supplied id', () => {
    // The property that matters for SSR: same input, same output, every time and
    // in every process. Anything stateful here shows up as a hydration mismatch.
    expect(switchIds('r1')).toEqual(switchIds('r1'));
  });

  it('gives distinct ids to distinct instances', () => {
    const a = switchIds('a');
    const b = switchIds('b');
    expect(a.control).not.toBe(b.control);
    expect(a.label).not.toBe(b.label);
  });

  it('gives every part within one instance a distinct id', () => {
    const ids = switchIds('same');
    const values = Object.values(ids);
    // Notably the hidden input must not collide with the control, or the label's
    // `for` would resolve to the wrong element.
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('initialSwitchState', () => {
  it('defaults to an unchecked, enabled, unnamed switch', () => {
    expect(state()).toMatchObject({
      checked: false,
      disabled: false,
      readOnly: false,
      required: false,
      name: undefined,
      hasLabel: false,
    });
  });

  it('defaults value to "on", matching a native checkbox', () => {
    expect(state().value).toBe('on');
    expect(state({ value: 'yes' }).value).toBe('yes');
  });

  it('carries every init field through', () => {
    expect(
      state({
        checked: true,
        disabled: true,
        readOnly: true,
        required: true,
        name: 'notify',
        hasLabel: true,
      }),
    ).toMatchObject({
      checked: true,
      disabled: true,
      readOnly: true,
      required: true,
      name: 'notify',
      hasLabel: true,
    });
  });
});

describe('switchReducer — TOGGLE', () => {
  it('flips unchecked to checked', () => {
    expect(switchReducer(state(), { type: 'TOGGLE' }).checked).toBe(true);
  });

  it('flips checked to unchecked', () => {
    expect(switchReducer(state({ checked: true }), { type: 'TOGGLE' }).checked).toBe(false);
  });

  it('is refused when disabled', () => {
    const before = state({ disabled: true });
    expect(switchReducer(before, { type: 'TOGGLE' })).toBe(before);
  });

  it('is refused when readOnly', () => {
    const before = state({ readOnly: true });
    expect(switchReducer(before, { type: 'TOGGLE' })).toBe(before);
  });

  it('leaves every other field untouched', () => {
    const before = state({ name: 'notify', required: true, hasLabel: true });
    const after = switchReducer(before, { type: 'TOGGLE' });
    expect({ ...after, checked: before.checked }).toEqual(before);
  });
});

describe('switchReducer — SET_CHECKED', () => {
  it('sets the value', () => {
    expect(switchReducer(state(), { type: 'SET_CHECKED', value: true }).checked).toBe(true);
    expect(
      switchReducer(state({ checked: true }), { type: 'SET_CHECKED', value: false }).checked,
    ).toBe(false);
  });

  it('returns the same reference when the value is unchanged', () => {
    // Adapters compare by identity to skip a render; a fresh object every time
    // would make a controlled Switch re-render on every parent render.
    const before = state();
    expect(switchReducer(before, { type: 'SET_CHECKED', value: false })).toBe(before);
  });

  it('still applies when disabled or readOnly', () => {
    // Deliberate asymmetry with TOGGLE: the guards describe what a *user* may do.
    // A controlled consumer owns the value and must be able to write it.
    expect(
      switchReducer(state({ disabled: true }), { type: 'SET_CHECKED', value: true }).checked,
    ).toBe(true);
    expect(
      switchReducer(state({ readOnly: true }), { type: 'SET_CHECKED', value: true }).checked,
    ).toBe(true);
  });
});

describe('switchReducer — purity', () => {
  it('never mutates the state it was given', () => {
    const before = state();
    const snapshot = structuredClone(before);
    switchReducer(before, { type: 'TOGGLE' });
    switchReducer(before, { type: 'SET_CHECKED', value: true });
    expect(before).toEqual(snapshot);
  });

  it('ignores an unknown event rather than throwing', () => {
    const before = state();
    // Reachable from untyped JS consumers, so it must degrade rather than crash.
    expect(switchReducer(before, { type: 'NOPE' } as never)).toBe(before);
  });
});
