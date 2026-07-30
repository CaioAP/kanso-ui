import {
  connectSwitch,
  initialSwitchState,
  type SwitchEvent,
  switchReducer,
} from '@caioalfonso/kanso-core';
import { type ComponentPropsWithRef, type ReactNode, useId, useState } from 'react';
import { normalizeProps } from '../normalize-props';

type RootAttributes = Omit<
  ComponentPropsWithRef<'span'>,
  'children' | 'defaultChecked' | 'onChange'
>;

export interface SwitchProps extends RootAttributes {
  /** Controlled value. Present ⇒ the consumer owns state. */
  checked?: boolean;
  /** Uncontrolled initial value. */
  defaultChecked?: boolean;
  /** Fired in both modes, after the reducer has accepted the change. */
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Focusable, but not toggleable. */
  readOnly?: boolean;
  required?: boolean;
  /** Set to make the switch submit with an enclosing form. */
  name?: string;
  /** Submitted value when checked. Defaults to "on". */
  value?: string;
  /** Visible label. Omit only if you pass `aria-label`. */
  label?: ReactNode;
}

export function Switch({
  checked: controlledChecked,
  defaultChecked,
  onCheckedChange,
  disabled,
  readOnly,
  required,
  name,
  value,
  label,
  id: providedId,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rootAttributes
}: SwitchProps) {
  // React owns id generation. A counter in core would differ between the server
  // render and the client render — see CLAUDE.md rule 3.
  const reactId = useId();
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked ?? false);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : uncontrolledChecked;
  const hasLabel = label !== undefined && label !== null;

  // Derived on every render rather than held in a reducer. Every field except
  // `checked` is a prop, and a prop stored in state goes stale the moment the
  // consumer changes it. `initialSwitchState` is pure, so calling it per render
  // is free and always current.
  const state = initialSwitchState({
    id: providedId ?? reactId,
    checked,
    disabled,
    readOnly,
    required,
    name,
    value,
    hasLabel,
  });

  // Controlled-mode mirroring lives here, not in core: core holds state and
  // reports transitions, adapters decide who owns the value. See docs/01 §9.
  const send = (event: SwitchEvent) => {
    const next = switchReducer(state, event);
    // Reference equality means the reducer refused it — a disabled toggle, or a
    // set to the value already held. Nothing to report.
    if (next === state) return;
    if (!isControlled) setUncontrolledChecked(next.checked);
    onCheckedChange?.(next.checked);
  };

  const api = connectSwitch(state, send, normalizeProps);

  return (
    <span {...rootAttributes} {...api.rootProps}>
      <button
        {...api.controlProps}
        // The control carries role="switch", so its accessible name belongs here
        // and not on the root. If a visible label is also rendered, ARIA's own
        // precedence applies and aria-labelledby wins.
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? api.controlProps['aria-labelledby']}
      >
        <span {...api.thumbProps} />
      </button>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: htmlFor arrives in the
          spread, pointing at the control's id — the rule cannot see through it.
          <button> is a labelable element, so the association is real: the
          "toggles when the label is clicked" test covers it. */}
      {hasLabel ? <label {...api.labelProps}>{label}</label> : null}
      {name ? <input {...api.hiddenInputProps} /> : null}
    </span>
  );
}
