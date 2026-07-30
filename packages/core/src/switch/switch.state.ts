import type { SwitchEvent, SwitchIds, SwitchState, SwitchStateInit } from './switch.types';

/**
 * Derive every id from the one the framework supplied.
 *
 * Pure string concatenation, deliberately. Core must never generate an id — a
 * counter or `Math.random()` produces a different value on the server than on the
 * client, and React/Vue report that as a hydration mismatch. See CLAUDE.md rule 3.
 */
export function switchIds(id: string): SwitchIds {
  return {
    root: `kanso-switch-${id}`,
    control: `kanso-switch-${id}-control`,
    label: `kanso-switch-${id}-label`,
    hiddenInput: `kanso-switch-${id}-input`,
  };
}

export function initialSwitchState(init: SwitchStateInit): SwitchState {
  return {
    checked: init.checked ?? false,
    disabled: init.disabled ?? false,
    readOnly: init.readOnly ?? false,
    required: init.required ?? false,
    name: init.name,
    // "on" is what a native checkbox submits when no value attribute is given.
    value: init.value ?? 'on',
    hasLabel: init.hasLabel ?? false,
    ids: switchIds(init.id),
  };
}

/**
 * The whole of Switch's behaviour. Pure: same state + event, same result, no
 * side effects, no DOM.
 *
 * Returns the *same object reference* when nothing changed, so adapters that
 * compare by identity do not re-render for a no-op.
 */
export function switchReducer(state: SwitchState, event: SwitchEvent): SwitchState {
  switch (event.type) {
    case 'TOGGLE':
      // Guards live here and only here: this is the user-driven path.
      if (state.disabled || state.readOnly) return state;
      return { ...state, checked: !state.checked };

    case 'SET_CHECKED':
      // No disabled/readOnly guard — a controlled consumer owns the value and
      // must be able to set a disabled switch. See docs/01 §8.
      return state.checked === event.value ? state : { ...state, checked: event.value };

    default:
      return state;
  }
}
