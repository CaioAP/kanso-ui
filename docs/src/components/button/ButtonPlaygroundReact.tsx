import { Button } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Button preview: the live component plus its knobs.
 *
 * Deliberately a mirror of ButtonPlayground.vue. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 *
 * The press counter is the point of the preview: turn `loading` on and it stops
 * moving, while the button stays focusable and keeps its name.
 */
export function ButtonPlaygroundReact() {
  const [variant, setVariant] = useState<'solid' | 'outline' | 'ghost'>('solid');
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [presses, setPresses] = useState(0);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Button
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled}
        onClick={() => setPresses((count) => count + 1)}
      >
        Save changes
      </Button>

      <p className="preview-note" data-presses>
        Presses: {presses}
      </p>

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-variant`}>
          variant
          <select
            id={`${knobId}-variant`}
            value={variant}
            onChange={(event) => setVariant(event.target.value as typeof variant)}
          >
            <option value="solid">solid</option>
            <option value="outline">outline</option>
            <option value="ghost">ghost</option>
          </select>
        </label>

        <label htmlFor={`${knobId}-size`}>
          size
          <select
            id={`${knobId}-size`}
            value={size}
            onChange={(event) => setSize(event.target.value as typeof size)}
          >
            <option value="sm">sm</option>
            <option value="md">md</option>
            <option value="lg">lg</option>
          </select>
        </label>

        <label htmlFor={`${knobId}-loading`}>
          <input
            id={`${knobId}-loading`}
            type="checkbox"
            checked={loading}
            onChange={(event) => setLoading(event.target.checked)}
          />
          loading
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
