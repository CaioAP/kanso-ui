import { Menu } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Menu preview: the live component plus its knobs.
 *
 * Deliberately a mirror of MenuPlayground.vue. Toggling the framework tab
 * should change nothing a visitor can see — that is the demonstration.
 */
export function MenuPlaygroundReact() {
  const [loop, setLoop] = useState(true);
  const [typeahead, setTypeahead] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Menu.Root loop={loop} typeahead={typeahead} onSelect={setChosen}>
        <Menu.Trigger>Actions</Menu.Trigger>

        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item value="archive">Archive</Menu.Item>
            <Menu.Item value="duplicate">Duplicate</Menu.Item>
            <Menu.Item value="share" disabled>
              Share (unavailable)
            </Menu.Item>
            <Menu.Separator />
            <Menu.Group>
              <Menu.GroupLabel>Settings</Menu.GroupLabel>
              <Menu.Item value="rename">Rename</Menu.Item>
              <Menu.Item value="permissions">Permissions</Menu.Item>
            </Menu.Group>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>

      <p className="preview-note" data-chosen>
        {chosen === null ? 'Nothing chosen yet.' : `Chose: ${chosen}`}
      </p>

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-loop`}>
          <input
            id={`${knobId}-loop`}
            type="checkbox"
            checked={loop}
            onChange={(event) => setLoop(event.target.checked)}
          />
          loop
        </label>

        <label htmlFor={`${knobId}-typeahead`}>
          <input
            id={`${knobId}-typeahead`}
            type="checkbox"
            checked={typeahead}
            onChange={(event) => setTypeahead(event.target.checked)}
          />
          typeahead
        </label>
      </fieldset>
    </div>
  );
}
