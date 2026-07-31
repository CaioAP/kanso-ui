import type { Orientation, TabsActivationMode } from '@caioalfonso/kanso-core';
import { Tabs } from '@caioalfonso/kanso-react';
import { useId, useState } from 'react';

/**
 * The React half of the Tabs preview: the live component plus its knobs.
 *
 * Deliberately a mirror of TabsPlayground.vue. Toggling the framework tab should
 * change nothing a visitor can see — that is the demonstration.
 */
export function TabsPlaygroundReact() {
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [activationMode, setActivationMode] = useState<TabsActivationMode>('automatic');
  const [loop, setLoop] = useState(true);
  const knobId = useId();

  return (
    <div className="preview-stage">
      <Tabs.Root
        defaultValue="account"
        orientation={orientation}
        activationMode={activationMode}
        loop={loop}
      >
        <Tabs.List aria-label="Settings">
          <Tabs.Trigger value="account">Account</Tabs.Trigger>
          <Tabs.Trigger value="password">Password</Tabs.Trigger>
          <Tabs.Trigger value="sessions">Sessions</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="account">Change your display name.</Tabs.Content>
        <Tabs.Content value="password">Pick something you have not used before.</Tabs.Content>
        <Tabs.Content value="sessions">Sign out everywhere else.</Tabs.Content>
      </Tabs.Root>

      <fieldset className="preview-knobs">
        <legend>Props</legend>

        <label htmlFor={`${knobId}-vertical`}>
          <input
            id={`${knobId}-vertical`}
            type="checkbox"
            checked={orientation === 'vertical'}
            onChange={(event) => setOrientation(event.target.checked ? 'vertical' : 'horizontal')}
          />
          vertical
        </label>

        <label htmlFor={`${knobId}-manual`}>
          <input
            id={`${knobId}-manual`}
            type="checkbox"
            checked={activationMode === 'manual'}
            onChange={(event) => setActivationMode(event.target.checked ? 'manual' : 'automatic')}
          />
          manual
        </label>

        <label htmlFor={`${knobId}-loop`}>
          <input
            id={`${knobId}-loop`}
            type="checkbox"
            checked={loop}
            onChange={(event) => setLoop(event.target.checked)}
          />
          loop
        </label>
      </fieldset>
    </div>
  );
}
