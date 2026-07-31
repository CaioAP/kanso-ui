import { Field, Input } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Field preview: the live component plus its knobs.
 *
 * Deliberately a mirror of FieldPlayground.vue. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 */
export function FieldPlaygroundReact() {
  const [invalid, setInvalid] = useState(false);
  const [required, setRequired] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Field
        className="preview-field"
        label="Email"
        description="We only use this to sign you in."
        errorText="Enter an email address."
        invalid={invalid}
        required={required}
        disabled={disabled}
      >
        <Input type="email" name="email" placeholder="you@example.com" />
      </Field>

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-invalid`}>
          <input
            id={`${knobId}-invalid`}
            type="checkbox"
            checked={invalid}
            onChange={(event) => setInvalid(event.target.checked)}
          />
          invalid
        </label>

        <label htmlFor={`${knobId}-required`}>
          <input
            id={`${knobId}-required`}
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          required
        </label>

        <label htmlFor={`${knobId}-disabled`}>
          <input
            id={`${knobId}-disabled`}
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />
          disabled
        </label>
      </fieldset>
    </div>
  );
}
