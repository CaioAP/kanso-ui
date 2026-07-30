import { Switch } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Switch preview: the live component plus its knobs.
 *
 * Deliberately a mirror of SwitchPlayground.vue. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 */
export function SwitchPlaygroundReact() {
  const [checked, setChecked] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Switch
        label="Wi-Fi"
        checked={checked}
        onCheckedChange={setChecked}
        disabled={disabled}
        readOnly={readOnly}
      />

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-disabled`}>
          <input
            id={`${knobId}-disabled`}
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />
          disabled
        </label>

        <label htmlFor={`${knobId}-readonly`}>
          <input
            id={`${knobId}-readonly`}
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />
          readOnly
        </label>
      </fieldset>
    </div>
  );
}
